const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { dispatch } = require('../services/notifications');
const { buildStudentReport } = require('./dashboard');
const {
  parentReportBody, studentReportBody, nextRunAfter,
} = require('../utils/parentReportBody');

const VALID_CADENCES = ['daily', 'weekly', 'monthly'];
const VALID_CHANNELS = ['sms', 'whatsapp'];
const VALID_AUDIENCES = ['parents', 'students', 'both'];

async function getInstituteName(instituteId, client = db) {
  const r = await client.query('SELECT name FROM institutes WHERE id = $1', [instituteId]);
  return r.rows[0] ? r.rows[0].name : 'Your institute';
}

// POST /api/parent-reports/jobs
// Body: { institute_id, cadence, channel?, audience? }
// Creates or updates the schedule for that (institute, cadence, audience).
async function upsertJob(req, res, next) {
  try {
    const { institute_id, cadence } = req.body;
    const channel = VALID_CHANNELS.includes(req.body.channel) ? req.body.channel : 'sms';
    const audience = VALID_AUDIENCES.includes(req.body.audience) ? req.body.audience : 'parents';

    if (!institute_id || !VALID_CADENCES.includes(cadence)) {
      return res.status(400).json({ error: 'institute_id and a valid cadence (daily|weekly|monthly) are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await db.query(
      `INSERT INTO report_jobs (institute_id, cadence, channel, audience, created_by, next_run_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (institute_id, cadence, audience)
       DO UPDATE SET channel = EXCLUDED.channel,
                     is_active = true,
                     updated_at = now()
       RETURNING *`,
      [institute_id, cadence, channel, audience, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/parent-reports/jobs/:institute_id  — list scheduled reports for the institute.
async function listJobs(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `SELECT * FROM report_jobs WHERE institute_id = $1 ORDER BY cadence, audience`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// PATCH /api/parent-reports/jobs/:id  — pause/resume.
async function setActive(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const row = await db.query('SELECT institute_id FROM report_jobs WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!(await hasInstituteAccess(req.user, row.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `UPDATE report_jobs SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [Boolean(is_active), id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/parent-reports/jobs/:id
async function removeJob(req, res, next) {
  try {
    const { id } = req.params;
    const row = await db.query('SELECT institute_id FROM report_jobs WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!(await hasInstituteAccess(req.user, row.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('DELETE FROM report_jobs WHERE id = $1', [id]);
    res.json({ id, deleted: true });
  } catch (err) { next(err); }
}

// Internal: run one report-job — compile and dispatch reports for every
// student in the institute, then advance next_run_at. Returns a dispatch
// summary.
async function runJob(job) {
  const instituteName = await getInstituteName(job.institute_id);
  const students = await db.query(
    `SELECT s.id AS student_id,
            su.phone AS student_phone, su.id AS student_user_id,
            pu.phone AS parent_phone, pu.id AS parent_user_id
     FROM students s
     JOIN users su ON s.user_id = su.id
     LEFT JOIN users pu ON s.parent_user_id = pu.id
     WHERE s.institute_id = $1`,
    [job.institute_id]
  );

  const recipients = [];
  for (const s of students.rows) {
    const report = await buildStudentReport(s.student_id);
    if (!report) continue;

    if ((job.audience === 'parents' || job.audience === 'both') && s.parent_phone) {
      recipients.push({
        phone: s.parent_phone,
        user_id: s.parent_user_id,
        body: parentReportBody(instituteName, report),
      });
    }
    if ((job.audience === 'students' || job.audience === 'both') && s.student_phone) {
      recipients.push({
        phone: s.student_phone,
        user_id: s.student_user_id,
        body: studentReportBody(instituteName, report),
      });
    }
  }

  let summary = { total: 0, sent: 0, failed: 0, results: [] };
  if (recipients.length > 0) {
    summary = await dispatch({
      instituteId: job.institute_id,
      channel: job.channel,
      category: 'parent_report',
      recipients,
      createdBy: job.created_by,
    });
  }

  // Advance schedule even on empty runs so we don't fire repeatedly.
  await db.query(
    `UPDATE report_jobs
       SET last_run_at = now(),
           next_run_at = $1,
           updated_at = now()
     WHERE id = $2`,
    [nextRunAfter(job.cadence), job.id]
  );

  return summary;
}

// POST /api/parent-reports/run-now/:institute_id
// Body: { cadence?, channel?, audience? }   (defaults: weekly / sms / parents)
// Compose-and-send right now, ignoring the schedule. Useful for "Send report"
// button and for initial testing.
async function runNow(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const cadence = VALID_CADENCES.includes(req.body.cadence) ? req.body.cadence : 'weekly';
    const channel = VALID_CHANNELS.includes(req.body.channel) ? req.body.channel : 'sms';
    const audience = VALID_AUDIENCES.includes(req.body.audience) ? req.body.audience : 'parents';

    const summary = await runJob({
      id: null,                       // ad-hoc run — no schedule row to advance
      institute_id,
      cadence,
      channel,
      audience,
      created_by: req.user.id,
    });
    res.json(summary);
  } catch (err) { next(err); }
}

// POST /api/parent-reports/tick
// Cron entrypoint. Walks every active job whose next_run_at <= now and runs
// it. Authenticated as institute_admin OR with a static cron secret in the
// `X-Cron-Secret` header (CRON_SECRET env). The latter lets a system cron
// poke the endpoint without a logged-in user.
async function tick(req, res, next) {
  try {
    const headerSecret = req.headers['x-cron-secret'];
    const envSecret = process.env.CRON_SECRET;
    const authedByCron = envSecret && headerSecret === envSecret;

    if (!authedByCron) {
      // Fallback: require an authenticated institute_admin. The auth middleware
      // already ran on this route, so req.user is set.
      if (!req.user || req.user.role !== 'institute_admin') {
        return res.status(403).json({ error: 'Cron secret or admin required' });
      }
    }

    const due = await db.query(
      `SELECT * FROM report_jobs
       WHERE is_active = true AND next_run_at <= now()
       ORDER BY next_run_at ASC LIMIT 100`
    );

    const summaries = [];
    for (const job of due.rows) {
      try {
        const s = await runJob(job);
        summaries.push({ job_id: job.id, institute_id: job.institute_id, cadence: job.cadence, ...s });
      } catch (err) {
        summaries.push({ job_id: job.id, error: err.message });
      }
    }
    res.json({ ran: summaries.length, summaries });
  } catch (err) { next(err); }
}

module.exports = { upsertJob, listJobs, setActive, removeJob, runNow, tick };
