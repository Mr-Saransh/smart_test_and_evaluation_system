const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { computeFeeStatus } = require('../utils/fee');
const { dispatch, feeDueNoticeBody } = require('../services/notifications');

async function getInstituteName(instituteId, client = db) {
  const r = await client.query('SELECT name FROM institutes WHERE id = $1', [instituteId]);
  return r.rows[0] ? r.rows[0].name : 'Your institute';
}

// Create a fee structure and auto-generate fee records for all students in the batch.
async function createStructure(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { institute_id, batch_id, title, total_amount, due_date, reminder_days } = req.body;
    if (!institute_id || !title || total_amount == null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id, title and total_amount are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const fs = await client.query(
      `INSERT INTO fee_structures (institute_id, batch_id, title, total_amount, due_date, reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [institute_id, batch_id || null, title, total_amount, due_date || null, reminder_days || 3]
    );
    const structure = fs.rows[0];

    // Auto-create a fee record per student (whole institute, or only the batch),
    // pulling in parent contact details in the same pass so we can notify them
    // right after commit — no separate manual "send" step needed.
    const students = await client.query(
      batch_id
        ? `SELECT s.id, u.full_name AS student_name, u.phone AS student_phone, p.phone AS parent_phone, p.id AS parent_user_id
           FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
           WHERE s.institute_id = $1 AND s.batch_id = $2`
        : `SELECT s.id, u.full_name AS student_name, u.phone AS student_phone, p.phone AS parent_phone, p.id AS parent_user_id
           FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
           WHERE s.institute_id = $1`,
      batch_id ? [institute_id, batch_id] : [institute_id]
    );
    for (const s of students.rows) {
      await client.query(
        `INSERT INTO fee_records (fee_structure_id, student_id, amount_due, due_date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (fee_structure_id, student_id) DO NOTHING`,
        [structure.id, s.id, total_amount, due_date || null]
      );
    }

    await client.query('COMMIT');

    // Fire-and-report: notify parents (falling back to the student) on WhatsApp
    // that a new fee is due. Failures here never affect the fee structure itself
    // (it's already committed), so this runs after COMMIT and is best-effort.
    let notified = { total: 0, sent: 0, failed: 0 };
    try {
      const instituteName = await getInstituteName(institute_id);
      const recipients = students.rows
        .filter((s) => s.parent_phone || s.student_phone)
        .map((s) => ({
          phone: s.parent_phone || s.student_phone,
          user_id: s.parent_phone ? s.parent_user_id : undefined,
          body: feeDueNoticeBody(instituteName, {
            title, amount_due: total_amount, due_date: due_date || null, student_name: s.student_name,
          }),
        }));
      if (recipients.length > 0) {
        notified = await dispatch({
          instituteId: institute_id,
          channel: 'whatsapp',
          category: 'fee_due_notice',
          recipients,
          createdBy: req.user.id,
        });
      }
    } catch (notifyErr) {
      notified = { total: 0, sent: 0, failed: 0, error: notifyErr.message };
    }

    res.status(201).json({ structure, records_created: students.rows.length, whatsapp_notified: notified });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function listStructures(req, res, next) {
  try {
    const { institute_id } = req.params;
    const result = await db.query(
      `SELECT fs.*, b.name AS batch_name,
              (SELECT COUNT(*) FROM fee_records fr WHERE fr.fee_structure_id = fs.id) AS total_records,
              (SELECT COUNT(*) FROM fee_records fr WHERE fr.fee_structure_id = fs.id AND fr.status = 'paid') AS paid_records
       FROM fee_structures fs LEFT JOIN batches b ON fs.batch_id = b.id
       WHERE fs.institute_id = $1 ORDER BY fs.created_at DESC`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Records for one structure with student names + computed overdue status.
async function listRecords(req, res, next) {
  try {
    const { structure_id } = req.params;

    const structCheck = await db.query('SELECT institute_id FROM fee_structures WHERE id = $1', [structure_id]);
    if (structCheck.rows.length === 0) return res.status(404).json({ error: 'Fee structure not found' });
    if (!(await hasInstituteAccess(req.user, structCheck.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this fee structure' });
    }

    const result = await db.query(
      `SELECT fr.*, u.full_name AS student_name, u.phone AS student_phone,
              CASE WHEN fr.status <> 'paid' AND fr.due_date IS NOT NULL AND fr.due_date < CURRENT_DATE
                   THEN true ELSE false END AS is_overdue
       FROM fee_records fr
       JOIN students s ON fr.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE fr.fee_structure_id = $1
       ORDER BY u.full_name`,
      [structure_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Record a (full or partial) payment.
async function recordPayment(req, res, next) {
  try {
    const { record_id } = req.params;
    const { amount } = req.body;
    if (amount == null || amount <= 0) return res.status(400).json({ error: 'A positive amount is required' });

    const rec = await db.query('SELECT * FROM fee_records WHERE id = $1', [record_id]);
    if (rec.rows.length === 0) return res.status(404).json({ error: 'Fee record not found' });

    const r = rec.rows[0];
    if (!(await hasInstituteAccessForFeeRecord(req.user, record_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const newPaid = r.amount_paid + amount;
    const status = computeFeeStatus(r.amount_due, newPaid);

    const result = await db.query(
      `UPDATE fee_records SET amount_paid = $1, status = $2::text,
         paid_at = CASE WHEN $2::text = 'paid' THEN now() ELSE paid_at END,
         updated_at = now()
       WHERE id = $3 RETURNING *`,
      [newPaid, status, record_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Rule-based reminders: records that are unpaid and within reminder_days of due date, or overdue.
// (No AI — pure date arithmetic. A cron job would call this and dispatch SMS/WhatsApp.)
async function dueReminders(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `SELECT fr.id AS record_id, fr.amount_due, fr.amount_paid, fr.due_date, fr.status,
              u.full_name AS student_name, u.phone AS student_phone,
              p.phone AS parent_phone,
              (fr.due_date - CURRENT_DATE) AS days_to_due,
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
    res.json({
      count: result.rows.length,
      note: 'These records are due soon or overdue. Dispatch SMS/WhatsApp from here.',
      reminders: result.rows,
    });
  } catch (err) { next(err); }
}

async function hasInstituteAccessForFeeRecord(user, recordId) {
  const r = await db.query(
    `SELECT fs.institute_id FROM fee_records fr
     JOIN fee_structures fs ON fr.fee_structure_id = fs.id WHERE fr.id = $1`,
    [recordId]
  );
  if (r.rows.length === 0) return false;
  return hasInstituteAccess(user, r.rows[0].institute_id);
}

// All fee records for an institute (admin dashboard view).
async function listAllRecords(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT fr.*, fs.title AS fee_title, fs.batch_id, b.name AS batch_name,
              u.full_name AS student_name, u.phone AS student_phone,
              CASE WHEN fr.status <> 'paid' AND fr.due_date IS NOT NULL AND fr.due_date < CURRENT_DATE
                   THEN true ELSE false END AS is_overdue
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       JOIN students s ON fr.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN batches b ON fs.batch_id = b.id
       WHERE fs.institute_id = $1
       ORDER BY fr.due_date NULLS LAST, u.full_name`,
      [institute_id]
    );

    // Summary stats
    const stats = await db.query(
      `SELECT
         COALESCE(SUM(fr.amount_due), 0) AS total_due,
         COALESCE(SUM(fr.amount_paid), 0) AS total_paid,
         COUNT(*) AS total_records,
         COUNT(*) FILTER (WHERE fr.status = 'paid') AS paid_count,
         COUNT(*) FILTER (WHERE fr.status = 'pending') AS pending_count,
         COUNT(*) FILTER (WHERE fr.status = 'partial') AS partial_count,
         COUNT(*) FILTER (WHERE fr.status <> 'paid' AND fr.due_date IS NOT NULL AND fr.due_date < CURRENT_DATE) AS overdue_count
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       WHERE fs.institute_id = $1`,
      [institute_id]
    );

    res.json({ records: result.rows, stats: stats.rows[0] });
  } catch (err) { next(err); }
}

// Student's own fee records.
async function listStudentFees(req, res, next) {
  try {
    const { getStudentForUser, getStudentsForParent } = require('../utils/access');
    let studentIds = [];

    if (req.user.role === 'student') {
      const s = await getStudentForUser(req.user.id);
      if (!s) return res.status(403).json({ error: 'No student profile' });
      studentIds = [s.id];
    } else if (req.user.role === 'parent') {
      const kids = await getStudentsForParent(req.user.id);
      studentIds = kids.map(k => k.id);
    } else {
      return res.status(403).json({ error: 'Students or parents only' });
    }

    if (studentIds.length === 0) return res.json([]);

    const result = await db.query(
      `SELECT fr.*, fs.title AS fee_title, u.full_name AS student_name
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       JOIN students s ON fr.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE fr.student_id = ANY($1)
       ORDER BY fr.due_date NULLS LAST`,
      [studentIds]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { createStructure, listStructures, listRecords, recordPayment, dueReminders, listAllRecords, listStudentFees };
