const express = require('express');
const router = express.Router();
const { z } = require('zod');
const payment = require('../controllers/payment');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const orderSchema = z.object({ fee_record_id: z.string().uuid('Invalid fee record') });

// Parents/students/staff create an order for a fee record's outstanding balance.
router.post('/order', authenticate, validate(orderSchema), payment.createOrder);
// SPA confirms a successful Checkout (signature-verified).
router.post('/verify', authenticate, payment.verify);
// Razorpay server-to-server webhook — no auth; verified by HMAC signature.
router.post('/webhook', payment.webhook);

module.exports = router;
