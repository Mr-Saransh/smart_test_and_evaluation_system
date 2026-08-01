const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');

async function create(req, res, next) {
  try {
    const { institute_id, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty } = req.body;
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
      `INSERT INTO questions (institute_id, created_by, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [institute_id, req.user.id, subject, topic || null, chapter || null, qType, text,
       qType === 'mcq' ? JSON.stringify(options) : null,
       qType === 'mcq' ? correct_index : null,
       marks || 4, negative_marks || 0, difficulty || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// Bulk import (doc upload). Questions arrive pre-parsed from the client.
// correct_index may be null — the answer can be set later via update().
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
    // Validate everything up front so an import is all-or-nothing.
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || !q.subject || !q.text) {
        return res.status(400).json({ error: `Question ${i + 1}: subject and text are required` });
      }
      const qType = q.type === 'subjective' ? 'subjective' : 'mcq';
      if (qType === 'mcq') {
        if (!Array.isArray(q.options) || q.options.filter(o => o != null && String(o).trim()).length < 2) {
          return res.status(400).json({ error: `Question ${i + 1}: MCQ questions need at least 2 options` });
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
        `INSERT INTO questions (institute_id, created_by, subject, topic, chapter, type, text, options, correct_index, marks, negative_marks, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [institute_id, req.user.id, q.subject, q.topic || null, q.chapter || null, qType, q.text,
         qType === 'mcq' ? JSON.stringify(q.options) : null,
         qType === 'mcq' && q.correct_index != null ? q.correct_index : null,
         q.marks || 4, q.negative_marks || 0, q.difficulty || 'medium']
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

// Update a question — mainly used to set/fix the correct answer after a bulk
// import, but also allows editing text/options/metadata.
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM questions WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    const q = existing.rows[0];
    if (!(await hasInstituteAccess(req.user, q.institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const { subject, topic, chapter, text, options, correct_index, marks, negative_marks, difficulty } = req.body;
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
         difficulty = COALESCE($10, difficulty)
       WHERE id = $1 RETURNING *`,
      [id, subject || null, topic !== undefined ? (topic || null) : q.topic,
       chapter !== undefined ? (chapter || null) : q.chapter,
       text || null,
       q.type === 'mcq' ? JSON.stringify(newOptions) : null,
       q.type === 'mcq' ? newCorrect : null,
       marks || null, negative_marks !== undefined ? negative_marks : null, difficulty || null]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// List with optional subject / topic / difficulty filters.
async function list(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const { subject, topic, difficulty } = req.query;
    const conditions = ['institute_id = $1'];
    const params = [institute_id];
    if (subject) { params.push(subject); conditions.push(`subject = $${params.length}`); }
    if (topic) { params.push(topic); conditions.push(`topic = $${params.length}`); }
    if (difficulty) { params.push(difficulty); conditions.push(`difficulty = $${params.length}`); }
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

// Distinct subjects + topics, for building filters / SWOT taxonomy on the client.
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

// PDF upload endpoint
async function uploadPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Polyfill missing browser APIs in Vercel Node runtime for pdf.js
    if (typeof global.DOMMatrix === 'undefined') global.DOMMatrix = class DOMMatrix {};
    if (typeof global.ImageData === 'undefined') global.ImageData = class ImageData {};
    if (typeof global.Path2D === 'undefined') global.Path2D = class Path2D {};
    
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    // Rule-based regex parser
    // Matches "1. Question text"
    // "A) Option A"
    // "B) Option B"
    // "Ans: A" or "Answer: A"
    const questions = [];
    const blocks = text.split(/\n(?=\d+\.)/); // split by "1.", "2."

    for (const block of blocks) {
      const qMatch = block.match(/^\d+\.\s*(.+)/);
      if (!qMatch) continue;
      
      let textLine = qMatch[1].trim();
      const options = [];
      let correct_index = null;

      // Extract options (A, B, C, D)
      const optRegex = /([A-D])[\)\.]\s+([^\n]+)/g;
      let optMatch;
      while ((optMatch = optRegex.exec(block)) !== null) {
        options.push(optMatch[2].trim());
      }

      // Extract Answer
      const ansRegex = /Ans(?:wer)?:\s*([A-D])/i;
      const ansMatch = block.match(ansRegex);
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase();
        correct_index = letter.charCodeAt(0) - 65; // A=0, B=1
      }

      // If we found a question and at least 2 options, save it
      if (textLine && options.length >= 2) {
        questions.push({
          type: 'mcq',
          text: textLine,
          options,
          correct_index,
          marks: 4,
          negative_marks: 1,
          difficulty: 'medium'
        });
      }
    }

    // The PDF is implicitly discarded when the request ends (in memory).
    res.json({ questions });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, bulkCreate, update, list, remove, taxonomy, uploadPdf };
