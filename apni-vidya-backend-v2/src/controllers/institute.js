const db = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const pay = require('../config/payments');
const { verifyPaymentSignature } = require('../utils/payments');
const { sendInstituteSubscriptionReceipt } = require('../services/email');

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

async function computeSubscriptionInfo(inst) {
  if (!inst) return null;
  
  const statsRes = await db.query(`
    SELECT 
      (SELECT COUNT(*) FROM students WHERE institute_id = $1) as total_students,
      (SELECT COUNT(*) FROM batches WHERE institute_id = $1 AND is_active = true) as total_batches
  `, [inst.id]);
  
  const studentCount = parseInt(statsRes.rows[0]?.total_students || 0, 10);
  const batchCount = parseInt(statsRes.rows[0]?.total_batches || 0, 10);

  const now = new Date();
  const trialEndsAt = inst.trial_ends_at ? new Date(inst.trial_ends_at) : new Date(new Date(inst.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
  const subValidUntil = inst.subscription_valid_until ? new Date(inst.subscription_valid_until) : null;

  const isSubscriptionActive = Boolean(inst.subscription_status === 'active' && subValidUntil && subValidUntil > now);
  const isTrialActive = Boolean(!isSubscriptionActive && trialEndsAt > now);
  const isTrialExpired = Boolean(!isSubscriptionActive && !isTrialActive);

  const diffMs = trialEndsAt.getTime() - now.getTime();
  const trialDaysLeft = isTrialActive ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;

  const ratePerStudent = inst.plan_price_per_student || 80;
  // If 0 students, rate base amount is 80 (or 0)
  const amountDue = studentCount * ratePerStudent;

  return {
    status: isSubscriptionActive ? 'active' : (isTrialActive ? 'trial' : 'expired'),
    trial_ends_at: trialEndsAt,
    subscription_valid_until: subValidUntil,
    is_trial_active: isTrialActive,
    is_trial_expired: isTrialExpired,
    is_subscription_active: isSubscriptionActive,
    trial_days_left: trialDaysLeft,
    total_students: studentCount,
    total_batches: batchCount,
    rate_per_student: ratePerStudent,
    amount_due: amountDue,
    currency: 'INR'
  };
}

async function create(req, res, next) {
  try {
    const { name, address, city, state, pincode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Institute name is required' });
    }

    const slug = generateSlug(name);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enrollmentUrl = `${frontendUrl}/enroll/${slug}`;
    const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });

    const result = await db.query(
      `INSERT INTO institutes (admin_id, name, address, city, state, pincode, enrollment_slug, qr_code_data, trial_ends_at, subscription_status, plan_price_per_student)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '7 days', 'trial', 80)
       RETURNING *`,
      [req.user.id, name, address || null, city || null, state || null, pincode || null, slug, qrCodeData]
    );

    const inst = result.rows[0];
    inst.subscription = await computeSubscriptionInfo(inst);

    res.status(201).json(inst);
  } catch (err) {
    next(err);
  }
}

async function getMyInstitute(req, res, next) {
  try {
    let result;
    if (req.user.role === 'institute_admin') {
      result = await db.query(
        'SELECT * FROM institutes WHERE admin_id = $1 AND is_active = true',
        [req.user.id]
      );
    } else if (req.user.role === 'teacher') {
      result = await db.query(
        `SELECT i.* FROM institutes i 
         JOIN teachers t ON i.id = t.institute_id 
         WHERE t.user_id = $1 AND i.is_active = true`,
        [req.user.id]
      );
    } else if (req.user.role === 'student') {
      result = await db.query(
        `SELECT i.* FROM institutes i 
         JOIN students s ON i.id = s.institute_id 
         WHERE s.user_id = $1 AND i.is_active = true`,
        [req.user.id]
      );
    } else if (req.user.role === 'parent') {
      result = await db.query(
        `SELECT i.* FROM institutes i 
         JOIN students s ON i.id = s.institute_id 
         WHERE s.parent_user_id = $1 AND i.is_active = true LIMIT 1`,
        [req.user.id]
      );
    } else {
      return res.status(403).json({ error: 'Invalid role' });
    }

    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'No institute found' });
    }
    const inst = result.rows[0];

    // Lazy generate QR code if missing in database
    if (!inst.qr_code_data && inst.enrollment_slug) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const enrollmentUrl = `${frontendUrl}/enroll/${inst.enrollment_slug}`;
      const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });
      await db.query('UPDATE institutes SET qr_code_data = $1 WHERE id = $2', [qrCodeData, inst.id]);
      inst.qr_code_data = qrCodeData;
    }

    // Attach subscription and trial status
    inst.subscription = await computeSubscriptionInfo(inst);

    res.json(inst);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, address, city, state, pincode } = req.body;

    const institute = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (institute.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const instRow = institute.rows[0];
    let qrCodeData = instRow.qr_code_data;
    if (!qrCodeData && instRow.enrollment_slug) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const enrollmentUrl = `${frontendUrl}/enroll/${instRow.enrollment_slug}`;
      qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });
    }

    const result = await db.query(
      `UPDATE institutes 
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           city = COALESCE($3, city),
           state = COALESCE($4, state),
           pincode = COALESCE($5, pincode),
           qr_code_data = COALESCE($6, qr_code_data),
           updated_at = now()
       WHERE id = $7 AND admin_id = $8
       RETURNING *`,
      [name, address, city, state, pincode, qrCodeData, id, req.user.id]
    );

    const updatedInst = result.rows[0];
    updatedInst.subscription = await computeSubscriptionInfo(updatedInst);

    res.json(updatedInst);
  } catch (err) {
    next(err);
  }
}

async function regenerateQR(req, res, next) {
  try {
    const { id } = req.params;

    const institute = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (institute.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enrollmentUrl = `${frontendUrl}/enroll/${institute.rows[0].enrollment_slug}`;
    const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });

    await db.query(
      'UPDATE institutes SET qr_code_data = $1, updated_at = now() WHERE id = $2',
      [qrCodeData, id]
    );

    res.json({ qr_code_data: qrCodeData, enrollment_url: enrollmentUrl });
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await db.query(
      'SELECT id, name, logo_url, city, state FROM institutes WHERE enrollment_slug = $1 AND is_active = true',
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const batches = await db.query(
      'SELECT id, name, description FROM batches WHERE institute_id = $1 AND is_active = true',
      [result.rows[0].id]
    );

    res.json({
      ...result.rows[0],
      institute: result.rows[0],
      batches: batches.rows,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/institutes/:id/billing-summary
async function getBillingSummary(req, res, next) {
  try {
    const { id } = req.params;
    const instRes = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (instRes.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found or not authorized' });
    }
    const inst = instRes.rows[0];
    const subInfo = await computeSubscriptionInfo(inst);

    // Batch-wise student distribution
    const batchBreakdown = await db.query(`
      SELECT b.id, b.name, COUNT(s.id) as student_count
      FROM batches b
      LEFT JOIN students s ON s.batch_id = b.id
      WHERE b.institute_id = $1 AND b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY student_count DESC
    `, [id]);

    // Unassigned students
    const unassignedRes = await db.query(`
      SELECT COUNT(*) as count FROM students WHERE institute_id = $1 AND batch_id IS NULL
    `, [id]);
    const unassignedCount = parseInt(unassignedRes.rows[0]?.count || 0, 10);

    // Subscription payment history
    const historyRes = await db.query(`
      SELECT id, razorpay_order_id, razorpay_payment_id, student_count, batch_count,
             amount, rate_per_student, currency, status, period_start, period_end, created_at
      FROM institute_subscriptions
      WHERE institute_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      institute: {
        id: inst.id,
        name: inst.name,
        created_at: inst.created_at
      },
      subscription: subInfo,
      batches: batchBreakdown.rows,
      unassigned_students: unassignedCount,
      history: historyRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/institutes/:id/subscription/order
async function createSubscriptionOrder(req, res, next) {
  try {
    const { id } = req.params;

    const instRes = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (instRes.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found or not authorized' });
    }
    const inst = instRes.rows[0];
    const subInfo = await computeSubscriptionInfo(inst);

    const studentCount = subInfo.total_students;
    const batchCount = subInfo.total_batches;
    const rate = subInfo.rate_per_student || 80;

    // Minimum billable unit is 1 student (₹80) if 0 students enrolled
    const billableStudents = Math.max(studentCount, 1);
    const amountInPaise = billableStudents * rate * 100;

    if (!pay.isConfigured()) {
      return res.status(503).json({ error: 'Online payments are not configured' });
    }

    const order = await pay.getClient().orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sub_${inst.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: {
        institute_id: inst.id,
        student_count: String(studentCount),
        batch_count: String(batchCount),
        type: 'institute_monthly_subscription'
      }
    });

    await db.query(
      `INSERT INTO institute_subscriptions (
        institute_id, razorpay_order_id, student_count, batch_count,
        amount, rate_per_student, currency, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'created', $7)`,
      [inst.id, order.id, studentCount, batchCount, order.amount, rate, req.user.id]
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: pay.keyId(),
      student_count: studentCount,
      rate_per_student: rate,
      total_rupees: Math.round(order.amount / 100)
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/institutes/:id/subscription/verify
async function verifySubscription(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, pay.keySecret())) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    await client.query('BEGIN');

    // Lock subscription payment record
    const subRes = await client.query(
      'SELECT * FROM institute_subscriptions WHERE razorpay_order_id = $1 FOR UPDATE',
      [razorpay_order_id]
    );
    if (subRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const subOrder = subRes.rows[0];
    if (subOrder.status === 'paid') {
      await client.query('COMMIT');
      return res.json({ status: 'paid', already: true });
    }

    // Lock institute record
    const instRes = await client.query(
      'SELECT * FROM institutes WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (instRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Institute not found' });
    }
    const inst = instRes.rows[0];

    const now = new Date();
    // Calculate new valid until: if current subscription is still active in future, extend by 1 month; else from now + 1 month
    const baseDate = (inst.subscription_valid_until && new Date(inst.subscription_valid_until) > now)
      ? new Date(inst.subscription_valid_until)
      : new Date();
    
    const newValidUntil = new Date(baseDate);
    newValidUntil.setMonth(newValidUntil.getMonth() + 1);

    // Update payment record
    await client.query(
      `UPDATE institute_subscriptions 
       SET status = 'paid', razorpay_payment_id = $1, period_start = $2, period_end = $3, updated_at = now()
       WHERE id = $4`,
      [razorpay_payment_id, baseDate, newValidUntil, subOrder.id]
    );

    // Update institute subscription status & expiry
    await client.query(
      `UPDATE institutes 
       SET subscription_status = 'active', subscription_valid_until = $1, updated_at = now()
       WHERE id = $2`,
      [newValidUntil, inst.id]
    );

    await client.query('COMMIT');

    // Send receipt email
    try {
      const adminUser = await db.query('SELECT email, full_name FROM users WHERE id = $1', [inst.admin_id]);
      if (adminUser.rows.length > 0 && adminUser.rows[0].email) {
        await sendInstituteSubscriptionReceipt({
          to: adminUser.rows[0].email,
          instituteName: inst.name,
          amount: subOrder.amount,
          transactionId: razorpay_payment_id,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          studentCount: subOrder.student_count,
          batchCount: subOrder.batch_count,
          validUntil: newValidUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        });
      }
    } catch (emailErr) {
      console.error('[email] Failed to send institute subscription receipt:', emailErr.message);
    }

    res.json({
      status: 'paid',
      subscription_status: 'active',
      subscription_valid_until: newValidUntil
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  create,
  getMyInstitute,
  update,
  regenerateQR,
  getBySlug,
  getBillingSummary,
  createSubscriptionOrder,
  verifySubscription
};
