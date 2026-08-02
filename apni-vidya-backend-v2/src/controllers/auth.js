const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { resolveProvider } = require('../services/smsProviders');

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

function validatePassword(password) {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasNum && hasSpecial;
}

function genOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits, no leading-zero ambiguity
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function signup(req, res, next) {
  try {
    const { phone, email, password, full_name, role } = req.body;

    if (!phone || !password || !full_name) {
      return res.status(400).json({ error: 'phone, password, and full_name are required' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }

    const allowedRoles = ['institute_admin', 'teacher'];
    const userRole = role && allowedRoles.includes(role) ? role : 'institute_admin';

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (phone, email, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, phone, email, role, full_name, created_at`,
      [phone, email || null, password_hash, userRole, full_name]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const raw = req.body.identifier || req.body.phone || req.body.email || '';
    const identifier = String(raw).trim();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Mobile number or email, and password are required' });
    }

    const result = await db.query(
      `SELECT * FROM users WHERE phone = $1 OR LOWER(email) = LOWER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        must_reset_password: user.must_reset_password || false,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, phone, email, role, full_name, created_at, must_reset_password FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    if (user.role === 'student') {
      const s = await db.query('SELECT institute_id, batch_id FROM students WHERE user_id = $1', [user.id]);
      if (s.rows.length > 0) {
        user.institute_id = s.rows[0].institute_id;
        user.batch_id = s.rows[0].batch_id;
      }
    } else if (user.role === 'teacher') {
      const t = await db.query('SELECT institute_id FROM teachers WHERE user_id = $1', [user.id]);
      if (t.rows.length > 0) {
        user.institute_id = t.rows[0].institute_id;
      }
    } else if (user.role === 'parent') {
      // Just in case parent needs institute_id too (from their first linked student)
      const p = await db.query('SELECT institute_id FROM students WHERE parent_user_id = $1 LIMIT 1', [user.id]);
      if (p.rows.length > 0) {
        user.institute_id = p.rows[0].institute_id;
      }
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!validatePassword(new_password)) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }

    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];

    // If the account is not in forced-reset state, require the current password.
    if (!user.must_reset_password) {
      const valid = current_password && await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);
    await db.query(
      'UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

// Step 1 of reset: issue an OTP. Responds the same whether or not the phone is
// registered, so the endpoint can't be used to enumerate accounts.
async function forgotPassword(req, res, next) {
  try {
    const { phone } = req.body;
    const generic = { message: 'If that number is registered, a reset code has been sent.' };

    const result = await db.query(
      'SELECT id FROM users WHERE phone = $1 AND is_active = true',
      [phone]
    );
    if (result.rows.length === 0) return res.json(generic);

    const otp = genOtp();
    const otpHash = await bcrypt.hash(otp, await bcrypt.genSalt(10));
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    // Invalidate any prior outstanding codes for this number.
    await db.query('UPDATE password_resets SET consumed = true WHERE phone = $1 AND consumed = false', [phone]);
    await db.query(
      'INSERT INTO password_resets (phone, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [phone, otpHash, expiresAt]
    );

    const body = `Your Apni Vidya password reset code is ${otp}. It expires in ${OTP_TTL_MIN} minutes. Do not share it with anyone.`;
    try {
      await resolveProvider('sms').send({ to: phone, body, channel: 'sms' });
    } catch (e) {
      console.error('[otp] dispatch failed:', e.message); // don't leak to client
    }
    return res.json(generic);
  } catch (err) { next(err); }
}

// Step 2 of reset: verify the OTP and set a new password.
async function resetPassword(req, res, next) {
  try {
    const { phone, otp, new_password } = req.body;
    if (!validatePassword(new_password)) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }

    const r = await db.query(
      `SELECT * FROM password_resets
       WHERE phone = $1 AND consumed = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    if (r.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
    }
    const row = r.rows[0];

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await db.query('UPDATE password_resets SET consumed = true WHERE id = $1', [row.id]);
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }

    const ok = await bcrypt.compare(otp, row.otp_hash);
    if (!ok) {
      await db.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      return res.status(400).json({ error: 'Incorrect code.' });
    }

    const hash = await bcrypt.hash(new_password, await bcrypt.genSalt(10));
    await db.query(
      'UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE phone = $2',
      [hash, phone]
    );
    await db.query('UPDATE password_resets SET consumed = true WHERE id = $1', [row.id]);

    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) { next(err); }
}

module.exports = { signup, login, me, changePassword, forgotPassword, resetPassword };
