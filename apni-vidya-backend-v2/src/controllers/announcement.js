const db = require('../config/db');
const { hasInstituteAccess, getStudentForUser, getStudentsForParent } = require('../utils/access');

// Broadcast an announcement. batch_id null = all batches.
async function create(req, res, next) {
  try {
    const { institute_id, batch_id, title, body, audience } = req.body;
    if (!institute_id || !title || !body) {
      return res.status(400).json({ error: 'institute_id, title and body are required' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const aud = ['all', 'students', 'parents'].includes(audience) ? audience : 'all';
    const result = await db.query(
      `INSERT INTO announcements (institute_id, batch_id, created_by, title, body, audience)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [institute_id, batch_id || null, req.user.id, title, body, aud]
    );

    // Count recipients (for the "sent to N people" confirmation; dispatch handled by notification layer).
    const recipients = await db.query(
      batch_id
        ? `SELECT COUNT(*) FROM students WHERE institute_id = $1 AND batch_id = $2`
        : `SELECT COUNT(*) FROM students WHERE institute_id = $1`,
      batch_id ? [institute_id, batch_id] : [institute_id]
    );

    res.status(201).json({ announcement: result.rows[0], recipient_students: Number(recipients.rows[0].count) });
  } catch (err) { next(err); }
}

// Institute-wide feed (teacher/admin view).
async function listForInstitute(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT a.*, b.name AS batch_name
       FROM announcements a LEFT JOIN batches b ON a.batch_id = b.id
       WHERE a.institute_id = $1 ORDER BY a.created_at DESC LIMIT 100`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// Feed for the logged-in student or parent (their batch + institute-wide, audience-filtered).
async function myFeed(req, res, next) {
  try {
    let instituteId, batchId, audienceRole;
    if (req.user.role === 'student') {
      const s = await getStudentForUser(req.user.id);
      if (!s) return res.status(403).json({ error: 'No student profile' });
      instituteId = s.institute_id; batchId = s.batch_id; audienceRole = 'students';
    } else if (req.user.role === 'parent') {
      const kids = await getStudentsForParent(req.user.id);
      if (kids.length === 0) return res.json([]);
      instituteId = kids[0].institute_id; batchId = kids[0].batch_id; audienceRole = 'parents';
    } else {
      return res.status(403).json({ error: 'Students or parents only' });
    }
    const result = await db.query(
      `SELECT a.* FROM announcements a
       WHERE a.institute_id = $1
         AND (a.batch_id IS NULL OR a.batch_id = $2)
         AND (a.audience = 'all' OR a.audience = $3)
       ORDER BY a.created_at DESC LIMIT 50`,
      [instituteId, batchId, audienceRole]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { create, listForInstitute, myFeed };
