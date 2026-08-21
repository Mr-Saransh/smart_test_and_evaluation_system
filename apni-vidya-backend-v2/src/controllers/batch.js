const db = require('../config/db');
const { hasInstituteAccess } = require('../utils/access');
const { sendBatchSubscriptionReceipt } = require('../services/email');

async function create(req, res, next) {
  try {
    const { institute_id, name, description, start_date, end_date, meet_link, capacity } = req.body;

    if (!institute_id || !name) {
      return res.status(400).json({ error: 'institute_id and name are required' });
    }

    // Verify ownership
    const inst = await db.query(
      'SELECT id FROM institutes WHERE id = $1 AND admin_id = $2',
      [institute_id, req.user.id]
    );
    if (inst.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const result = await db.query(
      `INSERT INTO batches (institute_id, name, description, start_date, end_date, meet_link, capacity, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        institute_id, name, description || null, start_date || null, end_date || null, meet_link || null, 
        capacity || null, 
        capacity ? 'pending' : 'active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { institute_id } = req.params;

    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }

    const result = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b
       WHERE b.institute_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [institute_id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, is_active, meet_link } = req.body;

    const batchRes = await db.query(
      `SELECT b.id, b.payment_status FROM batches b
       JOIN institutes i ON b.institute_id = i.id
       WHERE b.id = $1 AND i.admin_id = $2`,
      [id, req.user.id]
    );
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not authorized' });
    }
    
    // Prevent activating an unpaid batch
    if (is_active === true && batchRes.rows[0].payment_status === 'pending') {
      return res.status(403).json({ error: 'Cannot activate an unpaid batch. Please complete the payment first.' });
    }

    const result = await db.query(
      `UPDATE batches 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           is_active = COALESCE($5, is_active),
           meet_link = COALESCE($6, meet_link),
           updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [name, description, start_date, end_date, is_active, meet_link, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Delete or Archive a batch.
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const batch = await db.query(
      `SELECT b.id, b.institute_id, b.name FROM batches b
       JOIN institutes i ON b.institute_id = i.id
       WHERE b.id = $1 AND i.admin_id = $2`,
      [id, req.user.id]
    );
    if (batch.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not authorized' });
    }

    if (permanent === 'true' || permanent === '1') {
      // Unlink students from this batch to preserve student records
      await db.query('UPDATE students SET batch_id = NULL WHERE batch_id = $1', [id]);
      await db.query('DELETE FROM batches WHERE id = $1', [id]);
      return res.json({ message: 'Batch permanently deleted', id });
    }

    const result = await db.query(
      `UPDATE batches SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json({ message: 'Batch archived', batch: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Permanent hard delete endpoint
async function permanentRemove(req, res, next) {
  try {
    const { id } = req.params;
    const batch = await db.query(
      `SELECT b.id, b.institute_id, b.name FROM batches b
       JOIN institutes i ON b.institute_id = i.id
       WHERE b.id = $1 AND i.admin_id = $2`,
      [id, req.user.id]
    );
    if (batch.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not authorized' });
    }

    // Unlink students from this batch before deleting
    await db.query('UPDATE students SET batch_id = NULL WHERE batch_id = $1', [id]);
    await db.query('DELETE FROM batches WHERE id = $1', [id]);
    res.json({ message: 'Batch permanently deleted', id });
  } catch (err) {
    next(err);
  }
}

// List all batches including archived for the institute.
async function listAll(req, res, next) {
  try {
    const { institute_id } = req.params;
    if (!(await hasInstituteAccess(req.user, institute_id))) {
      return res.status(403).json({ error: 'Not authorized for this institute' });
    }
    const result = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b
       WHERE b.institute_id = $1
       ORDER BY b.is_active DESC, b.created_at DESC`,
      [institute_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Batch details with stats.
async function getDetails(req, res, next) {
  try {
    const { id } = req.params;
    const batch = await db.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) AS student_count
       FROM batches b WHERE b.id = $1`,
      [id]
    );
    if (batch.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (!(await hasInstituteAccess(req.user, batch.rows[0].institute_id))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const b = batch.rows[0];

    // Attendance %
    const attend = await db.query(
      `SELECT CASE WHEN COUNT(*) = 0 THEN 0
                   ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / COUNT(*), 1)
              END AS attendance_pct
       FROM attendance WHERE batch_id = $1`, [id]
    );

    // Fee collection
    const fees = await db.query(
      `SELECT COALESCE(SUM(fr.amount_due), 0) AS total_due,
              COALESCE(SUM(fr.amount_paid), 0) AS total_paid,
              COUNT(*) FILTER (WHERE fr.status = 'paid') AS paid_count,
              COUNT(*) FILTER (WHERE fr.status = 'pending') AS pending_count,
              COUNT(*) FILTER (WHERE fr.status = 'overdue' OR (fr.status <> 'paid' AND fr.due_date < CURRENT_DATE)) AS overdue_count
       FROM fee_records fr
       JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       JOIN students s ON fr.student_id = s.id
       WHERE s.batch_id = $1`, [id]
    );

    // Upcoming tests
    const tests = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'active') AS active_tests,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed_tests
       FROM tests WHERE batch_id = $1`, [id]
    );

    // Top performers
    const topPerformers = await db.query(
      `SELECT u.full_name, 
              ROUND(AVG(100.0 * ts.score / NULLIF(ts.max_marks,0)), 1) AS avg_pct,
              COUNT(ts.id) AS tests_taken
       FROM students s JOIN users u ON s.user_id = u.id
       LEFT JOIN test_submissions ts ON ts.student_id = s.id
       WHERE s.batch_id = $1 AND ts.id IS NOT NULL
       GROUP BY s.id, u.full_name
       ORDER BY avg_pct DESC NULLS LAST LIMIT 5`, [id]
    );

    // Teachers assigned (from timetable)
    const teachers = await db.query(
      `SELECT DISTINCT u.full_name, t.subject
       FROM timetable_slots ts
       JOIN teachers t ON ts.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ts.batch_id = $1`, [id]
    );

    res.json({
      ...b,
      attendance_pct: attend.rows[0]?.attendance_pct || 0,
      fee_stats: fees.rows[0] || {},
      test_stats: tests.rows[0] || {},
      top_performers: topPerformers.rows,
      teachers: teachers.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMeetLink(req, res, next) {
  try {
    const { id } = req.params;
    const { meet_link } = req.body;

    const { hasBatchAccess } = require('../utils/access');
    const hasAccess = await hasBatchAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }

    const result = await db.query(
      `UPDATE batches 
       SET meet_link = $1, updated_at = NOW() 
       WHERE id = $2 AND institute_id = $3
       RETURNING *`,
      [meet_link, id, req.user.institute_id] // Note: for teachers institute_id is usually on req.user. If not, they are verified by hasBatchAccess. We can rely on hasBatchAccess and just update by id.
    );

    if (result.rows.length === 0) {
      // Because hasBatchAccess passed, this means either batch doesn't exist or doesn't belong to the user's institute
      const fallbackResult = await db.query(
        `UPDATE batches SET meet_link = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [meet_link, id]
      );
      if (fallbackResult.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
      return res.json(fallbackResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Batch Subscriptions
const pay = require('../config/payments');
const { verifyPaymentSignature } = require('../utils/payments');

async function createSubscriptionOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { type, additional_capacity } = req.body; // 'creation', 'upgrade', 'renewal'

    const batchRes = await db.query(
      `SELECT b.* FROM batches b
       JOIN institutes i ON b.institute_id = i.id
       WHERE b.id = $1 AND i.admin_id = $2`,
      [id, req.user.id]
    );
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not authorized' });
    }
    const batch = batchRes.rows[0];

    let orderCapacity = 0;
    if (type === 'creation') {
      orderCapacity = batch.capacity || 0;
    } else if (type === 'renewal') {
      orderCapacity = (batch.capacity || 0) - (batch.deferred_capacity || 0);
    } else if (type === 'upgrade') {
      orderCapacity = additional_capacity || 0;
    }

    if (orderCapacity <= 0) {
      return res.status(400).json({ error: 'Invalid capacity for payment' });
    }

    const amount = orderCapacity * 80 * 100; // 80 INR per student in paise

    if (!pay.isConfigured()) return res.status(503).json({ error: 'Online payments are not configured' });

    const order = await pay.getClient().orders.create({
      amount,
      currency: 'INR',
      receipt: `bsub_${batch.id.split('-')[0]}_${Date.now()}`.slice(0, 40),
      notes: { batch_id: batch.id, type },
    });

    await db.query(
      `INSERT INTO batch_payments (institute_id, batch_id, razorpay_order_id, amount, currency, status, type, additional_capacity, created_by)
       VALUES ($1, $2, $3, $4, 'INR', 'created', $5, $6, $7)`,
      [batch.institute_id, batch.id, order.id, order.amount, type, type === 'upgrade' ? additional_capacity : 0, req.user.id]
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: pay.keyId()
    });
  } catch (err) {
    next(err);
  }
}

async function verifySubscription(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, pay.keySecret())) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    await client.query('BEGIN');
    
    // Lock payment record
    const pRes = await client.query('SELECT * FROM batch_payments WHERE razorpay_order_id = $1 FOR UPDATE', [razorpay_order_id]);
    if (pRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const payment = pRes.rows[0];
    if (payment.status === 'paid') {
      await client.query('COMMIT');
      return res.json({ status: 'paid', already: true });
    }

    // Lock batch record
    const bRes = await client.query('SELECT * FROM batches WHERE id = $1 FOR UPDATE', [payment.batch_id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Batch not found' });
    }
    const batch = bRes.rows[0];

    // Update payment record
    await client.query(
      "UPDATE batch_payments SET status = 'paid', razorpay_payment_id = $1, updated_at = now() WHERE id = $2",
      [razorpay_payment_id, payment.id]
    );

    // Apply batch update logic based on type
    let newCapacity = batch.capacity;
    let newValidUntil = batch.valid_until;
    let newPaymentStatus = 'active';
    let newDeferredCapacity = batch.deferred_capacity || 0;

    const now = new Date();
    
    if (payment.type === 'creation') {
      newValidUntil = new Date();
      newValidUntil.setMonth(newValidUntil.getMonth() + 1);
      newDeferredCapacity = 0;
    } else if (payment.type === 'upgrade') {
      newCapacity = (batch.capacity || 0) + payment.additional_capacity;
      newDeferredCapacity = newDeferredCapacity + payment.additional_capacity;
    } else if (payment.type === 'renewal') {
      if (!newValidUntil || newValidUntil < now) {
        newValidUntil = new Date();
      }
      newValidUntil.setMonth(newValidUntil.getMonth() + 1);
      newDeferredCapacity = 0;
    }

    await client.query(
      `UPDATE batches 
       SET capacity = $1, valid_until = $2, payment_status = $3, deferred_capacity = $4, updated_at = now()
       WHERE id = $5`,
      [newCapacity, newValidUntil, newPaymentStatus, newDeferredCapacity, batch.id]
    );

    await client.query('COMMIT');
    
    // Fetch institute and admin email to send the receipt
    try {
      const instRes = await db.query(
        `SELECT i.name as institute_name, u.email as admin_email 
         FROM institutes i 
         JOIN users u ON i.admin_id = u.id 
         WHERE i.id = $1`, 
         [batch.institute_id]
      );
      if (instRes.rows.length > 0) {
        const instInfo = instRes.rows[0];
        let billedCapacity = 0;
        if (payment.type === 'creation') billedCapacity = batch.capacity || 0;
        else if (payment.type === 'upgrade') billedCapacity = payment.additional_capacity || 0;
        else if (payment.type === 'renewal') billedCapacity = (batch.capacity || 0) - (batch.deferred_capacity || 0);

        await sendBatchSubscriptionReceipt({
          to: instInfo.admin_email,
          instituteName: instInfo.institute_name,
          batchName: batch.name,
          type: payment.type,
          amount: payment.amount,
          transactionId: razorpay_payment_id,
          date: new Date().toLocaleDateString(),
          capacity: billedCapacity
        });
      }
    } catch (emailErr) {
      console.error('[email] Failed to send receipt during verifySubscription:', emailErr.message);
    }

    res.json({ status: 'paid' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { create, list, listAll, update, remove, permanentRemove, getDetails, updateMeetLink, createSubscriptionOrder, verifySubscription };
