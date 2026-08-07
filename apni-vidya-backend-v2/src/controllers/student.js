const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');

// Generate a random temporary password.
function generateTempPassword(length = 8) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

// List all students for an institute with batch names.
async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT s.id, s.batch_id, s.roll_number, s.created_at,
              u.id AS user_id, u.full_name, u.phone, u.email, u.is_active,
              b.name AS batch_name,
              p.full_name AS parent_name, p.phone AS parent_phone
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN batches b ON s.batch_id = b.id
       LEFT JOIN users p ON s.parent_user_id = p.id
       WHERE s.institute_id = $1
       ORDER BY u.full_name`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Create a student directly (admin flow — auto-generates credentials).
async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { institute_id, full_name, phone, email, password, batch_id, roll_number, parent_name, parent_phone } = req.body;

    if (!institute_id || !full_name || !phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id, full_name, and phone are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const tempPassword = password || generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    // Create or update student user account.
    const studentUser = await client.query(
      `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
       VALUES ($1, $2, $3, 'student', $4, true)
       ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id, phone, email, role, full_name`,
      [phone, email || null, password_hash, full_name]
    );

    // Create parent account if provided.
    let parentUserId = null;
    let parentPassword = null;
    if (parent_phone) {
      parentPassword = generateTempPassword();
      const parentHash = await bcrypt.hash(parentPassword, salt);
      const parentUser = await client.query(
        `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, 'parent', $3, true)
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [parent_phone, parentHash, parent_name || `Parent of ${full_name}`]
      );
      parentUserId = parentUser.rows[0].id;
    }

    // Check if student record already exists.
    const existing = await client.query(
      'SELECT id FROM students WHERE user_id = $1 AND institute_id = $2',
      [studentUser.rows[0].id, institute_id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Student already exists in this institute' });
    }

    // Create student record.
    const studentResult = await client.query(
      `INSERT INTO students (user_id, institute_id, batch_id, parent_user_id, roll_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [studentUser.rows[0].id, institute_id, batch_id || null, parentUserId, roll_number || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      student: studentResult.rows[0],
      user: studentUser.rows[0],
      credentials: {
        student: { phone, temp_password: tempPassword },
        ...(parentUserId ? { parent: { phone: parent_phone, temp_password: parentPassword } } : {}),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Update student.
async function update(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { full_name, phone, email, password, batch_id, roll_number, parent_name, parent_phone } = req.body;

    const studentRow = await client.query(
      'SELECT s.user_id, s.institute_id, s.parent_user_id FROM students s WHERE s.id = $1',
      [id]
    );
    if (studentRow.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    if (!(await hasInstituteAccess(req.user, studentRow.rows[0].institute_id, client))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await client.query('BEGIN');
    const userId = studentRow.rows[0].user_id;

    // Update user details.
    const updates = [];
    const vals = [];
    let idx = 1;
    if (full_name) { updates.push(`full_name = $${idx++}`); vals.push(full_name); }
    if (phone) { updates.push(`phone = $${idx++}`); vals.push(phone); }
    if (email !== undefined) { updates.push(`email = $${idx++}`); vals.push(email || null); }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updates.push(`password_hash = $${idx++}`);
      vals.push(hash);
    }
    if (updates.length > 0) {
      vals.push(userId);
      await client.query(`UPDATE users SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx}`, vals);
    }

    // Update student record.
    await client.query(
      `UPDATE students SET batch_id = COALESCE($1, batch_id), roll_number = COALESCE($2, roll_number) WHERE id = $3`,
      [batch_id || null, roll_number || null, id]
    );

    // Update parent if provided.
    if (parent_phone && !studentRow.rows[0].parent_user_id) {
      const salt = await bcrypt.genSalt(10);
      const parentPassword = generateTempPassword();
      const parentHash = await bcrypt.hash(parentPassword, salt);
      const parentUser = await client.query(
        `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, 'parent', $3, true)
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [parent_phone, parentHash, parent_name || 'Parent']
      );
      await client.query('UPDATE students SET parent_user_id = $1 WHERE id = $2', [parentUser.rows[0].id, id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Delete student.
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const studentRow = await db.query('SELECT institute_id FROM students WHERE id = $1', [id]);
    if (studentRow.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    if (!(await hasInstituteAccess(req.user, studentRow.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ message: 'Student removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
