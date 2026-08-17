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

// Calculate leaderboard for a specific batch
async function getBatchLeaderboard(req, res, next) {
  try {
    const { batch_id } = req.params;
    const { hasBatchAccess } = require('../utils/access');

    // Verify access
    if (req.user.role !== 'institute_admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const hasAccess = await hasBatchAccess(req.user, batch_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }

    const result = await fetchLeaderboardData(batch_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Student gets their own batch's leaderboard
async function getMyLeaderboard(req, res, next) {
  try {
    const { getStudentForUser } = require('../utils/access');
    const student = await getStudentForUser(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Only students can access this endpoint' });
    }
    if (!student.batch_id) {
      return res.json([]); // Not in a batch
    }

    const result = await fetchLeaderboardData(student.batch_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Core DB aggregation
async function fetchLeaderboardData(batchId) {
  // 1. Fetch top scorers (same points-based logic as before)
  const scoreQuery = `
    SELECT 
      s.id as student_id,
      u.full_name,
      b.name as batch_name,
      COALESCE(SUM(ts.score), 0) as total_score,
      COUNT(DISTINCT ts.test_id) as tests_taken
    FROM students s
    JOIN users u ON u.id = s.user_id
    JOIN batches b ON s.batch_id = b.id
    LEFT JOIN test_submissions ts ON ts.student_id = s.id
    WHERE s.batch_id = $1
    GROUP BY s.id, u.full_name, b.name
    HAVING COUNT(DISTINCT ts.test_id) > 0
    ORDER BY total_score DESC, tests_taken ASC, u.full_name ASC
  `;
  const { rows: scoreRows } = await db.query(scoreQuery, [batchId]);
  
  // Assign ranks
  let currentRank = 1;
  let previousScore = null;
  let rankSkip = 0;

  const topScorers = scoreRows.map((row) => {
    const score = Number(row.total_score);
    if (previousScore === null) {
      previousScore = score;
    } else if (score < previousScore) {
      currentRank += 1 + rankSkip;
      rankSkip = 0;
      previousScore = score;
    } else {
      // Tie
      rankSkip++;
    }
    
    return {
      ...row,
      rank: currentRank,
      total_score: score,
      tests_taken: Number(row.tests_taken)
    };
  });

  // 2. Fetch top attendance
  const attendanceQuery = `
    SELECT s.id as student_id, u.full_name, b.name as batch_name,
           ROUND(COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0), 1) AS attendance_pct
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN batches b ON s.batch_id = b.id
    JOIN attendance a ON a.student_id = s.id
    WHERE s.batch_id = $1
    GROUP BY s.id, u.full_name, b.name
    HAVING COUNT(*) > 0
    ORDER BY attendance_pct DESC
  `;
  const { rows: attendanceRows } = await db.query(attendanceQuery, [batchId]);
  
  // Assign ranks for attendance
  let attRank = 1;
  let prevAtt = null;
  let attSkip = 0;

  const topAttendance = attendanceRows.map((row) => {
    const pct = Number(row.attendance_pct);
    if (prevAtt === null) {
      prevAtt = pct;
    } else if (pct < prevAtt) {
      attRank += 1 + attSkip;
      attSkip = 0;
      prevAtt = pct;
    } else {
      attSkip++;
    }

    return {
      ...row,
      rank: attRank,
      attendance_pct: pct
    };
  });

  return {
    top_scorers: topScorers,
    top_attendance: topAttendance
  };
}

module.exports = { getInstituteLeaderboard, getBatchLeaderboard, getMyLeaderboard };
