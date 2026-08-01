const db = require('../config/db');
const { hasBatchAccess } = require('../utils/access');

// Bulk mark attendance for a batch on a date.
// Body: { batch_id, date, entries: [{ student_id, status }] }
async function mark(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { batch_id, date, entries } = req.body;
    if (!batch_id || !date || !Array.isArray(entries)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'batch_id, date and entries[] are required' });
    }
    if (!(await hasBatchAccess(req.user, batch_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }

    const inst = await client.query('SELECT institute_id FROM batches WHERE id = $1', [batch_id]);
    const instituteId = inst.rows[0].institute_id;

    let saved = 0;
    for (const e of entries) {
      if (!['present', 'absent', 'late'].includes(e.status)) continue;
      await client.query(
        `INSERT INTO attendance (institute_id, batch_id, student_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [instituteId, batch_id, e.student_id, date, e.status, req.user.id]
      );
      saved++;
    }
    await client.query('COMMIT');
    res.json({ message: 'Attendance saved', date, marked: saved });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Get the attendance sheet for a batch on a date (every student + their status, blank if unmarked).
async function sheet(req, res, next) {
  try {
    const { batch_id } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT s.id AS student_id, u.full_name AS student_name, a.status
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
       WHERE s.batch_id = $1
       ORDER BY u.full_name`,
      [batch_id, date]
    );
    res.json({ date, students: result.rows });
  } catch (err) { next(err); }
}

// Auto-calculated attendance % for every student in a batch.
async function summary(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT s.id AS student_id, u.full_name AS student_name,
              COUNT(a.id) AS total_days,
              COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_days,
              COUNT(a.id) FILTER (WHERE a.status = 'late') AS late_days,
              COUNT(a.id) FILTER (WHERE a.status = 'absent') AS absent_days,
              CASE WHEN COUNT(a.id) = 0 THEN 0
                   ELSE ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status IN ('present','late')) / COUNT(a.id), 1)
              END AS attendance_pct
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN attendance a ON a.student_id = s.id
       WHERE s.batch_id = $1
       GROUP BY s.id, u.full_name
       ORDER BY u.full_name`,
      [batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// One student's own attendance % (for student/parent dashboard).
async function studentSummary(req, res, next) {
  try {
    const { student_id } = req.params;
    const { hasStudentAccess } = require('../utils/access');

    if (!(await hasStudentAccess(req.user, student_id))) {
      return res.status(403).json({ error: 'Not authorized for this student' });
    }

    const result = await db.query(
      `SELECT COUNT(*) AS total_days,
              COUNT(*) FILTER (WHERE status = 'present') AS present_days,
              COUNT(*) FILTER (WHERE status = 'late') AS late_days,
              COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
              CASE WHEN COUNT(*) = 0 THEN 0
                   ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / COUNT(*), 1)
              END AS attendance_pct
       FROM attendance WHERE student_id = $1`,
      [student_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { mark, sheet, summary, studentSummary };
