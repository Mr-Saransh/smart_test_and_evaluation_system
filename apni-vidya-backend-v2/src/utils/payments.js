const crypto = require('crypto');

// Constant-time string compare that won't throw on length mismatch.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Razorpay Checkout handler signature: HMAC_SHA256("<order_id>|<payment_id>", key_secret).
function verifyPaymentSignature(orderId, paymentId, signature, keySecret) {
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

// Razorpay webhook signature: HMAC_SHA256(rawBody, webhook_secret).
function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

module.exports = { verifyPaymentSignature, verifyWebhookSignature, safeEqual };
