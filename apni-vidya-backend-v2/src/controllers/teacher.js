const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { resolveProvider } = require('../services/smsProviders');
const crypto = require('crypto');

async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { institute_id, full_name, phone, email, subject, password } = req.body;

    if (!institute_id || !full_name || !phone || !email) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id, full_name, phone, and email are required' });
    }

    if (/[a-zA-Z]/.test(phone)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Phone number cannot contain alphabets' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }

    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Check if user already exists by email (primary) or phone
    let userResult = await client.query(
      'SELECT id, role, email, phone FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2',
      [cleanEmail, cleanPhone]
    );
    let userId;
    let isNewUser = false;
    const effectivePassword = password || crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(effectivePassword, salt);

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      if (userResult.rows[0].role !== 'institute_admin' && userResult.rows[0].role !== 'super_admin') {
        await client.query('UPDATE users SET role = $1 WHERE id = $2', ['teacher', userId]);
      }
      if (password) {
        await client.query(
          'UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2',
          [password_hash, userId]
        );
      }
    } else {
      // Create new user
      isNewUser = true;
      const newUser = await client.query(
        `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [cleanPhone, cleanEmail, password_hash, 'teacher', full_name.trim(), !password]
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

    // Notify teacher via SMS if newly created and password was auto-generated
    if (isNewUser && !password) {
      const instRow = await db.query('SELECT name FROM institutes WHERE id = $1', [institute_id]);
      const instName = instRow.rows[0]?.name || 'an institute';
      const body = `You have been added as a teacher at ${instName}. Your temporary password is ${effectivePassword}. Please log in and change your password.`;
      try {
        await resolveProvider('sms').send({ to: cleanPhone, body, channel: 'sms' });
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
    const { full_name, phone, email, subject, is_active, password } = req.body;

    const teacherRow = await client.query('SELECT user_id, institute_id FROM teachers WHERE id = $1', [id]);
    if (teacherRow.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    
    if (!(await hasInstituteAccess(req.user, teacherRow.rows[0].institute_id, client))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (phone && /[a-zA-Z]/.test(phone)) {
      return res.status(400).json({ error: 'Phone number cannot contain alphabets' });
    }

    let cleanEmail = undefined;
    if (email !== undefined) {
      cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (cleanEmail && !emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address' });
      }
    }

    const cleanPhone = phone !== undefined ? String(phone).replace(/\D/g, '').slice(-10) : undefined;

    await client.query('BEGIN');
    
    const userId = teacherRow.rows[0].user_id;

    if (full_name !== undefined || cleanPhone !== undefined || cleanEmail !== undefined || is_active !== undefined) {
      await client.query(
        `UPDATE users SET
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         is_active = COALESCE($4, is_active),
         updated_at = now()
         WHERE id = $5`,
        [full_name ? full_name.trim() : null, cleanPhone || null, cleanEmail || null, is_active, userId]
      );
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [password_hash, userId]);
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
