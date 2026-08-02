const db = require('../config/db');
const { hasInstituteAccess, hasBatchAccess, getStudentForUser } = require('../utils/access');
const { dispatch, resultAnnouncementBody } = require('../services/notifications');

async function getInstituteName(instituteId, client = db) {
  const r = await client.query('SELECT name FROM institutes WHERE id = $1', [instituteId]);
  return r.rows[0] ? r.rows[0].name : 'Your institute';
}

// Resolve a test -> its batch, then check the user has access to that batch.
async function hasTestAccess(user, testId) {
  const t = await db.query('SELECT batch_id FROM tests WHERE id = $1', [testId]);
  if (t.rows.length === 0) return false;
  return hasBatchAccess(user, t.rows[0].batch_id);
}

// Create a test by selecting questions from the bank.
// Body: { institute_id, batch_id, title, subject, duration_min, question_ids: [] }
async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { institute_id, batch_id, course_id, title, subject, chapter, difficulty, duration_min, question_ids, number_of_questions, start_date, end_date, attempt_limit } = req.body;
    if (!institute_id || !batch_id || !title) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id, batch_id and title are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    let selectedQuestionIds = question_ids || [];
    
    // Auto-pick questions if number_of_questions is provided and question_ids is empty
    if (selectedQuestionIds.length === 0 && number_of_questions > 0) {
      const filters = ['institute_id = $1'];
      const params = [institute_id];
      if (subject) { params.push(subject); filters.push(`subject = $${params.length}`); }
      if (chapter) { params.push(chapter); filters.push(`chapter = $${params.length}`); }
      if (difficulty) { params.push(difficulty); filters.push(`difficulty = $${params.length}`); }
      
      const qRes = await client.query(
        `SELECT id FROM questions WHERE ${filters.join(' AND ')} ORDER BY RANDOM() LIMIT $${params.length + 1}`,
        [...params, number_of_questions]
      );
      selectedQuestionIds = qRes.rows.map(r => r.id);
      
      if (selectedQuestionIds.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No questions found matching criteria' });
      }
    }

    if (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'question_ids array or number_of_questions is required' });
    }

    // Pull marks for the selected questions to compute total.
    const q = await client.query(
      'SELECT id, marks FROM questions WHERE id = ANY($1::uuid[]) AND institute_id = $2',
      [selectedQuestionIds, institute_id]
    );
    if (q.rows.length !== selectedQuestionIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Some questions do not belong to this institute' });
    }
    const totalMarks = q.rows.reduce((s, r) => s + r.marks, 0);

    const test = await client.query(
      `INSERT INTO tests (institute_id, batch_id, course_id, created_by, title, subject, chapter, difficulty, duration_min, total_marks, start_date, end_date, attempt_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active') RETURNING *`,
      [institute_id, batch_id, course_id || null, req.user.id, title, subject || null, chapter || null, difficulty || null, duration_min || 30, totalMarks, start_date || null, end_date || null, attempt_limit || 1]
    );

    // Preserve the order.
    for (let i = 0; i < selectedQuestionIds.length; i++) {
      await client.query(
        'INSERT INTO test_questions (test_id, question_id, position) VALUES ($1, $2, $3)',
        [test.rows[0].id, selectedQuestionIds[i], i]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(test.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function list(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS question_count,
              (SELECT COUNT(*) FROM test_submissions ts WHERE ts.test_id = t.id) AS submission_count
       FROM tests t WHERE t.batch_id = $1 ORDER BY t.created_at DESC`,
      [batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Full test for a student to take. Hides correct_index.
async function getForStudent(req, res, next) {
  try {
    const { test_id } = req.params;
    const test = await db.query('SELECT * FROM tests WHERE id = $1', [test_id]);
    if (test.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    const testRow = test.rows[0];

    // Authorize: a student may only fetch a test for their own batch;
    // staff may fetch any test in an institute they belong to.
    if (req.user.role === 'student') {
      const student = await getStudentForUser(req.user.id);
      if (!student || student.batch_id !== testRow.batch_id) {
        return res.status(403).json({ error: 'Not enrolled in this test\'s batch' });
      }
    } else if (!(await hasBatchAccess(req.user, testRow.batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }

    const questions = await db.query(
      `SELECT q.id, q.subject, q.topic, q.type, q.text, q.options, q.marks, q.negative_marks, tq.position
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 ORDER BY tq.position`,
      [test_id]
    );
    res.json({ test: test.rows[0], questions: questions.rows });
  } catch (err) { next(err); }
}

// List tests for the logged-in student's own batch, with their personal
// submission status (so the app can show "Start" vs "View result"). Students
// can't use the staff /batch/:batch_id route (it requires institute access),
// so this is their entry point into the in-app test player.
async function listForStudent(req, res, next) {
  try {
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });
    if (!student.batch_id) return res.json([]);
    const result = await db.query(
      `SELECT t.id, t.title, t.subject, t.duration_min, t.total_marks, t.status, t.created_at,
              t.start_date, t.end_date, t.attempt_limit,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS question_count,
              (SELECT COUNT(*) FROM test_submissions ts WHERE ts.test_id = t.id AND ts.student_id = $1) AS attempts_used,
              ts.score, ts.max_marks, ts.rank
       FROM tests t
       LEFT JOIN (
         SELECT ts1.* FROM test_submissions ts1
         WHERE ts1.student_id = $1
         AND ts1.attempt_number = (SELECT MAX(attempt_number) FROM test_submissions WHERE test_id = ts1.test_id AND student_id = $1)
       ) ts ON ts.test_id = t.id
       WHERE t.batch_id = $2
       ORDER BY t.created_at DESC`,
      [student.id, student.batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Student submits answers -> auto-grade MCQs immediately, then re-rank the test.
// Body: { answers: { question_id: chosen_index } }
async function submit(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { test_id } = req.params;
    const { answers } = req.body;
    const student = await getStudentForUser(req.user.id, client);
    if (!student) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only enrolled students can submit tests' });
    }

    const test = await client.query('SELECT * FROM tests WHERE id = $1', [test_id]);
    if (test.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Test not found' });
    }

    const testRow = test.rows[0];

    if (student.batch_id !== testRow.batch_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This test is not assigned to your batch' });
    }

    const { time_taken_min } = req.body;
    
    // Check attempt limits
    const prevAttempts = await client.query('SELECT MAX(attempt_number) as max_attempt FROM test_submissions WHERE test_id = $1 AND student_id = $2', [test_id, student.id]);
    const attempt_number = (prevAttempts.rows[0].max_attempt || 0) + 1;
    
    if (attempt_number > testRow.attempt_limit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Attempt limit reached for this test' });
    }

    // Auto-grade: match each answer against the question's correct_index.
    const questions = await client.query(
      `SELECT q.id, q.correct_index, q.marks, q.negative_marks, q.type
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1`,
      [test_id]
    );
    let score = 0;
    for (const q of questions.rows) {
      if (q.type !== 'mcq') continue; // subjective graded separately (manual / future AI)
      const ans = answers ? answers[q.id] : undefined;
      if (ans === undefined || ans === null) continue;
      if (ans === q.correct_index) score += q.marks;
      else score -= q.negative_marks;
    }
    score = Math.max(0, score);

    const submission = await client.query(
      `INSERT INTO test_submissions (test_id, student_id, answers, score, max_marks, attempt_number, time_taken_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (test_id, student_id, attempt_number)
       DO UPDATE SET answers = EXCLUDED.answers, score = EXCLUDED.score, time_taken_min = EXCLUDED.time_taken_min, submitted_at = now()
       RETURNING *`,
      [test_id, student.id, JSON.stringify(answers || {}), score, testRow.total_marks, attempt_number, time_taken_min || 0]
    );

    await recomputeRanks(client, test_id);

    const ranked = await client.query(
      'SELECT rank FROM test_submissions WHERE test_id = $1 AND student_id = $2',
      [test_id, student.id]
    );

    await client.query('COMMIT');

    // Result is now final for this student — push it straight to the parent's
    // WhatsApp. Best-effort: notification failure never affects the (already
    // committed) submission or the response the student sees.
    let notified = { total: 0, sent: 0, failed: 0 };
    try {
      const contact = await db.query(
        `SELECT u.full_name AS student_name, p.phone AS parent_phone, p.id AS parent_user_id
         FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
         WHERE s.id = $1`,
        [student.id]
      );
      const c = contact.rows[0];
      if (c && c.parent_phone) {
        const instituteName = await getInstituteName(test.rows[0].institute_id);
        notified = await dispatch({
          instituteId: test.rows[0].institute_id,
          channel: 'whatsapp',
          category: 'result_announcement',
          recipients: [{
            phone: c.parent_phone,
            user_id: c.parent_user_id,
            body: resultAnnouncementBody(instituteName, {
              test_title: test.rows[0].title,
              student_name: c.student_name,
              score,
              max_marks: test.rows[0].total_marks,
              rank: ranked.rows[0]?.rank,
            }),
          }],
          createdBy: student.user_id || null,
        });
      }
    } catch (notifyErr) {
      notified = { total: 0, sent: 0, failed: 0, error: notifyErr.message };
    }

    res.json({
      message: 'Test submitted and auto-graded',
      score,
      max_marks: test.rows[0].total_marks,
      rank: ranked.rows[0]?.rank,
      whatsapp_notified: notified,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Auto-rank: sort submissions by score desc, dense-rank.
async function recomputeRanks(client, testId) {
  await client.query(
    `UPDATE test_submissions ts
     SET rank = r.rnk
     FROM (
       SELECT id, RANK() OVER (ORDER BY score DESC) AS rnk
       FROM test_submissions WHERE test_id = $1
     ) r
     WHERE ts.id = r.id AND ts.test_id = $1`,
    [testId]
  );
}

// Scoreboard / rank list for a test (teacher view).
async function results(req, res, next) {
  try {
    const { test_id } = req.params;
    if (!(await hasTestAccess(req.user, test_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }
    const result = await db.query(
      `SELECT ts.*, u.full_name AS student_name,
              ROUND(100.0 * ts.score / NULLIF(ts.max_marks, 0), 1) AS percentage
       FROM test_submissions ts
       JOIN students s ON ts.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ts.test_id = $1 ORDER BY ts.rank ASC`,
      [test_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// SWOT / concept-gap analysis: batch-wide accuracy per topic for a test.
// "Weak topic" = accuracy below threshold (default 50%). No AI — pure aggregation.
async function analysis(req, res, next) {
  try {
    const { test_id } = req.params;
    if (!(await hasTestAccess(req.user, test_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }
    const threshold = req.query.threshold ? Number(req.query.threshold) : 50;

    const subs = await db.query('SELECT student_id, answers FROM test_submissions WHERE test_id = $1', [test_id]);
    const questions = await db.query(
      `SELECT q.id, q.topic, q.subject, q.correct_index, q.marks
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id WHERE tq.test_id = $1`,
      [test_id]
    );

    const topics = {};
    for (const q of questions.rows) {
      const key = q.topic || q.subject;
      if (!topics[key]) topics[key] = { topic: key, subject: q.subject, attempts: 0, correct: 0 };
      for (const sub of subs.rows) {
        const ans = sub.answers ? sub.answers[q.id] : undefined;
        if (ans === undefined || ans === null) continue;
        topics[key].attempts++;
        if (ans === q.correct_index) topics[key].correct++;
      }
    }

    const breakdown = Object.values(topics).map(t => {
      const accuracy = t.attempts ? Math.round((t.correct / t.attempts) * 1000) / 10 : 0;
      return { ...t, accuracy, flag: accuracy < threshold ? 'needs_revision' : 'strong' };
    }).sort((a, b) => a.accuracy - b.accuracy);

    res.json({
      threshold,
      strengths: breakdown.filter(t => t.flag === 'strong'),
      weaknesses: breakdown.filter(t => t.flag === 'needs_revision'),
      all: breakdown,
    });
  } catch (err) { next(err); }
}

// Grade subjective questions for a submission (teacher view).
// Body: { marks: { question_id: numeric_mark } }
async function gradeSubjective(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { submission_id } = req.params;
    const { marks } = req.body;

    if (!marks || typeof marks !== 'object') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'marks object is required' });
    }

    const sub = await client.query('SELECT test_id, student_id, subjective_marks, answers FROM test_submissions WHERE id = $1', [submission_id]);
    if (sub.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Submission not found' });
    }
    const testId = sub.rows[0].test_id;

    if (!(await hasTestAccess(req.user, testId))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this test' });
    }

    const currentMarks = sub.rows[0].subjective_marks || {};
    const updatedMarks = { ...currentMarks, ...marks };
    const answers = sub.rows[0].answers || {};

    const mcqQuestions = await client.query(
      `SELECT q.id, q.correct_index, q.marks, q.negative_marks
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 AND q.type = 'mcq'`,
      [testId]
    );

    let newScore = 0;
    for (const q of mcqQuestions.rows) {
      const ans = answers[q.id];
      if (ans === undefined || ans === null) continue;
      if (ans === q.correct_index) newScore += q.marks;
      else newScore -= q.negative_marks;
    }
    
    for (const qId of Object.keys(updatedMarks)) {
      newScore += (Number(updatedMarks[qId]) || 0);
    }
    newScore = Math.max(0, newScore);

    await client.query(
      'UPDATE test_submissions SET subjective_marks = $1, score = $2 WHERE id = $3',
      [JSON.stringify(updatedMarks), newScore, submission_id]
    );

    await recomputeRanks(client, testId);

    await client.query('COMMIT');
    res.json({ message: 'Subjective marks updated', score: newScore, subjective_marks: updatedMarks });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function attempts(req, res, next) {
  try {
    const { test_id } = req.params;
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });
    
    const result = await db.query(
      `SELECT id, score, max_marks, rank, submitted_at, time_taken_min, attempt_number
       FROM test_submissions
       WHERE test_id = $1 AND student_id = $2
       ORDER BY attempt_number DESC`,
      [test_id, student.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function resultDetail(req, res, next) {
  try {
    const { test_id } = req.params;
    let studentId;
    if (req.user.role === 'student') {
      const student = await getStudentForUser(req.user.id);
      if (!student) return res.status(403).json({ error: 'Student not found' });
      studentId = student.id;
    } else {
      studentId = req.query.student_id;
    }

    if (!studentId) return res.status(400).json({ error: 'student_id required' });

    const subQuery = await db.query(
      `SELECT * FROM test_submissions WHERE test_id = $1 AND student_id = $2 ORDER BY attempt_number DESC LIMIT 1`,
      [test_id, studentId]
    );
    if (subQuery.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const sub = subQuery.rows[0];

    const qQuery = await db.query(
      `SELECT q.id, q.subject, q.chapter, q.difficulty, q.correct_index, q.marks, q.negative_marks, q.type, q.text, q.options, tq.position
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 ORDER BY tq.position`,
      [test_id]
    );

    let correct = 0, wrong = 0, skipped = 0;
    const questions = qQuery.rows.map(q => {
      const ans = sub.answers ? sub.answers[q.id] : null;
      let status = 'skipped';
      if (ans !== null && ans !== undefined) {
        if (ans === q.correct_index) { status = 'correct'; correct++; }
        else { status = 'wrong'; wrong++; }
      } else {
        skipped++;
      }
      return { ...q, student_answer: ans, status };
    });

    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
    const avgTime = sub.time_taken_min ? Math.round((sub.time_taken_min * 60) / questions.length) : 0;

    const breakdown = {};
    questions.forEach(q => {
      const key = q.subject || 'General';
      if (!breakdown[key]) breakdown[key] = { correct: 0, total: 0 };
      breakdown[key].total++;
      if (q.status === 'correct') breakdown[key].correct++;
    });

    res.json({
      submission: sub,
      stats: {
        total_questions: questions.length,
        correct, wrong, skipped, accuracy,
        time_taken_min: sub.time_taken_min || 0,
        avg_time_sec: avgTime
      },
      breakdown,
      questions
    });
  } catch(e) { next(e); }
}

module.exports = { create, list, listForStudent, getForStudent, submit, results, analysis, gradeSubjective, attempts, resultDetail };
