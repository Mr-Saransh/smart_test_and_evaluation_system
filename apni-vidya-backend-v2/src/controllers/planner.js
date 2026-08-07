const db = require('../config/db');
const { hasInstituteAccess, hasBatchAccess, getStudentForUser } = require('../utils/access');

async function create(req, res, next) {
  try {
    const { institute_id, batch_id, title, description, due_date } = req.body;
    if (!institute_id || !title) {
      return res.status(400).json({ error: 'institute_id and title are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `INSERT INTO study_tasks (institute_id, batch_id, created_by, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [institute_id, batch_id || null, req.user.id, title, description || null, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// Tasks for a batch (teacher view).
async function listForBatch(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT st.*,
              (SELECT COUNT(*) FROM study_task_completions c WHERE c.task_id = st.id) AS completed_count
       FROM study_tasks st WHERE st.batch_id = $1 ORDER BY st.due_date NULLS LAST, st.created_at DESC`,
      [batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// A student's own checklist with done/not-done state.
async function myTasks(req, res, next) {
  try {
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });
    const result = await db.query(
      `SELECT st.*, (c.id IS NOT NULL) AS done, c.completed_at
       FROM study_tasks st
       LEFT JOIN study_task_completions c ON c.task_id = st.id AND c.student_id = $1
       WHERE st.batch_id = $2 ORDER BY st.due_date NULLS LAST, st.created_at DESC`,
      [student.id, student.batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Student ticks a task done / undone.
async function toggle(req, res, next) {
  try {
    const { task_id } = req.params;
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });

    const taskCheck = await db.query('SELECT batch_id FROM study_tasks WHERE id = $1', [task_id]);
    if (taskCheck.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    
    // A task belongs to a batch. Students can only toggle tasks for their batch.
    if (taskCheck.rows[0].batch_id !== student.batch_id) {
      return res.status(403).json({ error: 'Not authorized for this task' });
    }

    const existing = await db.query(
      'SELECT id FROM study_task_completions WHERE task_id = $1 AND student_id = $2',
      [task_id, student.id]
    );
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM study_task_completions WHERE id = $1', [existing.rows[0].id]);
      return res.json({ task_id, done: false });
    }
    await db.query(
      'INSERT INTO study_task_completions (task_id, student_id) VALUES ($1, $2)',
      [task_id, student.id]
    );
    res.json({ task_id, done: true });
  } catch (err) { next(err); }
}

// Rule-based reminders: tasks due within N days that a student hasn't completed.
async function dueReminders(req, res, next) {
  try {
    const { institute_id } = req.params;
    const days = req.query.days ? Number(req.query.days) : 2;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `SELECT st.id AS task_id, st.title, st.due_date, u.full_name AS student_name, u.phone AS student_phone
       FROM study_tasks st
       JOIN students s ON s.batch_id = st.batch_id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN study_task_completions c ON c.task_id = st.id AND c.student_id = s.id
       WHERE st.institute_id = $1 AND c.id IS NULL
         AND st.due_date IS NOT NULL
         AND st.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::interval
       ORDER BY st.due_date ASC`,
      [institute_id, days]
    );
    res.json({ count: result.rows.length, reminders: result.rows });
  } catch (err) { next(err); }
}

// Delete a planner task.
async function remove(req, res, next) {
  try {
    const { task_id } = req.params;
    const task = await db.query('SELECT institute_id FROM study_tasks WHERE id = $1', [task_id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    if (!(await hasInstituteAccess(req.user, task.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('DELETE FROM study_tasks WHERE id = $1', [task_id]);
    res.json({ deleted: true, id: task_id });
  } catch (err) { next(err); }
}

module.exports = { create, listForBatch, myTasks, toggle, dueReminders, remove };
