const db = require('../config/db');

async function getInstituteLeaderboard(req, res, next) {
  try {
    const { institute_id } = req.params;

    // Fetch top students based on average score (min 1 test)
    const topStudents = await db.query(
      `SELECT s.id as student_id, u.full_name, b.name as batch_name,
              COUNT(ts.id) as tests_taken,
              ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)), 1) AS avg_score
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN batches b ON s.batch_id = b.id
       JOIN test_submissions ts ON ts.student_id = s.id
       WHERE s.institute_id = $1
       GROUP BY s.id, u.full_name, b.name
       HAVING COUNT(ts.id) > 0
       ORDER BY avg_score DESC
       LIMIT 10`,
      [institute_id]
    );

    // Fetch top attendance
    const topAttendance = await db.query(
      `SELECT s.id as student_id, u.full_name, b.name as batch_name,
              ROUND(COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0), 1) AS attendance_pct
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN batches b ON s.batch_id = b.id
       JOIN attendance a ON a.student_id = s.id
       WHERE s.institute_id = $1
       GROUP BY s.id, u.full_name, b.name
       HAVING COUNT(*) > 5
       ORDER BY attendance_pct DESC
       LIMIT 10`,
      [institute_id]
    );

    res.json({
      top_scorers: topStudents.rows,
      top_attendance: topAttendance.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getInstituteLeaderboard };
