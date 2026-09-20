const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { resolveProvider } = require('../services/smsProviders');
const { sendCredentialsEmail } = require('../services/email');
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

    // Generate effective password: use the admin-provided one or auto-generate
    const effectivePassword = password || crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(effectivePassword, salt);
    // If admin provided a password, the teacher can login immediately (no forced reset)
    const mustResetPassword = !password;

    // Check if user already exists by email (primary) or phone
    let userResult = await client.query(
      'SELECT id, role, email, phone FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2',
      [cleanEmail, cleanPhone]
    );
    let userId;
    let isNewUser = false;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      if (userResult.rows[0].role !== 'institute_admin' && userResult.rows[0].role !== 'super_admin') {
        await client.query('UPDATE users SET role = $1 WHERE id = $2', ['teacher', userId]);
      }
      // ALWAYS update the password so the teacher can login with what the admin set
      await client.query(
        'UPDATE users SET password_hash = $1, must_reset_password = $2, email = COALESCE($3, email), phone = COALESCE($4, phone), updated_at = now() WHERE id = $5',
        [password_hash, mustResetPassword, cleanEmail, cleanPhone, userId]
      );
    } else {
      // Create new user
      isNewUser = true;
      const newUser = await client.query(
        `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [cleanPhone, cleanEmail, password_hash, 'teacher', full_name.trim(), mustResetPassword]
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

    // Send credentials to the teacher's email
    const instRow = await db.query('SELECT name FROM institutes WHERE id = $1', [institute_id]);
    const instName = instRow.rows[0]?.name || 'Apni Vidya';
    const frontendUrl = process.env.FRONTEND_URL || 'https://smart-test-and-evaluation-system-4l.vercel.app';

    try {
      await sendTeacherCredentialsEmail({
        to: cleanEmail,
        password: effectivePassword,
        instituteName: instName,
        loginUrl: `${frontendUrl}/login`,
        teacherName: full_name.trim(),
      });
    } catch (e) {
      console.error('[teacher create] email failed:', e.message);
    }

    // Also try SMS notification
    try {
      const smsBody = `You have been added as a teacher at ${instName}. Login: ${cleanEmail} Password: ${effectivePassword}. Login at ${frontendUrl}/login`;
      await resolveProvider('sms').send({ to: cleanPhone, body: smsBody, channel: 'sms' });
    } catch (e) {
      console.error('[teacher create] sms failed:', e.message);
    }

    res.status(201).json({ teacher: teacherResult.rows[0], user_id: userId, is_new_user: isNewUser });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * Send a styled teacher credentials email using nodemailer.
 */
async function sendTeacherCredentialsEmail({ to, password, instituteName, loginUrl, teacherName }) {
  // Reuse the email transporter from our existing email service
  const nodemailer = require('nodemailer');

  let transporter = null;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD;

  if (!user || !pass) {
    console.log(`[email-mock] Would send teacher credentials to ${to} | Password: ${password}`);
    return { accepted: [to], mock: true };
  }

  if (host) {
    transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  } else {
    transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  }

  const subject = `Your ${instituteName} Teacher Account – Login Credentials`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 28px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎓 Apni Vidya</div>
      <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px;">${instituteName}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Welcome, ${teacherName || 'Teacher'}!</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
        You have been added as a <strong>Teacher</strong> at <strong>${instituteName}</strong>. Use the credentials below to log in to the Apni Vidya platform.
      </p>

      <!-- Credential Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email / Login ID</div>
          <div style="font-size:16px;font-weight:700;color:#1e293b;">${to}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Password</div>
          <div style="font-size:16px;font-weight:700;color:#4f46e5;letter-spacing:1px;">${password}</div>
        </div>
      </div>

      <!-- Steps -->
      <div style="background:#eff6ff;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#3b82f6;margin-bottom:8px;">📋 Getting Started</div>
        <ol style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.8;">
          <li>Log in with the credentials above</li>
          <li>You can manage tests, attendance, and student progress</li>
          <li>Change your password from Settings if needed</li>
        </ol>
      </div>

      <!-- CTA -->
      <a href="${loginUrl || '#'}" style="display:block;text-align:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
        Log In Now →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        This is an automated message from Apni Vidya. Do not share your password with anyone.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: `"Apni Vidya" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Teacher credentials sent to ${to}`);
    return info;
  } catch (err) {
    console.error(`[email] Failed to send teacher credentials to ${to}:`, err.message);
    throw err;
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
      await client.query(
        'UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2',
        [password_hash, userId]
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

