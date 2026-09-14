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

// List all users in the platform with rich monitoring details
async function listUsers(req, res, next) {
  try {
    const { role, search } = req.query;
    let query = `
      SELECT 
        u.id, u.full_name, u.phone, u.email, u.role, u.is_active, u.created_at,
        s.roll_number,
        b.name AS batch_name,
        parent_u.full_name AS parent_name,
        parent_u.phone AS parent_phone,
        t.subject,
        COALESCE(inst_admin.name, inst_student.name, inst_teacher.name, inst_parent.name) AS institute_name,
        COALESCE(inst_admin.city, inst_student.city) AS city,
        COALESCE(inst_admin.state, inst_student.state) AS state,
        (
          SELECT string_agg(child_u.full_name, ', ')
          FROM students cs
          JOIN users child_u ON cs.user_id = child_u.id
          WHERE cs.parent_user_id = u.id
        ) AS children_names
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN batches b ON s.batch_id = b.id
      LEFT JOIN users parent_u ON s.parent_user_id = parent_u.id
      LEFT JOIN institutes inst_student ON s.institute_id = inst_student.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN institutes inst_teacher ON t.institute_id = inst_teacher.id
      LEFT JOIN institutes inst_admin ON inst_admin.admin_id = u.id
      LEFT JOIN students parent_st ON parent_st.parent_user_id = u.id
      LEFT JOIN institutes inst_parent ON parent_st.institute_id = inst_parent.id
      WHERE 1=1
    `;
    const params = [];
    if (role && role !== 'all') {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        u.full_name ILIKE $${params.length} 
        OR u.phone ILIKE $${params.length} 
        OR u.email ILIKE $${params.length}
        OR s.roll_number ILIKE $${params.length}
        OR inst_admin.name ILIKE $${params.length}
        OR inst_student.name ILIKE $${params.length}
        OR inst_teacher.name ILIKE $${params.length}
      )`;
    }
    query += `
      GROUP BY 
        u.id, u.full_name, u.phone, u.email, u.role, u.is_active, u.created_at,
        s.roll_number, b.name, parent_u.full_name, parent_u.phone,
        t.subject,
        inst_admin.name, inst_student.name, inst_teacher.name, inst_parent.name,
        inst_admin.city, inst_student.city, inst_admin.state, inst_student.state
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Toggle user active status
async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await db.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, full_name, role, is_active',
      [Boolean(is_active), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Global metrics
async function dashboardMetrics(req, res, next) {
  try {
    const [institutes, students, teachers, parents, allUsers, activeTests, revenueRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM institutes'),
      db.query("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      db.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'"),
      db.query("SELECT COUNT(*) FROM users WHERE role = 'parent'"),
      db.query('SELECT COUNT(*) FROM users'),
      db.query("SELECT COUNT(*) FROM tests WHERE status = 'active'"),
      db.query("SELECT COALESCE(SUM(amount), 0) as total FROM institute_subscriptions WHERE status = 'paid'")
    ]);
    
    res.json({
      institutes: parseInt(institutes.rows[0].count, 10),
      students: parseInt(students.rows[0].count, 10),
      teachers: parseInt(teachers.rows[0].count, 10),
      parents: parseInt(parents.rows[0].count, 10),
      totalUsers: parseInt(allUsers.rows[0].count, 10),
      activeTests: parseInt(activeTests.rows[0].count, 10),
      subscription_revenue: Math.round(parseInt(revenueRes.rows[0].total, 10) / 100)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  listInstitutes, 
  toggleInstitute, 
  updateInstituteSubscription, 
  listUsers, 
  toggleUserStatus,
  dashboardMetrics 
};
