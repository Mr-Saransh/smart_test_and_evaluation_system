const db = require('../config/db');
const {
  hasInstituteAccess,
  hasBatchAccess,
  getStudentForUser,
  getStudentsForParent,
} = require('../utils/access');
const { DAY_NAMES, validTimes, overlaps } = require('../utils/timetable');

async function findClash(instituteId, batchId, teacherId, room, dayOfWeek, startTime, endTime, excludeId, client = db) {
  const existing = await client.query(
    `SELECT id, start_time, end_time, subject, batch_id, teacher_id, room FROM timetable_slots
     WHERE institute_id = $1 AND day_of_week = $2 AND ($3::uuid IS NULL OR id <> $3)`,
    [instituteId, dayOfWeek, excludeId || null]
  );
  for (const r of existing.rows) {
    if (overlaps(startTime, endTime, r.start_time, r.end_time)) {
      if (r.batch_id === batchId) return { type: 'batch', clash: r };
      if (teacherId && r.teacher_id === teacherId) return { type: 'teacher', clash: r };
      if (room && r.room && r.room.toLowerCase() === room.toLowerCase()) return { type: 'room', clash: r };
    }
  }
  return null;
}

// Resolve a slot -> its institute_id, then check access (admin/teacher).
async function getSlotIfAuthorized(user, slotId) {
  const r = await db.query('SELECT * FROM timetable_slots WHERE id = $1', [slotId]);
  if (r.rows.length === 0) return { notFound: true };
  const slot = r.rows[0];
  if (!(await hasInstituteAccess(user, slot.institute_id))) return { forbidden: true };
  return { slot };
}

async function create(req, res, next) {
  try {
    const { institute_id, batch_id, day_of_week, start_time, end_time, subject, teacher_id, room, color } = req.body;

    if (!institute_id || !batch_id || day_of_week == null || !start_time || !end_time || !subject) {
      return res.status(400).json({
        error: 'institute_id, batch_id, day_of_week, start_time, end_time and subject are required',
      });
    }
    const day = Number(day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return res.status(400).json({ error: 'day_of_week must be an integer 0 (Mon) – 6 (Sun)' });
    }
    if (!validTimes(start_time, end_time)) {
      return res.status(400).json({ error: 'start_time/end_time must be HH:MM and start must be before end' });
    }
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    // Batch must belong to this institute.
    const batch = await db.query('SELECT id FROM batches WHERE id = $1 AND institute_id = $2', [batch_id, institute_id]);
    if (batch.rows.length === 0) {
      return res.status(400).json({ error: 'batch_id does not belong to this institute' });
    }
    // Teacher (if given) must belong to this institute.
    if (teacher_id) {
      const t = await db.query('SELECT id FROM teachers WHERE id = $1 AND institute_id = $2', [teacher_id, institute_id]);
      if (t.rows.length === 0) return res.status(400).json({ error: 'teacher_id does not belong to this institute' });
    }

    const clash = await findClash(institute_id, batch_id, teacher_id || null, room || null, day, start_time, end_time, null);
    if (clash) {
      let msg = `Overlaps an existing ${DAY_NAMES[day]} slot`;
      if (clash.type === 'batch') msg = `Batch clash: ${msg}`;
      if (clash.type === 'teacher') msg = `Teacher clash: ${msg}`;
      if (clash.type === 'room') msg = `Room clash: ${msg}`;
      return res.status(409).json({
        error: `${msg} (${clash.clash.subject} ${clash.clash.start_time}–${clash.clash.end_time})`,
      });
    }

    const result = await db.query(
      `INSERT INTO timetable_slots
         (institute_id, batch_id, day_of_week, start_time, end_time, subject, teacher_id, room, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [institute_id, batch_id, day, start_time, end_time, subject, teacher_id || null, room || null, color || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// Build the slot SELECT with teacher name + day label, ordered for direct rendering.
function slotsQuery(whereSql) {
  return `
    SELECT ts.*, ut.full_name AS teacher_name, b.name AS batch_name
    FROM timetable_slots ts
    LEFT JOIN teachers t ON ts.teacher_id = t.id
    LEFT JOIN users ut ON t.user_id = ut.id
    JOIN batches b ON ts.batch_id = b.id
    WHERE ${whereSql}
    ORDER BY ts.day_of_week ASC, ts.start_time ASC`;
}

// Group a flat slot list into { day_of_week, day_name, slots: [...] } for a week grid.
function groupByDay(rows) {
  const byDay = new Map();
  for (const r of rows) {
    if (!byDay.has(r.day_of_week)) byDay.set(r.day_of_week, []);
    byDay.get(r.day_of_week).push(r);
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => ({
    day_of_week: d,
    day_name: DAY_NAMES[d],
    slots: byDay.get(d),
  }));
}

// Teacher/admin: a batch's weekly timetable.
async function listForBatch(req, res, next) {
  try {
    const { batch_id } = req.params;
    if (!(await hasBatchAccess(req.user, batch_id))) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    const result = await db.query(slotsQuery('ts.batch_id = $1'), [batch_id]);
    res.json({ batch_id, week: groupByDay(result.rows), flat: result.rows });
  } catch (err) { next(err); }
}

// Student/parent: the logged-in user's own batch timetable.
async function myTimetable(req, res, next) {
  try {
    let batchId;
    if (req.user.role === 'student') {
      const s = await getStudentForUser(req.user.id);
      if (!s) return res.status(403).json({ error: 'No student profile' });
      batchId = s.batch_id;
    } else if (req.user.role === 'parent') {
      const kids = await getStudentsForParent(req.user.id);
      if (kids.length === 0) return res.json({ batch_id: null, week: [], flat: [] });
      batchId = kids[0].batch_id;
    } else {
      return res.status(403).json({ error: 'Students or parents only' });
    }
    if (!batchId) return res.json({ batch_id: null, week: [], flat: [] });

    const result = await db.query(slotsQuery('ts.batch_id = $1'), [batchId]);
    res.json({ batch_id: batchId, week: groupByDay(result.rows), flat: result.rows });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { slot, notFound, forbidden } = await getSlotIfAuthorized(req.user, id);
    if (notFound) return res.status(404).json({ error: 'Slot not found' });
    if (forbidden) return res.status(403).json({ error: 'Not authorized for this slot' });

    const { day_of_week, start_time, end_time, subject, teacher_id, room, color } = req.body;

    const day = day_of_week == null ? slot.day_of_week : Number(day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return res.status(400).json({ error: 'day_of_week must be an integer 0 (Mon) – 6 (Sun)' });
    }
    const start = start_time || slot.start_time;
    const end = end_time || slot.end_time;
    if (!validTimes(start, end)) {
      return res.status(400).json({ error: 'start_time/end_time must be HH:MM and start must be before end' });
    }
    if (teacher_id) {
      const t = await db.query('SELECT id FROM teachers WHERE id = $1 AND institute_id = $2', [teacher_id, slot.institute_id]);
      if (t.rows.length === 0) return res.status(400).json({ error: 'teacher_id does not belong to this institute' });
    }

    const newTeacherId = teacher_id === undefined ? slot.teacher_id : (teacher_id || null);
    const newRoom = room !== undefined ? (room || null) : slot.room;
    const clash = await findClash(slot.institute_id, slot.batch_id, newTeacherId, newRoom, day, start, end, id);
    
    if (clash) {
      let msg = `Overlaps an existing ${DAY_NAMES[day]} slot`;
      if (clash.type === 'batch') msg = `Batch clash: ${msg}`;
      if (clash.type === 'teacher') msg = `Teacher clash: ${msg}`;
      if (clash.type === 'room') msg = `Room clash: ${msg}`;
      return res.status(409).json({
        error: `${msg} (${clash.clash.subject} ${clash.clash.start_time}–${clash.clash.end_time})`,
      });
    }

    const result = await db.query(
      `UPDATE timetable_slots SET
         day_of_week = $1,
         start_time = $2,
         end_time = $3,
         subject = COALESCE($4, subject),
         teacher_id = $5,
         room = COALESCE($6, room),
         color = COALESCE($7, color),
         updated_at = now()
       WHERE id = $8 RETURNING *`,
      [day, start, end, subject || null, teacher_id === undefined ? slot.teacher_id : (teacher_id || null), room || null, color || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { notFound, forbidden } = await getSlotIfAuthorized(req.user, id);
    if (notFound) return res.status(404).json({ error: 'Slot not found' });
    if (forbidden) return res.status(403).json({ error: 'Not authorized for this slot' });

    await db.query('DELETE FROM timetable_slots WHERE id = $1', [id]);
    res.json({ deleted: true, id });
  } catch (err) { next(err); }
}

module.exports = { create, listForBatch, myTimetable, update, remove };
