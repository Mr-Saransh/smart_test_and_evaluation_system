const db = require('../config/db');
const { hasInstituteAccess, hasBatchAccess, getStudentForUser } = require('../utils/access');

// Quick URL sanity check. We store the URL as-is (no fetching). Disallow
// javascript:/data: schemes to keep students safe from a malicious upload.
function isSafeUrl(u) {
  if (typeof u !== 'string' || u.length > 2000) return false;
  const trimmed = u.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

const VALID_KINDS = ['link', 'pdf', 'video', 'note', 'other'];

// POST /api/materials
// Body: { institute_id, batch_id?, title, description?, subject?, kind?, url }
// batch_id null => visible to the whole institute.
async function create(req, res, next) {
  try {
    const { institute_id, batch_id, title, description, subject, kind } = req.body;
    let url = req.body.url;
    
    if (req.file) {
      url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    if (!institute_id || !title || !url) {
      return res.status(400).json({ error: 'institute_id, title and either url or file are required' });
    }
    if (!req.file && !isSafeUrl(url)) {
      return res.status(400).json({ error: 'url must be a valid http(s) URL' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    // If a batch is supplied, make sure it belongs to this institute.
    if (batch_id) {
      const b = await db.query('SELECT institute_id FROM batches WHERE id = $1', [batch_id]);
      if (b.rows.length === 0 || b.rows[0].institute_id !== institute_id) {
        return res.status(400).json({ error: 'batch does not belong to this institute' });
      }
    }
    const k = VALID_KINDS.includes(kind) ? kind : 'link';

    const result = await db.query(
      `INSERT INTO study_materials
         (institute_id, batch_id, created_by, title, description, subject, kind, url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [institute_id, batch_id || null, req.user.id, title, description || null,
       subject || null, k, url.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/materials/institute/:institute_id  (staff)
async function listForInstitute(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      `SELECT m.*, b.name AS batch_name
       FROM study_materials m LEFT JOIN batches b ON m.batch_id = b.id
       WHERE m.institute_id = $1 ORDER BY m.created_at DESC`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/materials/batch/:batch_id  (staff)
async function listForBatch(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(
      `SELECT * FROM study_materials WHERE batch_id = $1 ORDER BY created_at DESC`,
      [batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/materials/mine  (student)
// Returns batch materials AND institute-wide materials (batch_id IS NULL).
async function mine(req, res, next) {
  try {
    const student = await getStudentForUser(req.user.id);
    if (!student) return res.status(403).json({ error: 'Students only' });
    const result = await db.query(
      `SELECT id, title, description, subject, kind, url, created_at
       FROM study_materials
       WHERE institute_id = $1 AND (batch_id = $2 OR batch_id IS NULL)
       ORDER BY created_at DESC`,
      [student.institute_id, student.batch_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// DELETE /api/materials/:id  (staff)
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const row = await db.query('SELECT institute_id FROM study_materials WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!(await hasInstituteAccess(req.user, row.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('DELETE FROM study_materials WHERE id = $1', [id]);
    res.json({ id, deleted: true });
  } catch (err) { next(err); }
}

module.exports = { create, listForInstitute, listForBatch, mine, remove };
