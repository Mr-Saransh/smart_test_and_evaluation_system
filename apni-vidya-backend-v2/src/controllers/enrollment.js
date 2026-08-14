const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

// Generate a random, non-derivable temporary password.
// Avoids ambiguous characters (0/O, 1/l/I) so it's easy to read aloud / type.
function generateTempPassword(length = 8) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

async function submitRequest(req, res, next) {
  try {
    const { slug } = req.params;
    const { student_name, student_phone, parent_name, parent_phone, batch_id } = req.body;

    if (!student_name || !student_phone) {
      return res.status(400).json({ error: 'student_name and student_phone are required' });
    }

    const institute = await db.query(
      'SELECT id FROM institutes WHERE enrollment_slug = $1 AND is_active = true',
      [slug]
    );
    if (institute.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const instituteId = institute.rows[0].id;

    // Check for duplicate pending request
    const existing = await db.query(
      `SELECT id FROM enrollment_requests 
       WHERE institute_id = $1 AND student_phone = $2 AND status = 'pending'`,
      [instituteId, student_phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An enrollment request is already pending for this phone number' });
    }

    const result = await db.query(
      `INSERT INTO enrollment_requests (institute_id, batch_id, student_name, student_phone, parent_name, parent_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [instituteId, batch_id || null, student_name, student_phone, parent_name || null, parent_phone || null]
    );

    res.status(201).json({ message: 'Enrollment request submitted', request: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    const { institute_id } = req.params;
    // No status query param (or status=all) returns every request so the
    // frontend can show pending/approved/rejected tabs, grouped by batch,
    // without needing a separate request per tab.
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;

    // Verify the requester owns/teaches at this institute
    const access = await verifyInstituteAccess(req.user, institute_id);
    if (!access) {
      return res.status(403).json({ error: 'No access to this institute' });
    }

    const result = await db.query(
      `SELECT er.*, b.name as batch_name 
       FROM enrollment_requests er
       LEFT JOIN batches b ON er.batch_id = b.id
       WHERE er.institute_id = $1 AND ($2::text IS NULL OR er.status = $2)
       ORDER BY b.name NULLS LAST, er.created_at DESC`,
      [institute_id, status]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { request_id } = req.params;

    // Fetch the request
    const reqResult = await client.query(
      'SELECT * FROM enrollment_requests WHERE id = $1 AND status = $2',
      [request_id, 'pending']
    );
    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }

    const enrollment = reqResult.rows[0];

    // Verify access
    const access = await verifyInstituteAccessWithClient(client, req.user, enrollment.institute_id);
    if (!access) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No access to this institute' });
    }

    // Generate a random one-time password. It is NOT derivable from the
    // student's name or phone, is returned exactly once for the institute
    // to relay, and must be changed on first login (must_reset_password).
    const defaultPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    // Create student user account
    const studentUser = await client.query(
      `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password)
       VALUES ($1, $2, 'student', $3, true)
       ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id, phone, role, full_name`,
      [enrollment.student_phone, password_hash, enrollment.student_name]
    );

    // Create parent user account if parent phone provided
    let parentUserId = null;
    let parentPassword = null;
    if (enrollment.parent_phone) {
      parentPassword = generateTempPassword();
      const parentHash = await bcrypt.hash(parentPassword, salt);

      const parentUser = await client.query(
        `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, 'parent', $3, true)
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [enrollment.parent_phone, parentHash, enrollment.parent_name || `Parent of ${enrollment.student_name}`]
      );
      parentUserId = parentUser.rows[0].id;
    }

    // Create student record
    await client.query(
      `INSERT INTO students (user_id, institute_id, batch_id, parent_user_id, enrollment_request_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [studentUser.rows[0].id, enrollment.institute_id, enrollment.batch_id, parentUserId, enrollment.id]
    );

    // Update enrollment request status
    await client.query(
      `UPDATE enrollment_requests SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [req.user.id, request_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Enrollment approved',
      student: studentUser.rows[0],
      credentials: {
        student: { phone: enrollment.student_phone, temp_password: defaultPassword },
        ...(parentUserId ? { parent: { phone: enrollment.parent_phone, temp_password: parentPassword } } : {}),
      },
      note: 'Share these one-time passwords with the student/parent. They will be required to set a new password on first login. This is the only time the passwords are shown.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function rejectRequest(req, res, next) {
  try {
    const { request_id } = req.params;

    const reqResult = await db.query(
      'SELECT * FROM enrollment_requests WHERE id = $1 AND status = $2',
      [request_id, 'pending']
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    const access = await verifyInstituteAccess(req.user, reqResult.rows[0].institute_id);
    if (!access) {
      return res.status(403).json({ error: 'No access to this institute' });
    }

    await db.query(
      `UPDATE enrollment_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [req.user.id, request_id]
    );

    res.json({ message: 'Enrollment request rejected' });
  } catch (err) {
    next(err);
  }
}

// Helper: check if user is admin or teacher at this institute
async function verifyInstituteAccess(user, instituteId) {
  if (user.role === 'institute_admin') {
    const result = await db.query(
      'SELECT id FROM institutes WHERE id = $1 AND admin_id = $2',
      [instituteId, user.id]
    );
    return result.rows.length > 0;
  }
  if (user.role === 'teacher') {
    const result = await db.query(
      'SELECT id FROM teachers WHERE user_id = $1 AND institute_id = $2',
      [user.id, instituteId]
    );
    return result.rows.length > 0;
  }
  return false;
}

async function verifyInstituteAccessWithClient(client, user, instituteId) {
  if (user.role === 'institute_admin') {
    const result = await client.query(
      'SELECT id FROM institutes WHERE id = $1 AND admin_id = $2',
      [instituteId, user.id]
    );
    return result.rows.length > 0;
  }
  if (user.role === 'teacher') {
    const result = await client.query(
      'SELECT id FROM teachers WHERE user_id = $1 AND institute_id = $2',
      [user.id, instituteId]
    );
    return result.rows.length > 0;
  }
  return false;
}

module.exports = { submitRequest, listRequests, approveRequest, rejectRequest };
