const db = require('../config/db');
const { resolveProvider } = require('./smsProviders');

// Dispatch a batch of messages over a channel, logging every attempt to the
// notifications table. Returns a per-recipient summary. Failures on one
// recipient never abort the rest.
//
// recipients: [{ phone, user_id?, body }]
async function dispatch({ instituteId, channel, category, recipients, createdBy }) {
  const provider = resolveProvider(channel);
  const results = [];

  for (const r of recipients) {
    if (!r.phone) {
      results.push({ phone: null, status: 'failed', error: 'missing phone' });
      continue;
    }

    // Record the attempt first (queued), so nothing is silently lost.
    const inserted = await db.query(
      `INSERT INTO notifications
         (institute_id, channel, category, recipient_phone, recipient_user_id, body, status, provider, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',$7,$8) RETURNING id`,
      [instituteId, channel, category, r.phone, r.user_id || null, r.body, provider.name, createdBy || null]
    );
    const notifId = inserted.rows[0].id;

    try {
      const { providerMessageId } = await provider.send({ to: r.phone, body: r.body, channel });
      await db.query(
        `UPDATE notifications SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2`,
        [providerMessageId || null, notifId]
      );
      results.push({ id: notifId, phone: r.phone, status: 'sent' });
    } catch (err) {
      await db.query(
        `UPDATE notifications SET status='failed', error=$1 WHERE id=$2`,
        [err.message, notifId]
      );
      results.push({ id: notifId, phone: r.phone, status: 'failed', error: err.message });
    }
  }

  const sent = results.filter((x) => x.status === 'sent').length;
  return { provider: provider.name, channel, total: results.length, sent, failed: results.length - sent, results };
}

// --- Message templates (plain, DLT-friendly; keep them short for SMS). ---

function feeReminderBody(instituteName, r) {
  const balance = r.amount_due - r.amount_paid;
  const when = r.is_overdue ? `was due on ${r.due_date}` : `is due on ${r.due_date}`;
  return `${instituteName}: Fee of Rs.${balance} for ${r.student_name} ${when}. Please pay at the earliest. Ignore if already paid.`;
}

function plannerReminderBody(instituteName, r) {
  return `${instituteName}: Reminder - "${r.title}" is due on ${r.due_date}. - for ${r.student_name}`;
}

// New fee structure just created -> immediate "fee due" notice (as opposed to
// feeReminderBody, which is used for the recurring nearer-to-due-date nudge).
function feeDueNoticeBody(instituteName, r) {
  const when = r.due_date ? `by ${r.due_date}` : 'at the earliest';
  return `${instituteName}: New fee "${r.title}" of Rs.${r.amount_due} for ${r.student_name} is due ${when}. Please plan payment accordingly.`;
}

// A test result just got auto-graded -> notify parent immediately.
function resultAnnouncementBody(instituteName, r) {
  const rankPart = r.rank ? `, Rank ${r.rank}` : '';
  return `${instituteName}: Result declared for "${r.test_title}". ${r.student_name} scored ${r.score}/${r.max_marks}${rankPart}. Open the app for full details.`;
}

module.exports = {
  dispatch, feeReminderBody, plannerReminderBody, feeDueNoticeBody, resultAnnouncementBody,
};
