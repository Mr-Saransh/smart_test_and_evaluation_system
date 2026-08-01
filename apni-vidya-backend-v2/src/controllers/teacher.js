const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { resolveProvider } = require('../services/smsProviders');
const crypto = require('crypto');

async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { institute_id, full_name, phone, email, subject } = req.body;

    if (!institute_id || !full_name || !phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id, full_name, and phone are required' });
    }

    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Check if user already exists
    let userResult = await client.query('SELECT id, role FROM users WHERE phone = $1', [phone]);
    let userId;
    let isNewUser = false;
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char random string

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      // If user exists, but role is student/parent, we might have an issue, but let's just upgrade/add role logic?
      // Actually, if the user exists but has a different role, for now we will just use their user ID.
      // Ideally, the system should support multiple roles. For now, assume a phone number maps to one main user record.
      // But we don't change their role if they are an admin.
      if (userResult.rows[0].role !== 'institute_admin' && userResult.rows[0].role !== 'teacher') {
         await client.query('UPDATE users SET role = $1 WHERE id = $2', ['teacher', userId]);
      }
    } else {
      // Create new user
      isNewUser = true;
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(tempPassword, salt);
      
      const newUser = await client.query(
        `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [phone, email || null, password_hash, 'teacher', full_name, true]
      );
      userId = newUser.rows[0].id;
    }

    // Check if teacher record already exists in this institute
    const existingTeacher = await client.query(
      'SELECT id FROM teachers WHERE user_id = $1 AND institute_id = $2',
      [userId, institute_id]
    );
    if (existingTeacher.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Teacher already exists in this institute' });
    }

    // Create teacher record
    const teacherResult = await client.query(
      'INSERT INTO teachers (user_id, institute_id, subject) VALUES ($1, $2, $3) RETURNING *',
      [userId, institute_id, subject || null]
    );

    await client.query('COMMIT');

    // Notify teacher
    if (isNewUser) {
      const instRow = await db.query('SELECT name FROM institutes WHERE id = $1', [institute_id]);
      const instName = instRow.rows[0]?.name || 'an institute';
      const body = `You have been added as a teacher at ${instName}. Your temporary password is ${tempPassword}. Please log in and change your password.`;
      try {
        await resolveProvider('sms').send({ to: phone, body, channel: 'sms' });
      } catch (e) {
        console.error('[teacher create] sms failed:', e.message);
      }
    }

    res.status(201).json({ teacher: teacherResult.rows[0], user_id: userId, is_new_user: isNewUser });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT t.id, t.subject, t.created_at, u.id AS user_id, u.full_name, u.phone, u.email, u.is_active
       FROM teachers t JOIN users u ON t.user_id = u.id
       WHERE t.institute_id = $1 ORDER BY u.full_name`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { full_name, phone, email, subject, is_active } = req.body;

    const teacherRow = await client.query('SELECT user_id, institute_id FROM teachers WHERE id = $1', [id]);
    if (teacherRow.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    
    if (!(await hasInstituteAccess(req.user, teacherRow.rows[0].institute_id, client))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await client.query('BEGIN');
    
    const userId = teacherRow.rows[0].user_id;

    if (full_name !== undefined || phone !== undefined || email !== undefined || is_active !== undefined) {
      await client.query(
        `UPDATE users SET
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         is_active = COALESCE($4, is_active),
         updated_at = now()
         WHERE id = $5`,
        [full_name, phone, email, is_active, userId]
      );
    }

    if (subject !== undefined) {
      await client.query('UPDATE teachers SET subject = $1 WHERE id = $2', [subject || null, id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Teacher updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const teacherRow = await db.query('SELECT institute_id FROM teachers WHERE id = $1', [id]);
    if (teacherRow.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    
    if (!(await hasInstituteAccess(req.user, teacherRow.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM teachers WHERE id = $1', [id]);
    res.json({ message: 'Teacher removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove };
