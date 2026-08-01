const db = require('../config/db');

// List all institutes along with their basic stats
async function listInstitutes(req, res, next) {
  try {
    const result = await db.query(`
      SELECT 
        i.id, i.name, i.address, i.city, i.state, i.is_active, i.created_at,
        u.full_name as admin_name, u.phone as admin_phone, u.email as admin_email,
        (SELECT COUNT(*) FROM students s WHERE s.institute_id = i.id) as student_count,
        (SELECT COUNT(*) FROM teachers t WHERE t.institute_id = i.id) as teacher_count,
        (SELECT COUNT(*) FROM batches b WHERE b.institute_id = i.id) as batch_count
      FROM institutes i
      JOIN users u ON i.admin_id = u.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Toggle institute active status
async function toggleInstitute(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await db.query(
      'UPDATE institutes SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// List all users in the platform
async function listUsers(req, res, next) {
  try {
    const result = await db.query(`
      SELECT id, full_name, phone, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Global metrics
async function dashboardMetrics(req, res, next) {
  try {
    const [institutes, students, teachers, activeTests] = await Promise.all([
      db.query('SELECT COUNT(*) FROM institutes'),
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM teachers'),
      db.query("SELECT COUNT(*) FROM tests WHERE status = 'active'")
    ]);
    
    res.json({
      institutes: parseInt(institutes.rows[0].count),
      students: parseInt(students.rows[0].count),
      teachers: parseInt(teachers.rows[0].count),
      activeTests: parseInt(activeTests.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listInstitutes, toggleInstitute, listUsers, dashboardMetrics };
