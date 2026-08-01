const db = require('../config/db');

// Returns true if the user (admin or teacher) has access to the institute.
async function hasInstituteAccess(user, instituteId, client = db) {
  if (!instituteId) return false;
  if (user.role === 'institute_admin') {
    const r = await client.query(
      'SELECT id FROM institutes WHERE id = $1 AND admin_id = $2',
      [instituteId, user.id]
    );
    return r.rows.length > 0;
  }
  if (user.role === 'teacher') {
    const r = await client.query(
      'SELECT id FROM teachers WHERE user_id = $1 AND institute_id = $2',
      [user.id, instituteId]
    );
    return r.rows.length > 0;
  }
  if (user.role === 'student') {
    const r = await client.query(
      'SELECT id FROM students WHERE user_id = $1 AND institute_id = $2',
      [user.id, instituteId]
    );
    return r.rows.length > 0;
  }
  if (user.role === 'parent') {
    const r = await client.query(
      'SELECT id FROM students WHERE parent_user_id = $1 AND institute_id = $2',
      [user.id, instituteId]
    );
    return r.rows.length > 0;
  }
  return false;
}

// Resolve a batch -> its institute_id, then check access.
async function hasBatchAccess(user, batchId, client = db) {
  const b = await client.query('SELECT institute_id FROM batches WHERE id = $1', [batchId]);
  if (b.rows.length === 0) return false;
  return hasInstituteAccess(user, b.rows[0].institute_id, client);
}

// Resolve the student row for a logged-in student user.
async function getStudentForUser(userId, client = db) {
  const r = await client.query('SELECT * FROM students WHERE user_id = $1', [userId]);
  return r.rows[0] || null;
}

// Resolve students a parent is linked to.
async function getStudentsForParent(parentUserId, client = db) {
  const r = await client.query('SELECT * FROM students WHERE parent_user_id = $1', [parentUserId]);
  return r.rows;
}

// Check if a user has access to a specific student's data.
async function hasStudentAccess(user, studentId, client = db) {
  const r = await client.query('SELECT institute_id, user_id, parent_user_id FROM students WHERE id = $1', [studentId]);
  if (r.rows.length === 0) return false;
  const student = r.rows[0];

  if (user.role === 'student' && student.user_id === user.id) return true;
  if (user.role === 'parent' && student.parent_user_id === user.id) return true;
  
  if (user.role === 'institute_admin' || user.role === 'teacher') {
    return hasInstituteAccess(user, student.institute_id, client);
  }

  return false;
}

module.exports = { hasInstituteAccess, hasBatchAccess, getStudentForUser, getStudentsForParent, hasStudentAccess };
