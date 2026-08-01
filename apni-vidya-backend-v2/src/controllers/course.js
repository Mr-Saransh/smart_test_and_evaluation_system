const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');

async function create(req, res, next) {
  try {
    const { institute_id, batch_id, name, description, fee_amount, duration_days } = req.body;
    if (!institute_id || !name) {
      return res.status(400).json({ error: 'institute_id and name are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `INSERT INTO courses (institute_id, batch_id, name, description, fee_amount, duration_days)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [institute_id, batch_id || null, name, description || null, fee_amount || 0, duration_days || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT c.*, b.name AS batch_name
       FROM courses c LEFT JOIN batches b ON c.batch_id = b.id
       WHERE c.institute_id = $1 AND c.is_active = true
       ORDER BY c.created_at DESC`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, fee_amount, duration_days, is_active } = req.body;
    const owned = await db.query(
      `SELECT c.id FROM courses c JOIN institutes i ON c.institute_id = i.id
       WHERE c.id = $1 AND i.admin_id = $2`, [id, req.user.id]
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Course not found or not authorized' });
    const result = await db.query(
      `UPDATE courses SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         fee_amount = COALESCE($3, fee_amount),
         duration_days = COALESCE($4, duration_days),
         is_active = COALESCE($5, is_active),
         updated_at = now()
       WHERE id = $6 RETURNING *`,
      [name, description, fee_amount, duration_days, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { create, list, update };
