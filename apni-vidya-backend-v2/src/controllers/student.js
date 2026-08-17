const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { sendCredentialsEmail } = require('../services/email');

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
      `SELECT s.id, s.batch_id, s.roll_number, s.address, s.date_of_birth, s.created_at,
              u.id AS user_id, u.full_name, u.phone, u.email, u.is_active,
              u.profile_completed,
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

// Bulk admit students by email for a specific batch.
// Accepts: { institute_id, batch_id, emails: string[] }
// For each email: creates user + student record, sends credentials via email.
async function bulkAdmit(req, res, next) {
  const client = await db.getClient();
  try {
    const { institute_id, batch_id, emails } = req.body;

    if (!institute_id || !batch_id || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'institute_id, batch_id, and a non-empty emails array are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      client.release();
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Get institute name for the email
    const instResult = await client.query('SELECT name FROM institutes WHERE id = $1', [institute_id]);
    const instituteName = instResult.rows[0]?.name || 'Apni Vidya';

    // Get login URL from env or use default
    const loginUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login`
      : `${process.env.APP_URL || 'https://smart-test-and-evaluation-system.vercel.app'}/login`;

    const results = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const rawEmail of emails) {
      const email = (rawEmail || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email: rawEmail, status: 'failed', reason: 'Invalid email format' });
        failed++;
        continue;
      }

      try {
        await client.query('BEGIN');

        // Check if user with this email already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );

        if (existingUser.rows.length > 0) {
          // Check if already a student in this institute
          const existingStudent = await client.query(
            'SELECT id FROM students WHERE user_id = $1 AND institute_id = $2',
            [existingUser.rows[0].id, institute_id]
          );
          if (existingStudent.rows.length > 0) {
            await client.query('ROLLBACK');
            results.push({ email, status: 'skipped', reason: 'Already enrolled in this institute' });
            skipped++;
            continue;
          }

          // User exists but not enrolled here — create student record in this institute
          await client.query(
            `INSERT INTO students (user_id, institute_id, batch_id) VALUES ($1, $2, $3)`,
            [existingUser.rows[0].id, institute_id, batch_id]
          );
          await client.query('COMMIT');
          results.push({ email, status: 'skipped', reason: 'User exists, linked to this institute' });
          skipped++;
          continue;
        }

        // Generate temp password
        const tempPassword = generateTempPassword();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        // Create user — use email as a placeholder for phone (will be set during profile setup)
        // We generate a unique placeholder phone to satisfy the NOT NULL + UNIQUE constraint
        const placeholderPhone = `TMP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

        const userResult = await client.query(
          `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password, profile_completed)
           VALUES ($1, $2, $3, 'student', $4, true, false)
           RETURNING id`,
          [placeholderPhone, email, passwordHash, email.split('@')[0]]
        );

        // Create student record
        await client.query(
          `INSERT INTO students (user_id, institute_id, batch_id) VALUES ($1, $2, $3)`,
          [userResult.rows[0].id, institute_id, batch_id]
        );

        await client.query('COMMIT');

        // Send email (fire-and-forget — don't block on failures)
        sendCredentialsEmail({ to: email, password: tempPassword, instituteName, loginUrl })
          .catch(err => console.error(`[bulk-admit] Email to ${email} failed:`, err.message));

        results.push({ email, status: 'created', userId: userResult.rows[0].id });
        created++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[bulk-admit] Error enrolling ${email}:`, err.message);
        results.push({ email, status: 'failed', reason: err.message });
        failed++;
      }
    }

    client.release();

    res.status(201).json({
      summary: { total: emails.length, created, skipped, failed },
      results,
    });
  } catch (err) {
    client.release();
    next(err);
  }
}

// Student profile setup — called by students on first login after password change.
async function profileSetup(req, res, next) {
  const client = await db.getClient();
  try {
    const userId = req.user.id;
    const { full_name, phone, address, date_of_birth, parent_name, parent_phone } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ error: 'Full name and phone number are required' });
    }

    // Validate phone format
    if (!/^(\+?91|0)?[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }

    await client.query('BEGIN');

    // Update user record
    await client.query(
      `UPDATE users SET full_name = $1, phone = $2, profile_completed = true, updated_at = now() WHERE id = $3`,
      [full_name.trim(), phone.trim(), userId]
    );

    // Get student record
    const studentRow = await client.query(
      'SELECT id, institute_id FROM students WHERE user_id = $1',
      [userId]
    );

    if (studentRow.rows.length > 0) {
      const studentId = studentRow.rows[0].id;

      // Update student details
      await client.query(
        `UPDATE students SET address = $1, date_of_birth = $2 WHERE id = $3`,
        [address || null, date_of_birth || null, studentId]
      );

      // Create parent account if provided
      if (parent_phone && /^(\+?91|0)?[6-9]\d{9}$/.test(parent_phone.trim())) {
        const parentPassword = generateTempPassword();
        const salt = await bcrypt.genSalt(10);
        const parentHash = await bcrypt.hash(parentPassword, salt);

        const parentUser = await client.query(
          `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password, profile_completed)
           VALUES ($1, $2, 'parent', $3, true, true)
           ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [parent_phone.trim(), parentHash, parent_name || `Parent of ${full_name}`]
        );

        await client.query(
          'UPDATE students SET parent_user_id = $1 WHERE id = $2',
          [parentUser.rows[0].id, studentId]
        );
      }
    }

    await client.query('COMMIT');
    client.release();

    res.json({ message: 'Profile setup completed successfully', profile_completed: true });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    next(err);
  }
}

// Profile status for admin — batch-wise breakdown of student profile completion.
async function profileStatus(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const result = await db.query(
      `SELECT s.id, s.batch_id,
              u.id AS user_id, u.email, u.full_name, u.phone, u.profile_completed,
              b.name AS batch_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.institute_id = $1
       ORDER BY b.name, u.email`,
      [institute_id]
    );

    // Group by batch
    const batches = {};
    for (const row of result.rows) {
      const batchId = row.batch_id || 'unassigned';
      if (!batches[batchId]) {
        batches[batchId] = {
          batch_id: row.batch_id,
          batch_name: row.batch_name || 'Unassigned',
          total: 0,
          completed: 0,
          pending: 0,
          students: [],
        };
      }
      batches[batchId].total++;
      if (row.profile_completed) {
        batches[batchId].completed++;
      } else {
        batches[batchId].pending++;
      }
      batches[batchId].students.push({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        phone: row.phone,
        profile_completed: row.profile_completed,
      });
    }

    res.json(Object.values(batches));
  } catch (err) {
    next(err);
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

// Get student's own profile (for settings and profile editing).
async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT u.id AS user_id, u.full_name, u.phone, u.email, u.profile_completed,
              s.id AS student_id, s.address, s.date_of_birth, s.roll_number, s.institute_id,
              b.name AS batch_name,
              i.name AS institute_name,
              p.full_name AS parent_name, p.phone AS parent_phone
       FROM users u
       JOIN students s ON s.user_id = u.id
       LEFT JOIN batches b ON s.batch_id = b.id
       LEFT JOIN institutes i ON s.institute_id = i.id
       LEFT JOIN users p ON s.parent_user_id = p.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const row = result.rows[0];
    res.json({
      ...row,
      phone: (row.phone || '').startsWith('TMP') ? '' : row.phone,
      parent_phone: (row.parent_phone || '').startsWith('TMP') ? '' : (row.parent_phone || ''),
    });
  } catch (err) {
    next(err);
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

module.exports = { list, create, update, remove, bulkAdmit, profileSetup, profileStatus, getMyProfile };
