const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { dispatch, feeReminderBody, plannerReminderBody } = require('../services/notifications');

const VALID_CHANNELS = ['sms', 'whatsapp'];

async function getInstituteName(instituteId) {
  const r = await db.query('SELECT name FROM institutes WHERE id = $1', [instituteId]);
  return r.rows[0] ? r.rows[0].name : 'Your institute';
}

// Default channel is WhatsApp now — fee/result/planner notices should reach
// parents there unless the caller explicitly asks for SMS.
function pickChannel(body) {
  const c = (body.channel || 'whatsapp').toLowerCase();
  return VALID_CHANNELS.includes(c) ? c : 'whatsapp';
}

// POST /api/notifications/fee-reminders/:institute_id
// Dispatch reminders for fee records due soon / overdue. Prefers the parent's
// phone, falling back to the student's.
async function sendFeeReminders(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const channel = pickChannel(req.body);

    const due = await db.query(
      `SELECT fr.amount_due, fr.amount_paid, fr.due_date, fr.status,
              u.full_name AS student_name, u.phone AS student_phone, s.user_id AS student_user_id,
              p.phone AS parent_phone, p.id AS parent_user_id,
              CASE WHEN fr.due_date < CURRENT_DATE THEN true ELSE false END AS is_overdue
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       JOIN students s ON fr.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users p ON s.parent_user_id = p.id
       WHERE fs.institute_id = $1
         AND fr.status IN ('pending', 'partial')
         AND fr.due_date IS NOT NULL
         AND fr.due_date <= CURRENT_DATE + (fs.reminder_days || ' days')::interval
       ORDER BY fr.due_date ASC`,
      [institute_id]
    );

    const instituteName = await getInstituteName(institute_id);
    const recipients = due.rows.map((r) => ({
      phone: r.parent_phone || r.student_phone,
      user_id: r.parent_phone ? r.parent_user_id : r.student_user_id,
      body: feeReminderBody(instituteName, r),
    }));

    if (recipients.length === 0) {
      return res.json({ message: 'No fee reminders are due.', total: 0, sent: 0, failed: 0, results: [] });
    }
    const summary = await dispatch({
      instituteId: institute_id, channel, category: 'fee_reminder', recipients, createdBy: req.user.id,
    });
    res.json(summary);
  } catch (err) { next(err); }
}

// POST /api/notifications/planner-reminders/:institute_id
// Dispatch reminders for study tasks due within `days` (default 2) not yet done.
async function sendPlannerReminders(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const channel = pickChannel(req.body);
    const days = req.body.days ? Number(req.body.days) : 2;

    const due = await db.query(
      `SELECT st.title, st.due_date,
              u.full_name AS student_name, u.phone AS student_phone, s.user_id AS student_user_id
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

    const instituteName = await getInstituteName(institute_id);
    const recipients = due.rows.map((r) => ({
      phone: r.student_phone,
      user_id: r.student_user_id,
      body: plannerReminderBody(instituteName, r),
    }));

    if (recipients.length === 0) {
      return res.json({ message: 'No planner reminders are due.', total: 0, sent: 0, failed: 0, results: [] });
    }
    const summary = await dispatch({
      instituteId: institute_id, channel, category: 'planner_reminder', recipients, createdBy: req.user.id,
    });
    res.json(summary);
  } catch (err) { next(err); }
}

// POST /api/notifications/send
// Admin/teacher sends a free-text message to a batch (or whole institute),
// to students and/or parents.
async function sendCustom(req, res, next) {
  try {
    const { institute_id, batch_id, message, audience } = req.body;
    if (!institute_id || !message) {
      return res.status(400).json({ error: 'institute_id and message are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const channel = pickChannel(req.body);
    const aud = ['students', 'parents', 'all'].includes(audience) ? audience : 'all';

    const studentsRes = await db.query(
      batch_id
        ? `SELECT u.phone AS student_phone, s.user_id AS student_user_id, p.phone AS parent_phone, p.id AS parent_user_id
           FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
           WHERE s.institute_id = $1 AND s.batch_id = $2`
        : `SELECT u.phone AS student_phone, s.user_id AS student_user_id, p.phone AS parent_phone, p.id AS parent_user_id
           FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
           WHERE s.institute_id = $1`,
      batch_id ? [institute_id, batch_id] : [institute_id]
    );

    const recipients = [];
    for (const row of studentsRes.rows) {
      if ((aud === 'all' || aud === 'students') && row.student_phone) {
        recipients.push({ phone: row.student_phone, user_id: row.student_user_id, body: message });
      }
      if ((aud === 'all' || aud === 'parents') && row.parent_phone) {
        recipients.push({ phone: row.parent_phone, user_id: row.parent_user_id, body: message });
      }
    }

    if (recipients.length === 0) {
      return res.json({ message: 'No recipients matched.', total: 0, sent: 0, failed: 0, results: [] });
    }
    const summary = await dispatch({
      instituteId: institute_id, channel, category: 'custom', recipients, createdBy: req.user.id,
    });
    res.json(summary);
  } catch (err) { next(err); }
}

// GET /api/notifications/:institute_id — recent dispatch log.
async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `SELECT id, channel, category, recipient_phone, body, status, provider, error, created_at, sent_at
       FROM notifications WHERE institute_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { sendFeeReminders, sendPlannerReminders, sendCustom, list };
