const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { parseEducationalText } = require('../services/questionParser');
const { extractDocumentText } = require('../services/docExtractor');

async function create(req, res, next) {
  try {
    const { institute_id, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty, explanation, source } = req.body;
    if (!institute_id || !subject || !text) {
      return res.status(400).json({ error: 'institute_id, subject and text are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const qType = type === 'subjective' ? 'subjective' : 'mcq';
    if (qType === 'mcq') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'MCQ questions need at least 2 options' });
      }
      if (correct_index == null || correct_index < 0 || correct_index >= options.length) {
        return res.status(400).json({ error: 'correct_index must point to a valid option' });
      }
    }
    const result = await db.query(
      `INSERT INTO questions (institute_id, created_by, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty, explanation, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [institute_id, req.user.id, subject, topic || null, chapter || null, qType, text,
       qType === 'mcq' ? JSON.stringify(options) : null,
       qType === 'mcq' ? correct_index : null,
       marks || 1, negative_marks || 0, difficulty || 'medium',
       explanation || null, source || 'manual']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// Bulk import questions into the question bank.
async function bulkCreate(req, res, next) {
  const client = await db.pool.connect();
  try {
    const { institute_id, questions } = req.body;
    if (!institute_id || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'institute_id and a non-empty questions array are required' });
    }
    if (questions.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 questions per import' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Validate questions before inserting
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || !q.text) {
        return res.status(400).json({ error: `Question ${i + 1}: question text is required` });
      }
      const qType = q.type === 'subjective' ? 'subjective' : 'mcq';
      if (qType === 'mcq') {
        if (!Array.isArray(q.options) || q.options.filter(o => o != null && String(o).trim()).length < 2) {
          return res.status(400).json({ error: `Question ${i + 1}: MCQ questions need at least 2 non-empty options` });
        }
        if (q.correct_index != null && (q.correct_index < 0 || q.correct_index >= q.options.length)) {
          return res.status(400).json({ error: `Question ${i + 1}: correct_index must point to a valid option` });
        }
      }
    }

    await client.query('BEGIN');
    const created = [];
    for (const q of questions) {
      const qType = q.type === 'subjective' ? 'subjective' : 'mcq';
      const r = await client.query(
        `INSERT INTO questions (institute_id, created_by, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty, explanation, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [institute_id, req.user.id, q.subject || 'General', q.topic || null, q.chapter || null, qType, q.text,
         qType === 'mcq' ? JSON.stringify(q.options) : null,
         qType === 'mcq' && q.correct_index != null ? q.correct_index : null,
         q.marks || 1, q.negative_marks || 0, q.difficulty || 'medium',
         q.explanation || null, q.source || 'doc_import']
      );
      created.push(r.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ created: created.length, questions: created });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM questions WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    const q = existing.rows[0];
    if (!(await hasInstituteAccess(req.user, q.institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const { subject, topic, chapter, text, options, correct_index, marks, negative_marks, difficulty, explanation } = req.body;
    const newOptions = options !== undefined ? options : q.options;
    const newCorrect = correct_index !== undefined ? correct_index : q.correct_index;
    if (q.type === 'mcq') {
      if (!Array.isArray(newOptions) || newOptions.length < 2) {
        return res.status(400).json({ error: 'MCQ questions need at least 2 options' });
      }
      if (newCorrect != null && (newCorrect < 0 || newCorrect >= newOptions.length)) {
        return res.status(400).json({ error: 'correct_index must point to a valid option' });
      }
    }
    const result = await db.query(
      `UPDATE questions SET
         subject = COALESCE($2, subject),
         topic = $3,
         chapter = $4,
         text = COALESCE($5, text),
         options = $6,
         correct_index = $7,
         marks = COALESCE($8, marks),
         negative_marks = COALESCE($9, negative_marks),
         difficulty = COALESCE($10, difficulty),
         explanation = COALESCE($11, explanation)
       WHERE id = $1 RETURNING *`,
      [id, subject || null, topic !== undefined ? (topic || null) : q.topic,
       chapter !== undefined ? (chapter || null) : q.chapter,
       text || null,
       q.type === 'mcq' ? JSON.stringify(newOptions) : null,
       q.type === 'mcq' ? newCorrect : null,
       marks || null, negative_marks !== undefined ? negative_marks : null, difficulty || null,
       explanation !== undefined ? (explanation || null) : q.explanation]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const { subject, topic, difficulty, search } = req.query;
    const conditions = ['institute_id = $1'];
    const params = [institute_id];
    if (subject) { params.push(subject); conditions.push(`subject = $${params.length}`); }
    if (topic) { params.push(topic); conditions.push(`topic = $${params.length}`); }
    if (difficulty) { params.push(difficulty); conditions.push(`difficulty = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`text ILIKE $${params.length}`);
    }
    const result = await db.query(
      `SELECT * FROM questions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT institute_id, created_by FROM questions WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    const q = existing.rows[0];

    let canDelete = (q.created_by === req.user.id);
    if (!canDelete && req.user.role === 'institute_admin') {
      const i = await db.query('SELECT id FROM institutes WHERE id = $1 AND admin_id = $2', [q.institute_id, req.user.id]);
      if (i.rows.length > 0) canDelete = true;
    }

    if (!canDelete) return res.status(403).json({ error: 'Not authorized to delete this question' });
    
    await db.query('DELETE FROM questions WHERE id = $1', [id]);
    res.json({ message: 'Question deleted' });
  } catch (err) { next(err); }
}

async function taxonomy(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT subject, array_agg(DISTINCT topic) FILTER (WHERE topic IS NOT NULL) AS topics,
              COUNT(*) AS question_count
       FROM questions WHERE institute_id = $1 GROUP BY subject ORDER BY subject`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

/**
 * Multi-format document upload (PDF, DOCX, TXT)
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded. Please select a PDF or DOCX file.' });
    }

    const { subject, marks_per_question, negative_marks } = req.body;
    const defaultSubject = subject || 'General';
    const defaultMarks = Number(marks_per_question) || 1;
    const defaultNeg = Number(negative_marks) || 0;

    // Extract text from document buffer (ephemeral memory)
    const extractedText = await extractDocumentText(req.file);

    // Parse into structured questions using deterministic pipeline
    const parseResult = parseEducationalText(extractedText, defaultSubject, defaultMarks, defaultNeg);

    res.json({
      success: true,
      questions: parseResult.questions,
      stats: parseResult.stats,
      metadata: {
        ...parseResult.metadata,
        filename: req.file.originalname,
        filesize: req.file.size
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Text extraction endpoint for pasted educational content
 */
async function extractText(req, res, next) {
  try {
    const { text, subject, marks_per_question, negative_marks } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    const defaultSubject = subject || 'General';
    const defaultMarks = Number(marks_per_question) || 1;
    const defaultNeg = Number(negative_marks) || 0;

    const parseResult = parseEducationalText(text, defaultSubject, defaultMarks, defaultNeg);

    res.json({
      success: true,
      questions: parseResult.questions,
      stats: parseResult.stats,
      metadata: parseResult.metadata
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  bulkCreate,
  update,
  list,
  remove,
  taxonomy,
  uploadDocument,
  uploadPdf: uploadDocument, // backward compatible
  extractText
};
