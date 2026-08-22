const db = require('../config/db');
const { hasInstituteAccess, hasBatchAccess, getStudentForUser, hasStudentAccess } = require('../utils/access');
const { dispatch, resultAnnouncementBody } = require('../services/notifications');

async function getInstituteName(instituteId, client = db) {
  const r = await client.query('SELECT name FROM institutes WHERE id = $1', [instituteId]);
  return r.rows[0] ? r.rows[0].name : 'Your institute';
}

async function hasTestAccess(user, testId) {
  const t = await db.query('SELECT batch_id FROM tests WHERE id = $1', [testId]);
  if (t.rows.length === 0) return false;
  return hasBatchAccess(user, t.rows[0].batch_id);
}

/**
 * Creates a test from selected question bank questions or directly parsed questions.
 */
async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const {
      institute_id,
      batch_id,
      course_id,
      title,
      subject,
      chapter,
      difficulty,
      duration_min,
      question_ids,
      raw_questions,
      number_of_questions,
      start_date,
      end_date,
      attempt_limit,
      marks_per_question,
      negative_marks_per_question
    } = req.body;

    if (!institute_id || !batch_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'institute_id and batch_id are required' });
    }

    if (!(await hasInstituteAccess(req.user, institute_id, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Default test title if not provided: "Subject Assessment — DD Mon"
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const defaultTitle = subject ? `${subject} Assessment — ${todayFormatted}` : `Assessment — ${todayFormatted}`;
    const finalTitle = (title && title.trim()) ? title.trim() : defaultTitle;

    const defaultMarks = Number(marks_per_question) > 0 ? Number(marks_per_question) : 1;
    const defaultNegMarks = Number(negative_marks_per_question) >= 0 ? Number(negative_marks_per_question) : 0;

    let selectedQuestionIds = question_ids ? [...question_ids] : [];

    // Bulk insert raw questions from the Review Questions workspace
    if (Array.isArray(raw_questions) && raw_questions.length > 0) {
      for (const q of raw_questions) {
        const qType = q.type === 'subjective' ? 'subjective' : 'mcq';
        const qMarks = Number(q.marks) > 0 ? Number(q.marks) : defaultMarks;
        const qNegMarks = Number(q.negative_marks) >= 0 ? Number(q.negative_marks) : defaultNegMarks;

        const r = await client.query(
          `INSERT INTO questions (institute_id, created_by, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty, explanation, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
          [
            institute_id,
            req.user.id,
            q.subject || subject || 'General',
            q.topic || null,
            q.chapter || chapter || null,
            qType,
            q.text,
            qType === 'mcq' ? JSON.stringify(q.options) : null,
            qType === 'mcq' && q.correct_index != null ? q.correct_index : null,
            qMarks,
            qNegMarks,
            q.difficulty || difficulty || 'medium',
            q.explanation || null,
            q.source || 'doc_import'
          ]
        );
        selectedQuestionIds.push(r.rows[0].id);
      }
    }

    // Auto-pick random questions if requested
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
        return res.status(400).json({ error: 'No questions found matching criteria in the Question Bank' });
      }
    }

    if (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one valid question is required to create a test' });
    }

    // Pull marks for the selected questions to compute total
    const q = await client.query(
      'SELECT id, marks FROM questions WHERE id = ANY($1::uuid[]) AND institute_id = $2',
      [selectedQuestionIds, institute_id]
    );
    if (q.rows.length !== selectedQuestionIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Some questions do not belong to this institute' });
    }
    const totalMarks = q.rows.reduce((s, r) => s + (Number(r.marks) || 1), 0);

    const test = await client.query(
      `INSERT INTO tests (institute_id, batch_id, course_id, created_by, title, subject, chapter, difficulty, duration_min, total_marks, start_date, end_date, attempt_limit, marks_per_question, negative_marks_per_question, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active') RETURNING *`,
      [
        institute_id,
        batch_id,
        course_id || null,
        req.user.id,
        finalTitle,
        subject || 'General',
        chapter || null,
        difficulty || 'medium',
        Number(duration_min) > 0 ? Number(duration_min) : 30,
        totalMarks,
        start_date ? new Date(start_date).toISOString() : null,
        end_date ? new Date(end_date).toISOString() : null,
        Number(attempt_limit) > 0 ? Number(attempt_limit) : 1,
        defaultMarks,
        defaultNegMarks
      ]
    );

    // Insert test questions maintaining exact order
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

/**
 * List tests for a batch (Teacher / Admin view).
 */
async function list(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS question_count,
              (SELECT COUNT(*) FROM test_submissions ts WHERE ts.test_id = t.id) AS submission_count,
              (SELECT ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks, 0)), 1) FROM test_submissions ts WHERE ts.test_id = t.id) AS avg_score_pct
       FROM tests t WHERE t.batch_id = $1 ORDER BY t.created_at DESC`,
      [batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

/**
 * List tests for student portal with real-time test window status.
 */
async function listForStudent(req, res, next) {
  try {
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });
    if (!student.batch_id) return res.json([]);

    const result = await db.query(
      `SELECT t.id, t.title, t.subject, t.chapter, t.duration_min, t.total_marks, t.status, t.created_at,
              t.start_date, t.end_date, t.attempt_limit, t.marks_per_question,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS question_count,
              (SELECT COUNT(*) FROM test_submissions ts WHERE ts.test_id = t.id AND ts.student_id = $1) AS attempts_used,
              ts.score, ts.max_marks, ts.rank, ts.submitted_at, ts.time_taken_min,
              CASE
                WHEN t.start_date IS NOT NULL AND NOW() < t.start_date THEN 'upcoming'
                WHEN t.end_date IS NOT NULL AND NOW() > t.end_date THEN 'closed'
                ELSE 'active'
              END AS window_status
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

    const enriched = result.rows.map(row => {
      const attemptsUsed = parseInt(row.attempts_used || 0, 10);
      const attemptLimit = parseInt(row.attempt_limit || 1, 10);
      const isSubmitted = attemptsUsed > 0;
      const canAttempt = attemptsUsed < attemptLimit && row.window_status === 'active' && row.status === 'active';

      return {
        ...row,
        attempts_used: attemptsUsed,
        attempt_limit: attemptLimit,
        submitted: isSubmitted,
        can_attempt: canAttempt,
        status_label: row.window_status === 'upcoming' 
          ? 'Upcoming' 
          : row.window_status === 'closed' 
            ? 'Closed' 
            : isSubmitted 
              ? 'Completed' 
              : 'Available'
      };
    });

    res.json(enriched);
  } catch (err) { next(err); }
}

/**
 * Full test delivery for active examination.
 * STRICT SECURITY: Never expose correct_index or explanation before submission!
 */
async function getForStudent(req, res, next) {
  try {
    const { test_id } = req.params;
    const test = await db.query('SELECT * FROM tests WHERE id = $1', [test_id]);
    if (test.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    const testRow = test.rows[0];

    let attemptsUsed = 0;
    let lastSubmission = null;

    // Authorization & Window check
    if (req.user.role === 'student') {
      const student = await getStudentForUser(req.user.id);
      if (!student || student.batch_id !== testRow.batch_id) {
        return res.status(403).json({ error: 'Not enrolled in this test\'s batch' });
      }

      // Check upcoming window
      if (testRow.start_date && new Date() < new Date(testRow.start_date)) {
        return res.status(400).json({ error: `This test will open on ${new Date(testRow.start_date).toLocaleString()}` });
      }
      // Check closed window
      if (testRow.end_date && new Date() > new Date(testRow.end_date)) {
        return res.status(400).json({ error: 'This test window has closed.' });
      }

      // Check existing attempts
      const prevSub = await db.query(
        `SELECT id, score, max_marks, rank, submitted_at, time_taken_min, attempt_number
         FROM test_submissions WHERE test_id = $1 AND student_id = $2 ORDER BY attempt_number DESC LIMIT 1`,
        [test_id, student.id]
      );
      if (prevSub.rows.length > 0) {
        attemptsUsed = prevSub.rows[0].attempt_number;
        lastSubmission = prevSub.rows[0];
      }
    } else if (!(await hasBatchAccess(req.user, testRow.batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }

    // Retrieve questions WITHOUT correct answers
    const questions = await db.query(
      `SELECT q.id, q.subject, q.topic, q.type, q.text, q.options, q.marks, q.negative_marks, tq.position
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 ORDER BY tq.position`,
      [test_id]
    );

    // Sanitize test row to remove internal sensitive data
    const sanitizedTest = {
      id: testRow.id,
      title: testRow.title,
      subject: testRow.subject,
      chapter: testRow.chapter,
      difficulty: testRow.difficulty,
      duration_min: testRow.duration_min,
      total_marks: testRow.total_marks,
      attempt_limit: testRow.attempt_limit,
      start_date: testRow.start_date,
      end_date: testRow.end_date,
    };

    const isCompleted = attemptsUsed >= (testRow.attempt_limit || 1);

    res.json({
      test: sanitizedTest,
      questions: questions.rows,
      already_completed: isCompleted,
      attempts_used: attemptsUsed,
      submission: lastSubmission
    });
  } catch (err) { next(err); }
}

/**
 * Student submits test attempt -> Instant objective evaluation & security event logging.
 */
async function submit(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { test_id } = req.params;
    const { answers, time_taken_min, security_events, auto_submitted } = req.body;

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

    // Check attempt limits
    const prevAttempts = await client.query(
      'SELECT MAX(attempt_number) as max_attempt FROM test_submissions WHERE test_id = $1 AND student_id = $2',
      [test_id, student.id]
    );
    const prevMax = prevAttempts.rows[0].max_attempt || 0;
    const attempt_number = prevMax + 1;
    
    if (attempt_number > testRow.attempt_limit) {
      await client.query('ROLLBACK');
      const lastSub = await db.query(
        `SELECT id, score, max_marks, rank, submitted_at, time_taken_min, attempt_number
         FROM test_submissions WHERE test_id = $1 AND student_id = $2 ORDER BY attempt_number DESC LIMIT 1`,
        [test_id, student.id]
      );
      return res.status(400).json({
        error: 'Attempt limit reached for this test',
        already_completed: true,
        submission: lastSub.rows[0] || null
      });
    }

    // Auto-grade objective MCQs against correct_index
    const questions = await client.query(
      `SELECT q.id, q.correct_index, q.marks, q.negative_marks, q.type
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1`,
      [test_id]
    );

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    for (const q of questions.rows) {
      if (q.type !== 'mcq') continue;
      const ans = answers ? answers[q.id] : undefined;
      if (ans === undefined || ans === null) {
        skippedCount++;
        continue;
      }
      if (Number(ans) === Number(q.correct_index)) {
        score += (Number(q.marks) || 1);
        correctCount++;
      } else {
        score -= (Number(q.negative_marks) || 0);
        wrongCount++;
      }
    }
    score = Math.max(0, score);
    const attemptedCount = correctCount + wrongCount;
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    // Record submission with anti-cheat audit log
    const submission = await client.query(
      `INSERT INTO test_submissions (test_id, student_id, answers, score, max_marks, attempt_number, time_taken_min, security_events, auto_submitted, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', now())
       ON CONFLICT (test_id, student_id, attempt_number)
       DO UPDATE SET
         answers = EXCLUDED.answers,
         score = EXCLUDED.score,
         time_taken_min = EXCLUDED.time_taken_min,
         security_events = EXCLUDED.security_events,
         auto_submitted = EXCLUDED.auto_submitted,
         status = 'submitted',
         submitted_at = now()
       RETURNING *`,
      [
        test_id,
        student.id,
        JSON.stringify(answers || {}),
        score,
        testRow.total_marks,
        attempt_number,
        time_taken_min || 0,
        JSON.stringify(security_events || []),
        Boolean(auto_submitted)
      ]
    );

    // Recompute ranks for the test
    await recomputeRanks(client, test_id);

    const ranked = await client.query(
      'SELECT rank FROM test_submissions WHERE test_id = $1 AND student_id = $2 AND attempt_number = $3',
      [test_id, student.id, attempt_number]
    );

    await client.query('COMMIT');

    // Notify parent via WhatsApp / SMS if configured (non-blocking)
    try {
      const contact = await db.query(
        `SELECT u.full_name AS student_name, p.phone AS parent_phone, p.id AS parent_user_id
         FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN users p ON s.parent_user_id = p.id
         WHERE s.id = $1`,
        [student.id]
      );
      const c = contact.rows[0];
      if (c && c.parent_phone) {
        const instituteName = await getInstituteName(testRow.institute_id);
        dispatch({
          instituteId: testRow.institute_id,
          channel: 'whatsapp',
          category: 'result_announcement',
          recipients: [{
            phone: c.parent_phone,
            user_id: c.parent_user_id,
            body: resultAnnouncementBody(instituteName, {
              test_title: testRow.title,
              student_name: c.student_name,
              score,
              max_marks: testRow.total_marks,
              rank: ranked.rows[0]?.rank,
            }),
          }],
          createdBy: student.user_id || null,
        }).catch(() => {});
      }
    } catch {}

    res.json({
      message: 'Test submitted and auto-evaluated successfully',
      submission_id: submission.rows[0].id,
      score,
      max_marks: testRow.total_marks,
      rank: ranked.rows[0]?.rank,
      time_taken_min: time_taken_min || 0,
      stats: {
        total_questions: questions.rows.length,
        correct: correctCount,
        wrong: wrongCount,
        skipped: skippedCount,
        accuracy
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * Auto-rank test submissions by score descending.
 */
async function recomputeRanks(client, testId) {
  await client.query(
    `UPDATE test_submissions ts
     SET rank = r.rnk
     FROM (
       SELECT id, DENSE_RANK() OVER (ORDER BY score DESC, time_taken_min ASC) AS rnk
       FROM test_submissions WHERE test_id = $1
     ) r
     WHERE ts.id = r.id AND ts.test_id = $1`,
    [testId]
  );
}

/**
 * Detailed Learning Assessment Report for a student attempt.
 * Includes scorecard, question review, and deterministic learning insights.
 */
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

    if (!studentId) return res.status(400).json({ error: 'student_id is required' });

    // Fetch latest submission for this student on this test
    const subQuery = await db.query(
      `SELECT ts.*, u.full_name AS student_name
       FROM test_submissions ts
       JOIN students s ON ts.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ts.test_id = $1 AND ts.student_id = $2
       ORDER BY ts.attempt_number DESC LIMIT 1`,
      [test_id, studentId]
    );

    if (subQuery.rows.length === 0) {
      return res.status(404).json({ error: 'No submission found for this test' });
    }
    const sub = subQuery.rows[0];

    // Fetch test details
    const testQuery = await db.query('SELECT * FROM tests WHERE id = $1', [test_id]);
    const test = testQuery.rows[0];

    // Fetch all test questions with correct_index revealed for post-submission review
    const qQuery = await db.query(
      `SELECT q.id, q.subject, q.topic, q.chapter, q.difficulty, q.correct_index, q.marks, q.negative_marks, q.type, q.text, q.options, q.explanation, tq.position
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 ORDER BY tq.position`,
      [test_id]
    );

    let correct = 0, wrong = 0, skipped = 0;
    const questions = qQuery.rows.map(q => {
      const ans = (sub.answers && sub.answers[q.id] !== undefined && sub.answers[q.id] !== null) 
        ? Number(sub.answers[q.id]) 
        : null;

      let status = 'skipped';
      let marksEarned = 0;

      if (ans !== null) {
        if (ans === q.correct_index) {
          status = 'correct';
          marksEarned = Number(q.marks) || 1;
          correct++;
        } else {
          status = 'wrong';
          marksEarned = -(Number(q.negative_marks) || 0);
          wrong++;
        }
      } else {
        skipped++;
      }

      return {
        ...q,
        student_answer: ans,
        status,
        marks_earned: marksEarned
      };
    });

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const percentage = sub.max_marks > 0 ? Math.round((sub.score / sub.max_marks) * 100) : 0;
    const avgTimeSec = questions.length > 0 ? Math.round(((sub.time_taken_min || 1) * 60) / questions.length) : 0;

    // Subject & Topic breakdown
    const subjectBreakdown = {};
    const topicBreakdown = {};

    questions.forEach(q => {
      const subj = q.subject || 'General';
      if (!subjectBreakdown[subj]) subjectBreakdown[subj] = { subject: subj, total: 0, correct: 0, wrong: 0, skipped: 0 };
      subjectBreakdown[subj].total++;
      if (q.status === 'correct') subjectBreakdown[subj].correct++;
      else if (q.status === 'wrong') subjectBreakdown[subj].wrong++;
      else subjectBreakdown[subj].skipped++;

      if (q.topic) {
        if (!topicBreakdown[q.topic]) topicBreakdown[q.topic] = { topic: q.topic, total: 0, correct: 0, wrong: 0 };
        topicBreakdown[q.topic].total++;
        if (q.status === 'correct') topicBreakdown[q.topic].correct++;
        else if (q.status === 'wrong') topicBreakdown[q.topic].wrong++;
      }
    });

    // Generate Deterministic Learning Insights (Rule-Based Heuristics)
    const insights = [];

    // Accuracy heuristic
    if (accuracy >= 85) {
      insights.push({
        type: 'strength',
        title: 'Outstanding Accuracy',
        message: `You maintained an exceptional accuracy of ${accuracy}%, demonstrating high subject precision.`
      });
    } else if (accuracy < 50 && attempted > 0) {
      insights.push({
        type: 'warning',
        title: 'Accuracy Focus Needed',
        message: `Your accuracy was ${accuracy}%. Review options carefully before submitting to minimize penalties.`
      });
    }

    // Pacing heuristic
    if (avgTimeSec < 25 && questions.length >= 5) {
      insights.push({
        type: 'tip',
        title: 'Pacing Check',
        message: `Average time of ${avgTimeSec}s per question indicates fast answering. Ensure you double-check calculations.`
      });
    } else if (avgTimeSec > 120) {
      insights.push({
        type: 'tip',
        title: 'Time Management',
        message: `Average time was ${avgTimeSec}s per question. Practice timed problem sets to boost speed.`
      });
    }

    // Topic mastery insights
    const strongTopics = Object.values(topicBreakdown).filter(t => t.total >= 2 && (t.correct / t.total) >= 0.75);
    const weakTopics = Object.values(topicBreakdown).filter(t => t.total >= 2 && (t.correct / t.total) < 0.5);

    if (strongTopics.length > 0) {
      insights.push({
        type: 'strength',
        title: 'Strong Concept Mastery',
        message: `Excellent performance in: ${strongTopics.map(t => t.topic).join(', ')}.`
      });
    }
    if (weakTopics.length > 0) {
      insights.push({
        type: 'improvement',
        title: 'Recommended Revision Areas',
        message: `Focus revision on: ${weakTopics.map(t => t.topic).join(', ')}.`
      });
    }

    res.json({
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        duration_min: test.duration_min,
        total_marks: test.total_marks
      },
      submission: {
        id: sub.id,
        student_id: sub.student_id,
        student_name: sub.student_name,
        score: sub.score,
        max_marks: sub.max_marks,
        percentage,
        rank: sub.rank,
        attempt_number: sub.attempt_number,
        time_taken_min: sub.time_taken_min,
        submitted_at: sub.submitted_at,
        security_events: sub.security_events || []
      },
      stats: {
        total_questions: questions.length,
        correct,
        wrong,
        skipped,
        accuracy,
        avg_time_sec: avgTimeSec
      },
      subject_breakdown: Object.values(subjectBreakdown).map(s => ({
        ...s,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
      })),
      topic_breakdown: Object.values(topicBreakdown).map(t => ({
        ...t,
        accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
      })),
      insights,
      questions
    });
  } catch (err) { next(err); }
}

/**
 * Batch Assessment Dashboard & Item-Level Question Quality Analytics (Teacher view).
 */
async function batchAnalytics(req, res, next) {
  try {
    const { test_id } = req.params;
    if (!(await hasTestAccess(req.user, test_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }

    const testRes = await db.query('SELECT * FROM tests WHERE id = $1', [test_id]);
    if (testRes.rows.length === 0) return res.status(404).json({ error: 'Test not found' });
    const test = testRes.rows[0];

    // Batch enrollment count
    const batchStudents = await db.query(
      'SELECT COUNT(*) as count FROM students WHERE batch_id = $1',
      [test.batch_id]
    );
    const totalEnrolled = parseInt(batchStudents.rows[0].count || 0, 10);

    // All submissions for this test
    const subs = await db.query(
      `SELECT ts.*, u.full_name AS student_name,
              ROUND(100.0 * ts.score / NULLIF(ts.max_marks, 0), 1) AS percentage
       FROM test_submissions ts
       JOIN students s ON ts.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ts.test_id = $1
       ORDER BY ts.score DESC, ts.time_taken_min ASC`,
      [test_id]
    );

    const attemptedCount = subs.rows.length;
    const unattemptedCount = Math.max(0, totalEnrolled - attemptedCount);
    const participationRate = totalEnrolled > 0 ? Math.round((attemptedCount / totalEnrolled) * 100) : 0;

    // Aggregate overall metrics
    let totalScorePct = 0;
    let highestScore = 0;
    let lowestScore = attemptedCount > 0 ? 100 : 0;
    let passCount = 0;

    const distribution = { '0-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };

    subs.rows.forEach(r => {
      const pct = Number(r.percentage) || 0;
      totalScorePct += pct;
      if (pct > highestScore) highestScore = pct;
      if (pct < lowestScore) lowestScore = pct;
      if (pct >= 40) passCount++;

      if (pct <= 40) distribution['0-40%']++;
      else if (pct <= 60) distribution['41-60%']++;
      else if (pct <= 80) distribution['61-80%']++;
      else distribution['81-100%']++;
    });

    const avgScorePct = attemptedCount > 0 ? Math.round(totalScorePct / attemptedCount) : 0;
    const passRate = attemptedCount > 0 ? Math.round((passCount / attemptedCount) * 100) : 0;

    // Item-Level Question Quality Analytics
    const questionsRes = await db.query(
      `SELECT q.id, q.subject, q.topic, q.chapter, q.type, q.text, q.options, q.correct_index, q.marks, tq.position
       FROM test_questions tq JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1 ORDER BY tq.position`,
      [test_id]
    );

    const questionQuality = questionsRes.rows.map(q => {
      let qAttempts = 0;
      let qCorrect = 0;
      let qWrong = 0;
      let qSkipped = 0;

      subs.rows.forEach(s => {
        const ans = s.answers ? s.answers[q.id] : undefined;
        if (ans === undefined || ans === null) {
          qSkipped++;
        } else {
          qAttempts++;
          if (Number(ans) === Number(q.correct_index)) {
            qCorrect++;
          } else {
            qWrong++;
          }
        }
      });

      const totalResponses = attemptedCount;
      const correctPct = totalResponses > 0 ? Math.round((qCorrect / totalResponses) * 100) : 0;
      const wrongPct = totalResponses > 0 ? Math.round((qWrong / totalResponses) * 100) : 0;
      const skippedPct = totalResponses > 0 ? Math.round((qSkipped / totalResponses) * 100) : 0;

      // Empirical difficulty determined from actual student error rates
      let empiricalDifficulty = 'Medium';
      if (correctPct >= 75) empiricalDifficulty = 'Easy';
      else if (correctPct < 40) empiricalDifficulty = 'Hard';

      // Flag problematic questions (>70% wrong)
      const isProblematic = wrongPct > 70 && attemptedCount >= 3;

      return {
        id: q.id,
        position: q.position + 1,
        text_preview: q.text.length > 80 ? `${q.text.substring(0, 80)}...` : q.text,
        subject: q.subject,
        topic: q.topic,
        marks: q.marks,
        attempts: qAttempts,
        correct_count: qCorrect,
        wrong_count: qWrong,
        skipped_count: qSkipped,
        correct_pct: correctPct,
        wrong_pct: wrongPct,
        skipped_pct: skippedPct,
        empirical_difficulty: empiricalDifficulty,
        is_problematic: isProblematic,
        alert_message: isProblematic ? `High failure rate: ${wrongPct}% of students answered incorrectly.` : null
      };
    });

    // Digital Scoreboard with suspicious activity warning flags
    const scoreboard = subs.rows.map((s, idx) => {
      const securityEvents = Array.isArray(s.security_events) ? s.security_events : [];
      return {
        rank: s.rank || (idx + 1),
        submission_id: s.id,
        student_id: s.student_id,
        student_name: s.student_name,
        score: s.score,
        max_marks: s.max_marks,
        percentage: Number(s.percentage),
        time_taken_min: s.time_taken_min,
        submitted_at: s.submitted_at,
        security_warnings_count: securityEvents.length,
        has_violations: securityEvents.length > 0,
        auto_submitted: Boolean(s.auto_submitted)
      };
    });

    res.json({
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        duration_min: test.duration_min,
        total_marks: test.total_marks,
        status: test.status
      },
      overview: {
        total_enrolled: totalEnrolled,
        attempted_count: attemptedCount,
        unattempted_count: unattemptedCount,
        participation_rate: participationRate,
        avg_score_pct: avgScorePct,
        highest_score: highestScore,
        lowest_score: lowestScore,
        pass_rate: passRate
      },
      score_distribution: Object.keys(distribution).map(k => ({
        range: k,
        count: distribution[k]
      })),
      question_quality: questionQuality,
      scoreboard
    });
  } catch (err) { next(err); }
}

/**
 * Scoreboard list (Teacher view).
 */
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

/**
 * SWOT / Concept-gap analysis batch-wide.
 */
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
      const key = q.topic || q.subject || 'General';
      if (!topics[key]) topics[key] = { topic: key, subject: q.subject, attempts: 0, correct: 0 };
      for (const sub of subs.rows) {
        const ans = sub.answers ? sub.answers[q.id] : undefined;
        if (ans === undefined || ans === null) continue;
        topics[key].attempts++;
        if (Number(ans) === Number(q.correct_index)) topics[key].correct++;
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
      breakdown
    });
  } catch (err) { next(err); }
}

/**
 * Individual Student Assessment Report Card.
 */
async function studentReportCard(req, res, next) {
  try {
    const { student_id } = req.params;

    if (!(await hasStudentAccess(req.user, student_id))) {
      return res.status(403).json({ error: 'Not authorized to view this student report' });
    }

    const studentInfo = await db.query(
      `SELECT s.id, s.roll_number, u.full_name, u.email, u.phone, b.name as batch_name, b.id as batch_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.id = $1`,
      [student_id]
    );

    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentInfo.rows[0];

    // All tests taken by this student
    const submissions = await db.query(
      `SELECT ts.id, ts.test_id, ts.score, ts.max_marks, ts.rank, ts.submitted_at, ts.time_taken_min, ts.attempt_number,
              t.title AS test_title, t.subject, t.duration_min,
              ROUND(100.0 * ts.score / NULLIF(ts.max_marks, 0), 1) AS percentage
       FROM test_submissions ts
       JOIN tests t ON ts.test_id = t.id
       WHERE ts.student_id = $1
       ORDER BY ts.submitted_at DESC`,
      [student_id]
    );

    const testHistory = submissions.rows;
    const testsTaken = testHistory.length;

    let avgScorePct = 0;
    let highestScorePct = 0;
    let avgTimeMin = 0;

    if (testsTaken > 0) {
      const totalPct = testHistory.reduce((sum, t) => sum + Number(t.percentage || 0), 0);
      avgScorePct = Math.round(totalPct / testsTaken);
      highestScorePct = Math.max(...testHistory.map(t => Number(t.percentage || 0)));
      const totalTime = testHistory.reduce((sum, t) => sum + Number(t.time_taken_min || 0), 0);
      avgTimeMin = Math.round((totalTime / testsTaken) * 10) / 10;
    }

    // Performance by Subject
    const subjectsMap = {};
    testHistory.forEach(t => {
      const subj = t.subject || 'General';
      if (!subjectsMap[subj]) subjectsMap[subj] = { subject: subj, count: 0, totalPct: 0 };
      subjectsMap[subj].count++;
      subjectsMap[subj].totalPct += Number(t.percentage || 0);
    });

    const subjectPerformance = Object.values(subjectsMap).map(s => ({
      subject: s.subject,
      tests_count: s.count,
      avg_percentage: Math.round(s.totalPct / s.count)
    }));

    // Score progression trend
    const trend = [...testHistory].reverse().map((t, idx) => ({
      index: idx + 1,
      test_title: t.test_title,
      date: t.submitted_at,
      score: t.score,
      percentage: Number(t.percentage),
      rank: t.rank
    }));

    res.json({
      student,
      metrics: {
        tests_taken: testsTaken,
        avg_score_pct: avgScorePct,
        highest_score_pct: highestScorePct,
        avg_time_min: avgTimeMin
      },
      subject_performance: subjectPerformance,
      trend,
      test_history: testHistory
    });
  } catch (err) { next(err); }
}

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

    const sub = await client.query(
      'SELECT test_id, student_id, subjective_marks, answers FROM test_submissions WHERE id = $1',
      [submission_id]
    );
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
      if (Number(ans) === Number(q.correct_index)) newScore += (Number(q.marks) || 1);
      else newScore -= (Number(q.negative_marks) || 0);
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

async function updateStatus(req, res, next) {
  try {
    const { test_id } = req.params;
    const { status } = req.body;
    if (!['draft', 'active', 'completed', 'archived', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (!(await hasTestAccess(req.user, test_id))) {
      return res.status(403).json({ error: 'Not authorized for this test' });
    }
    await db.query('UPDATE tests SET status = $1, updated_at = now() WHERE id = $2', [status, test_id]);
    res.json({ message: `Test status updated to ${status}` });
  } catch (err) { next(err); }
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

module.exports = {
  create,
  list,
  listForStudent,
  getForStudent,
  submit,
  results,
  analysis,
  batchAnalytics,
  studentReportCard,
  gradeSubjective,
  updateStatus,
  attempts,
  resultDetail
};
