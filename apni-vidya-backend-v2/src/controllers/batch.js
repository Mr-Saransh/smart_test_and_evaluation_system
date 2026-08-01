const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');

async function create(req, res, next) {
  try {
    const { institute_id, name, description, start_date, end_date } = req.body;

    if (!institute_id || !name) {
      return res.status(400).json({ error: 'institute_id and name are required' });
    }

    // Verify ownership
    const inst = await db.query(
      'SELECT id FROM institutes WHERE id = $1 AND admin_id = $2',
      [institute_id, req.user.id]
    );
    if (inst.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const result = await db.query(
      `INSERT INTO batches (institute_id, name, description, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [institute_id, name, description || null, start_date || null, end_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { institute_id } = req.params;

    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const result = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b
       WHERE b.institute_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [institute_id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, is_active } = req.body;

    const batch = await db.query(
      `SELECT b.id FROM batches b
       JOIN institutes i ON b.institute_id = i.id
       WHERE b.id = $1 AND i.admin_id = $2`,
      [id, req.user.id]
    );
    if (batch.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not authorized' });
    }

    const result = await db.query(
      `UPDATE batches 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           is_active = COALESCE($5, is_active),
           updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [name, description, start_date, end_date, is_active, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update };
