const db = require('../config/db');

// List all institutes along with their basic stats and subscription details
async function listInstitutes(req, res, next) {
  try {
    const result = await db.query(`
      SELECT 
        i.id, i.name, i.address, i.city, i.state, i.is_active, i.created_at,
        i.trial_ends_at, i.subscription_status, i.subscription_valid_until, i.plan_price_per_student,
        u.full_name as admin_name, u.phone as admin_phone, u.email as admin_email,
        (SELECT COUNT(*) FROM students s WHERE s.institute_id = i.id) as student_count,
        (SELECT COUNT(*) FROM teachers t WHERE t.institute_id = i.id) as teacher_count,
        (SELECT COUNT(*) FROM batches b WHERE b.institute_id = i.id) as batch_count
      FROM institutes i
      JOIN users u ON i.admin_id = u.id
      ORDER BY i.created_at DESC
    `);
    
    const institutes = result.rows.map(inst => {
      const studentCount = parseInt(inst.student_count || 0, 10);
      const rate = inst.plan_price_per_student || 80;
      const now = new Date();
      const trialEndsAt = inst.trial_ends_at ? new Date(inst.trial_ends_at) : null;
      const subValidUntil = inst.subscription_valid_until ? new Date(inst.subscription_valid_until) : null;
      
      const isSubActive = inst.subscription_status === 'active' && subValidUntil && subValidUntil > now;
      const isTrialActive = !isSubActive && trialEndsAt && trialEndsAt > now;
      const computedStatus = isSubActive ? 'active' : (isTrialActive ? 'trial' : 'expired');

      return {
        ...inst,
        student_count: studentCount,
        teacher_count: parseInt(inst.teacher_count || 0, 10),
        batch_count: parseInt(inst.batch_count || 0, 10),
        computed_status: computedStatus,
        monthly_billable: studentCount * rate
      };
    });

    res.json(institutes);
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

// SuperAdmin manage subscription / extend trial
async function updateInstituteSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { subscription_status, trial_ends_at, subscription_valid_until, plan_price_per_student } = req.body;

    const result = await db.query(
      `UPDATE institutes 
       SET subscription_status = COALESCE($1, subscription_status),
           trial_ends_at = COALESCE($2, trial_ends_at),
           subscription_valid_until = COALESCE($3, subscription_valid_until),
           plan_price_per_student = COALESCE($4, plan_price_per_student),
           updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [subscription_status, trial_ends_at, subscription_valid_until, plan_price_per_student, id]
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
    const [institutes, students, teachers, activeTests, revenueRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM institutes'),
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM teachers'),
      db.query("SELECT COUNT(*) FROM tests WHERE status = 'active'"),
      db.query("SELECT COALESCE(SUM(amount), 0) as total FROM institute_subscriptions WHERE status = 'paid'")
    ]);
    
    res.json({
      institutes: parseInt(institutes.rows[0].count),
      students: parseInt(students.rows[0].count),
      teachers: parseInt(teachers.rows[0].count),
      activeTests: parseInt(activeTests.rows[0].count),
      subscription_revenue: Math.round(parseInt(revenueRes.rows[0].total) / 100)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listInstitutes, toggleInstitute, updateInstituteSubscription, listUsers, dashboardMetrics };
