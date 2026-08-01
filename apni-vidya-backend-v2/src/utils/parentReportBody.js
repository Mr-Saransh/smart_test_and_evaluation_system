// Compose a single-SMS-friendly auto-report from a student's full report
// (the same payload returned by /api/dashboard/student-report/:id).
//
// The Apni Vidya 2.0 journey doc requires: "Auto-compiled from attendance +
// test data, sent on schedule". We keep the message short so it survives as a
// single SMS segment where possible (~160 chars) but allow a graceful overflow
// for WhatsApp.

function compactPct(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(0) + '%';
}

// Build the SMS body for a parent. `instituteName` is the prefix; `report` is
// the buildStudentReport() shape from controllers/dashboard.js.
function parentReportBody(instituteName, report) {
  const name = report?.student?.name || 'your child';
  const attPct = compactPct(report?.attendance?.attendance_pct);
  const avgPct = compactPct(report?.performance?.average_pct);
  const taken = report?.performance?.tests_taken || 0;

  const recent = report?.performance?.recent_tests?.[0];
  const recentTxt = recent
    ? ` Last test ${recent.title}: ${compactPct(recent.percentage)} (rank ${recent.rank || '-'}).`
    : '';

  const outstanding = (report?.fees || [])
    .filter((f) => f.status === 'pending' || f.status === 'partial' || f.status === 'overdue')
    .reduce((s, f) => s + (Number(f.amount_due) - Number(f.amount_paid || 0)), 0);
  const feeTxt = outstanding > 0 ? ` Fees due: Rs.${outstanding}.` : '';

  const weak = report?.swot?.weaknesses?.[0]?.topic;
  const focusTxt = weak ? ` Focus: ${weak}.` : '';

  return `${instituteName}: Update for ${name}. Attendance ${attPct}, avg score ${avgPct} over ${taken} test(s).${recentTxt}${focusTxt}${feeTxt}`;
}

// Same composer for students — slightly different wording ("Your" not "for X").
function studentReportBody(instituteName, report) {
  const attPct = compactPct(report?.attendance?.attendance_pct);
  const avgPct = compactPct(report?.performance?.average_pct);
  const taken = report?.performance?.tests_taken || 0;
  const recent = report?.performance?.recent_tests?.[0];
  const recentTxt = recent
    ? ` Last test ${recent.title}: ${compactPct(recent.percentage)} (rank ${recent.rank || '-'}).`
    : '';
  const weak = report?.swot?.weaknesses?.[0]?.topic;
  const focusTxt = weak ? ` Focus: ${weak}.` : '';
  return `${instituteName}: Your progress. Attendance ${attPct}, avg score ${avgPct} over ${taken} test(s).${recentTxt}${focusTxt}`;
}

// Advance a "next_run_at" timestamp by the cadence. Always returns a UTC
// Date object. Caller persists it.
function nextRunAfter(cadence, from = new Date()) {
  const d = new Date(from.getTime());
  if (cadence === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (cadence === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (cadence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

module.exports = { parentReportBody, studentReportBody, nextRunAfter };
