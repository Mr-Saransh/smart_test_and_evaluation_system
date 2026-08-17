const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');

async function create(req, res, next) {
  try {
    const { institute_id, name, description, start_date, end_date, meet_link } = req.body;

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
      `INSERT INTO batches (institute_id, name, description, start_date, end_date, meet_link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [institute_id, name, description || null, start_date || null, end_date || null, meet_link || null]
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
    const { name, description, start_date, end_date, is_active, meet_link } = req.body;

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
           meet_link = COALESCE($6, meet_link),
           updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [name, description, start_date, end_date, is_active, meet_link, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Soft-delete a batch (archive).
async function remove(req, res, next) {
  try {
    const { id } = req.params;
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
      `UPDATE batches SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json({ message: 'Batch archived', batch: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// List all batches including archived for the institute.
async function listAll(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b
       WHERE b.institute_id = $1
       ORDER BY b.is_active DESC, b.created_at DESC`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Batch details with stats.
async function getDetails(req, res, next) {
  try {
    const { id } = req.params;
    const batch = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) AS student_count
       FROM batches b WHERE b.id = $1`,
      [id]
    );
    if (batch.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (!(await hasInstituteAccess(req.user, batch.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const b = batch.rows[0];

    // Attendance %
    const attend = await db.query(
      `SELECT CASE WHEN COUNT(*) = 0 THEN 0
                   ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / COUNT(*), 1)
              END AS attendance_pct
       FROM attendance WHERE batch_id = $1`, [id]
    );

    // Fee collection
    const fees = await db.query(
      `SELECT COALESCE(SUM(fr.amount_due), 0) AS total_due,
              COALESCE(SUM(fr.amount_paid), 0) AS total_paid,
              COUNT(*) FILTER (WHERE fr.status = 'paid') AS paid_count,
              COUNT(*) FILTER (WHERE fr.status = 'pending') AS pending_count,
              COUNT(*) FILTER (WHERE fr.status = 'overdue' OR (fr.status <> 'paid' AND fr.due_date < CURRENT_DATE)) AS overdue_count
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       JOIN students s ON fr.student_id = s.id
       WHERE s.batch_id = $1`, [id]
    );

    // Upcoming tests
    const tests = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'active') AS active_tests,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed_tests
       FROM tests WHERE batch_id = $1`, [id]
    );

    // Top performers
    const topPerformers = await db.query(
      `SELECT u.full_name, 
              ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)), 1) AS avg_pct,
              COUNT(ts.id) AS tests_taken
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN test_submissions ts ON ts.student_id = s.id
       WHERE s.batch_id = $1 AND ts.id IS NOT NULL
       GROUP BY s.id, u.full_name
       ORDER BY avg_pct DESC NULLS LAST LIMIT 5`, [id]
    );

    // Teachers assigned (from timetable)
    const teachers = await db.query(
      `SELECT DISTINCT u.full_name, t.subject
       FROM timetable_slots ts
       JOIN teachers t ON ts.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ts.batch_id = $1`, [id]
    );

    res.json({
      ...b,
      attendance_pct: attend.rows[0]?.attendance_pct || 0,
      fee_stats: fees.rows[0] || {},
      test_stats: tests.rows[0] || {},
      top_performers: topPerformers.rows,
      teachers: teachers.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMeetLink(req, res, next) {
  try {
    const { id } = req.params;
    const { meet_link } = req.body;

    const { hasBatchAccess } = require('../utils/access');
    const hasAccess = await hasBatchAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }

    const result = await db.query(
      `UPDATE batches 
       SET meet_link = $1, updated_at = NOW() 
       WHERE id = $2 AND institute_id = $3
       RETURNING *`,
      [meet_link, id, req.user.institute_id] // Note: for teachers institute_id is usually on req.user. If not, they are verified by hasBatchAccess. We can rely on hasBatchAccess and just update by id.
    );

    if (result.rows.length === 0) {
      // Because hasBatchAccess passed, this means either batch doesn't exist or doesn't belong to the user's institute
      const fallbackResult = await db.query(
        `UPDATE batches SET meet_link = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [meet_link, id]
      );
      if (fallbackResult.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
      return res.json(fallbackResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, listAll, update, remove, getDetails, updateMeetLink };
