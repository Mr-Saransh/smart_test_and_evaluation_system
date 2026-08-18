const crypto = require('crypto');
const db = require('../config/db');
const { hasInstituteAccess, getStudentForUser, getStudentsForParent } = require('../utils/access');

// Assemble a full performance snapshot for one student.
async function buildStudentReport(studentId) {
  const studentRow = await db.query(
    `SELECT s.*, u.full_name, u.phone, b.name AS batch_name
     FROM students s JOIN users u ON s.user_id = u.id
     LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = $1`,
    [studentId]
  );
  if (studentRow.rows.length === 0) return null;
  const student = studentRow.rows[0];

  const attendance = await db.query(
    `SELECT COUNT(*) AS total_days,
            COUNT(*) FILTER (WHERE status IN ('present','late')) AS present_days,
            CASE WHEN COUNT(*) = 0 THEN 0
                 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / COUNT(*), 1)
            END AS attendance_pct
     FROM attendance WHERE student_id = $1`, [studentId]
  );

  const tests = await db.query(
    `SELECT t.title, t.subject, ts.score, ts.max_marks, ts.rank, ts.submitted_at,
            ROUND(100.0 * ts.score / NULLIF(ts.max_marks,0), 1) AS percentage
     FROM test_submissions ts JOIN tests t ON ts.test_id = t.id
     WHERE ts.student_id = $1 ORDER BY ts.submitted_at DESC`, [studentId]
  );

  const fees = await db.query(
    `SELECT fr.id AS fee_record_id, fs.title, fr.amount_due, fr.amount_paid, fr.status, fr.due_date
     FROM fee_records fr JOIN fee_structures fs ON fr.fee_structure_id = fs.id
     WHERE fr.student_id = $1 ORDER BY fr.due_date NULLS LAST`, [studentId]
  );

  // Per-topic SWOT across every test this student has taken.
  const topicRows = await db.query(
    `SELECT q.topic, q.subject, q.correct_index, q.id AS qid, ts.answers
     FROM test_submissions ts
     JOIN tests t ON ts.test_id = t.id
     JOIN test_questions tq ON tq.test_id = t.id
     JOIN questions q ON tq.question_id = q.id
     WHERE ts.student_id = $1`, [studentId]
  );
  const topics = {};
  for (const r of topicRows.rows) {
    const key = r.topic || r.subject;
    if (!topics[key]) topics[key] = { topic: key, attempts: 0, correct: 0 };
    const ans = r.answers ? r.answers[r.qid] : undefined;
    if (ans === undefined || ans === null) continue;
    topics[key].attempts++;
    if (ans === r.correct_index) topics[key].correct++;
  }
  const swot = Object.values(topics).map(t => {
    const accuracy = t.attempts ? Math.round((t.correct / t.attempts) * 1000) / 10 : 0;
    return { topic: t.topic, accuracy, flag: accuracy < 50 ? 'needs_revision' : 'strong' };
  }).sort((a, b) => a.accuracy - b.accuracy);

  const avgPct = tests.rows.length
    ? Math.round(tests.rows.reduce((s, t) => s + (Number(t.percentage) || 0), 0) / tests.rows.length * 10) / 10
    : 0;

  return {
    student: { id: student.id, name: student.full_name, phone: student.phone, batch: student.batch_name },
    attendance: attendance.rows[0],
    performance: { tests_taken: tests.rows.length, average_pct: avgPct, recent_tests: tests.rows.slice(0, 10) },
    swot: { strengths: swot.filter(t => t.flag === 'strong'), weaknesses: swot.filter(t => t.flag === 'needs_revision') },
    fees: fees.rows,
  };
}

// Student dashboard (own report).
async function studentDashboard(req, res, next) {
  try {
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'No student profile' });
    res.json(await buildStudentReport(student.id));
  } catch (err) { next(err); }
}

// Parent dashboard (reports for all their children).
async function parentDashboard(req, res, next) {
  try {
    const kids = await getStudentsForParent(req.user.id);
    const reports = [];
    for (const k of kids) reports.push(await buildStudentReport(k.id));
    res.json({ children: reports });
  } catch (err) { next(err); }
}

// Teacher report for a single student (admin/teacher pulling any student in their institute).
// Or parent pulling report for one of their children.
async function studentReport(req, res, next) {
  try {
    const { student_id } = req.params;
    const { hasStudentAccess } = require('../utils/access');
    
    if (!(await hasStudentAccess(req.user, student_id))) {
      return res.status(403).json({ error: 'Not authorized to view this student' });
    }
    res.json(await buildStudentReport(student_id));
  } catch (err) { next(err); }
}

// Teacher overview across a whole batch: avg score, avg attendance, weakest topics.
async function batchReport(req, res, next) {
  try {
    const { batch_id } = req.params;
    const inst = await db.query('SELECT institute_id FROM batches WHERE id = $1', [batch_id]);
    if (inst.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (!(await hasInstituteAccess(req.user, inst.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const perf = await db.query(
      `SELECT u.full_name AS student_name, s.id AS student_id,
              ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)), 1) AS avg_pct,
              COUNT(ts.id) AS tests_taken
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN test_submissions ts ON ts.student_id = s.id
       WHERE s.batch_id = $1 GROUP BY s.id, u.full_name ORDER BY avg_pct DESC NULLS LAST`,
      [batch_id]
    );

    const attend = await db.query(
      `SELECT CASE WHEN COUNT(*) = 0 THEN 0
                   ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / COUNT(*), 1)
              END AS batch_attendance_pct
       FROM attendance WHERE batch_id = $1`, [batch_id]
    );

    // Weakest topics batch-wide.
    const topicRows = await db.query(
      `SELECT q.topic, q.subject, q.correct_index, q.id AS qid, ts.answers
       FROM test_submissions ts
       JOIN tests t ON ts.test_id = t.id AND t.batch_id = $1
       JOIN test_questions tq ON tq.test_id = t.id
       JOIN questions q ON tq.question_id = q.id`, [batch_id]
    );
    const topics = {};
    for (const r of topicRows.rows) {
      const key = r.topic || r.subject;
      if (!topics[key]) topics[key] = { topic: key, attempts: 0, correct: 0 };
      const ans = r.answers ? r.answers[r.qid] : undefined;
      if (ans === undefined || ans === null) continue;
      topics[key].attempts++;
      if (ans === r.correct_index) topics[key].correct++;
    }
    const weakTopics = Object.values(topics)
      .map(t => ({ topic: t.topic, accuracy: t.attempts ? Math.round((t.correct / t.attempts) * 1000) / 10 : 0 }))
      .sort((a, b) => a.accuracy - b.accuracy);

    res.json({
      students: perf.rows,
      batch_attendance_pct: attend.rows[0].batch_attendance_pct,
      weakest_topics: weakTopics.slice(0, 5),
    });
  } catch (err) { next(err); }
}

// Generate (or fetch) a shareable portfolio token for a student.
async function enablePortfolio(req, res, next) {
  try {
    const { student_id } = req.params;
    const inst = await db.query('SELECT institute_id, portfolio_token FROM students WHERE id = $1', [student_id]);
    if (inst.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    // Student can enable their own; admin/teacher can enable for their institute's students.
    const isOwner = req.user.role === 'student' &&
      (await getStudentForUser(req.user.id))?.id === student_id;
    const isStaff = await hasInstituteAccess(req.user, inst.rows[0].institute_id);
    if (!isOwner && !isStaff) return res.status(403).json({ error: 'Not authorized' });

    let token = inst.rows[0].portfolio_token;
    if (!token) {
      token = crypto.randomBytes(12).toString('hex');
      await db.query('UPDATE students SET portfolio_token = $1 WHERE id = $2', [token, student_id]);
    }
    res.json({ portfolio_token: token, share_path: `/portfolio/${token}` });
  } catch (err) { next(err); }
}

// Public portfolio by token (no auth) — scores, attendance, achievements.
async function publicPortfolio(req, res, next) {
  try {
    const { token } = req.params;
    const s = await db.query('SELECT id FROM students WHERE portfolio_token = $1', [token]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found' });
    const report = await buildStudentReport(s.rows[0].id);
    // Public view: hide fees & phone.
    delete report.fees;
    delete report.student.phone;
    res.json(report);
  } catch (err) { next(err); }
}

async function weeklyReport(req, res, next) {
  try {
    const { institute_id } = req.params;
    const { hasInstituteAccess } = require('../utils/access');
    
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const days = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const tests = await db.query(
      `SELECT DATE(ts.submitted_at) as day, COUNT(ts.id) as submissions, AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)) as avg_score
       FROM test_submissions ts
       JOIN tests t ON ts.test_id = t.id
       WHERE t.institute_id = $1 AND ts.submitted_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(ts.submitted_at)`, [institute_id]
    );

    const attend = await db.query(
      `SELECT date, 
              COUNT(*) FILTER (WHERE status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0) as attendance_pct
       FROM attendance 
       WHERE institute_id = $1 AND date >= NOW() - INTERVAL '7 days'
       GROUP BY date`, [institute_id]
    );

    const testMap = tests.rows.reduce((acc, r) => {
      // Handle Date object conversion correctly
      const dateStr = typeof r.day === 'string' ? r.day.split('T')[0] : r.day.toISOString().split('T')[0];
      acc[dateStr] = r;
      return acc;
    }, {});
    
    const attendMap = attend.rows.reduce((acc, r) => {
      const dateStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date.toISOString().split('T')[0];
      acc[dateStr] = r;
      return acc;
    }, {});

    const trend = days.map(day => ({
      day,
      avg_score: testMap[day] ? Math.round(Number(testMap[day].avg_score)) : null,
      submissions: testMap[day] ? Number(testMap[day].submissions) : 0,
      attendance_pct: attendMap[day] ? Math.round(Number(attendMap[day].attendance_pct)) : null
    }));

    res.json({ trend });
  } catch (err) { next(err); }
}

async function adminDashboard(req, res, next) {
  try {
    const { institute_id } = req.params;
    const { hasInstituteAccess } = require('../utils/access');
    
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // 1. Core Metrics
    const coreMetricsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM students WHERE institute_id = $1) as total_students,
        (SELECT COUNT(*) FROM batches WHERE institute_id = $1 AND is_active = true) as active_batches,
        (SELECT COUNT(*) FROM courses WHERE institute_id = $1) as total_courses,
        (SELECT COUNT(*) FROM enrollments WHERE institute_id = $1 AND status = 'pending') as pending_requests
    `, [institute_id]);
    const core = coreMetricsRes.rows[0];

    // 2. Attendance Stats
    const attendRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0) as todays_pct,
        (SELECT COUNT(DISTINCT student_id) FROM attendance WHERE institute_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days' AND status = 'absent') as low_attendance_students,
        (SELECT COUNT(*) FILTER (WHERE status IN ('present', 'late')) FROM attendance WHERE institute_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days') as weekly_present,
        (SELECT COUNT(*) FILTER (WHERE status = 'absent') FROM attendance WHERE institute_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days') as weekly_absent
      FROM attendance WHERE institute_id = $1 AND date = CURRENT_DATE
    `, [institute_id]);
    const attend = attendRes.rows[0];

    // 3. Financial Stats
    const feeRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount_due), 0) as total_fees,
        COALESCE(SUM(amount_paid), 0) as total_collected,
        COALESCE(SUM(amount_due - amount_paid), 0) as total_pending,
        COUNT(DISTINCT student_id) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) as fee_dues_students
      FROM fee_records fr JOIN students s ON fr.student_id = s.id WHERE s.institute_id = $1
    `, [institute_id]);
    const fee = feeRes.rows[0];

    // 4. Test Performance
    const perfRes = await db.query(`
      SELECT 
        ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)), 1) as avg_performance,
        COUNT(*) FILTER (WHERE 100.0 * ts.score / NULLIF(ts.max_marks,0) >= 90) as excellent_count,
        COUNT(*) FILTER (WHERE 100.0 * ts.score / NULLIF(ts.max_marks,0) >= 75 AND 100.0 * ts.score / NULLIF(ts.max_marks,0) < 90) as good_count,
        COUNT(*) FILTER (WHERE 100.0 * ts.score / NULLIF(ts.max_marks,0) >= 50 AND 100.0 * ts.score / NULLIF(ts.max_marks,0) < 75) as average_count,
        COUNT(*) FILTER (WHERE 100.0 * ts.score / NULLIF(ts.max_marks,0) < 50) as poor_count,
        COUNT(ts.id) as total_tests_taken
      FROM test_submissions ts JOIN tests t ON ts.test_id = t.id WHERE t.institute_id = $1
    `, [institute_id]);
    const perf = perfRes.rows[0];

    // 5. Admissions Timeline (Last 30 days)
    const admissionsRes = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as new_admissions
      FROM students WHERE institute_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
    `, [institute_id]);
    
    // Generate 30 days continuous timeline
    const timeline = [];
    const newAdmissionsThisMonth = admissionsRes.rows.reduce((sum, row) => {
      const isThisMonth = new Date(row.date).getMonth() === new Date().getMonth();
      return sum + (isThisMonth ? Number(row.new_admissions) : 0);
    }, 0);

    const admissionMap = admissionsRes.rows.reduce((acc, row) => {
      const dStr = typeof row.date === 'string' ? row.date.split('T')[0] : row.date.toISOString().split('T')[0];
      acc[dStr] = Number(row.new_admissions);
      return acc;
    }, {});

    let activeStudentsCount = Number(core.total_students) - admissionsRes.rows.reduce((s,r) => s + Number(r.new_admissions), 0);
    for(let i=29; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const newAdm = admissionMap[dStr] || 0;
      activeStudentsCount += newAdm;
      timeline.push({
        date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        new_admissions: newAdm,
        active_students: activeStudentsCount
      });
    }

    // 6. Upcoming & Recent Tests
    const upcomingTestsRes = await db.query(`
      SELECT t.id, t.title, t.start_time, t.duration_minutes, b.name as batch_name
      FROM tests t LEFT JOIN batches b ON t.batch_id = b.id
      WHERE t.institute_id = $1 AND t.start_time > CURRENT_TIMESTAMP AND t.status = 'active'
      ORDER BY t.start_time ASC LIMIT 3
    `, [institute_id]);

    const testsThisWeekRes = await db.query(`
      SELECT COUNT(*) as count FROM tests 
      WHERE institute_id = $1 AND start_time >= date_trunc('week', CURRENT_DATE) AND start_time < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
    `, [institute_id]);

    const recentTestsRes = await db.query(`
      SELECT t.id, t.title, b.name as batch_name, t.start_time,
        (SELECT COUNT(*) FROM test_submissions ts WHERE ts.test_id = t.id) as student_count,
        (SELECT AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)) FROM test_submissions ts WHERE ts.test_id = t.id) as avg_score,
        (SELECT MAX(100.0 * ts.score / NULLIF(ts.max_marks,0)) FROM test_submissions ts WHERE ts.test_id = t.id) as top_score
      FROM tests t LEFT JOIN batches b ON t.batch_id = b.id
      WHERE t.institute_id = $1 AND t.status = 'completed'
      ORDER BY t.start_time DESC LIMIT 4
    `, [institute_id]);

    // 7. Recent Announcements
    const announcementsRes = await db.query(`
      SELECT id, title, content, type, target_type, created_at 
      FROM announcements WHERE institute_id = $1 
      ORDER BY created_at DESC LIMIT 4
    `, [institute_id]);

    res.json({
      metrics: {
        total_students: Number(core.total_students),
        active_batches: Number(core.active_batches),
        courses: Number(core.total_courses),
        todays_attendance_pct: Math.round(Number(attend.todays_pct) || 0),
        fees_pending: Number(fee.total_pending),
        new_admissions: newAdmissionsThisMonth,
        tests_this_week: Number(testsThisWeekRes.rows[0].count),
        avg_performance: Math.round(Number(perf.avg_performance) || 0)
      },
      alerts: {
        fee_dues_students: Number(fee.fee_dues_students),
        low_attendance_students: Number(attend.low_attendance_students),
        upcoming_tests: upcomingTestsRes.rows.length,
        pending_requests: Number(core.pending_requests)
      },
      charts: {
        studentTimeline: timeline,
        performance: {
          excellent: Number(perf.excellent_count),
          good: Number(perf.good_count),
          average: Number(perf.average_count),
          poor: Number(perf.poor_count),
          total_tests: Number(perf.total_tests_taken)
        },
        fees: {
          collected: Number(fee.total_collected),
          pending: Number(fee.total_pending),
          total: Number(fee.total_fees)
        },
        attendance: {
          present: Number(attend.weekly_present),
          absent: Number(attend.weekly_absent),
          total: Number(attend.weekly_present) + Number(attend.weekly_absent)
        }
      },
      lists: {
        upcoming_tests: upcomingTestsRes.rows,
        recent_tests: recentTestsRes.rows,
        announcements: announcementsRes.rows
      }
    });

  } catch (err) { next(err); }
}

module.exports = {
  studentDashboard, parentDashboard, studentReport, batchReport, enablePortfolio, publicPortfolio, weeklyReport, adminDashboard,
  // Exposed so the scheduled-report dispatcher can reuse the same compiler the
  // dashboards use; keeps the "auto-compiled from attendance + test data"
  // contract in one place.
  buildStudentReport,
};
