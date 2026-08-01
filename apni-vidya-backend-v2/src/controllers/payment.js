const db = require('../config/db');
const { hasInstituteAccess, getStudentForUser, getStudentsForParent } = require('../utils/access');
const { computeFeeStatus } = require('../utils/fee');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../utils/payments');
const pay = require('../config/payments');

// Who may pay/settle a fee record: the institute's staff, the student it belongs
// to, or that student's parent.
async function canAccessFeeRecord(user, rec) {
  if (user.role === 'institute_admin' || user.role === 'teacher') {
    return hasInstituteAccess(user, rec.institute_id);
  }
  if (user.role === 'student') {
    const s = await getStudentForUser(user.id);
    return Boolean(s && s.id === rec.student_id);
  }
  if (user.role === 'parent') {
    const kids = await getStudentsForParent(user.id);
    return kids.some((k) => k.id === rec.student_id);
  }
  return false;
}

// Apply a captured payment to its fee record exactly once (idempotent). Safe to
// call from both the client verify callback and the webhook — whichever lands
// first wins, the second is a no-op.
async function reconcile(orderId, paymentId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const p = await client.query('SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE', [orderId]);
    if (p.rows.length === 0) { await client.query('ROLLBACK'); return { ok: false, reason: 'unknown_order' }; }
    const payment = p.rows[0];
    if (payment.status === 'paid') { await client.query('COMMIT'); return { ok: true, already: true }; }

    await client.query(
      "UPDATE payments SET status = 'paid', razorpay_payment_id = $1, updated_at = now() WHERE id = $2",
      [paymentId, payment.id]
    );

    const fr = await client.query('SELECT * FROM fee_records WHERE id = $1 FOR UPDATE', [payment.fee_record_id]);
    if (fr.rows.length) {
      const rec = fr.rows[0];
      const newPaid = rec.amount_paid + Math.round(payment.amount / 100); // paise -> rupees
      const status = computeFeeStatus(rec.amount_due, newPaid);
      await client.query(
        `UPDATE fee_records SET amount_paid = $1, status = $2::text,
           paid_at = CASE WHEN $2::text = 'paid' THEN now() ELSE paid_at END, updated_at = now()
         WHERE id = $3`,
        [newPaid, status, rec.id]
      );
    }
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// POST /api/payments/order — create a Razorpay order for a fee record's balance.
async function createOrder(req, res, next) {
  try {
    if (!pay.isConfigured()) return res.status(503).json({ error: 'Online payments are not configured' });
    const { fee_record_id } = req.body;

    const rec = await db.query(
      `SELECT fr.*, fs.institute_id, fs.title
       FROM fee_records fr JOIN fee_structures fs ON fr.fee_structure_id = fs.id
       WHERE fr.id = $1`,
      [fee_record_id]
    );
    if (rec.rows.length === 0) return res.status(404).json({ error: 'Fee record not found' });
    const r = rec.rows[0];

    if (!(await canAccessFeeRecord(req.user, r))) return res.status(403).json({ error: 'Not authorized' });

    const balance = r.amount_due - r.amount_paid;
    if (balance <= 0) return res.status(400).json({ error: 'This fee is already fully paid' });

    const order = await pay.getClient().orders.create({
      amount: balance * 100, // paise
      currency: 'INR',
      receipt: `fee_${r.id}`,
      notes: { fee_record_id: r.id },
    });

    await db.query(
      `INSERT INTO payments (institute_id, fee_record_id, razorpay_order_id, amount, currency, status, created_by)
       VALUES ($1, $2, $3, $4, 'INR', 'created', $5)`,
      [r.institute_id, r.id, order.id, order.amount, req.user.id]
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: pay.keyId(),
      fee: { id: r.id, title: r.title, balance },
    });
  } catch (err) { next(err); }
}

// POST /api/payments/verify — called by the SPA after Checkout succeeds, for an
// instant confirmation. The webhook is the authoritative backstop.
async function verify(req, res, next) {
  try {
    if (!pay.isConfigured()) return res.status(503).json({ error: 'Online payments are not configured' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, pay.keySecret())) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    const result = await reconcile(razorpay_order_id, razorpay_payment_id);
    if (!result.ok) return res.status(404).json({ error: 'Unknown order' });
    res.json({ status: 'paid' });
  } catch (err) { next(err); }
}

// POST /api/payments/webhook — Razorpay server-to-server callback (no auth;
// authenticity comes from the HMAC signature over the raw body).
async function webhook(req, res, next) {
  try {
    const secret = pay.webhookSecret();
    if (!secret) return res.status(503).end();
    const signature = req.headers['x-razorpay-signature'];
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    if (!verifyWebhookSignature(raw, signature, secret)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = req.body.payload && req.body.payload.payment && req.body.payload.payment.entity;
      if (entity && entity.order_id) await reconcile(entity.order_id, entity.id);
    }
    res.json({ received: true });
  } catch (err) { next(err); }
}

module.exports = { createOrder, verify, webhook, reconcile, canAccessFeeRecord };
