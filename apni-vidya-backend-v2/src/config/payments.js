const Razorpay = require('razorpay');

// Razorpay is optional: the app runs fine without payment keys, and payment
// endpoints return a clear "not configured" error until they're set. The client
// is created lazily so a missing key never breaks startup.
let _client = null;

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getClient() {
  if (!isConfigured()) return null;
  if (!_client) {
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _client;
}

module.exports = {
  isConfigured,
  getClient,
  keyId: () => process.env.RAZORPAY_KEY_ID || null,
  keySecret: () => process.env.RAZORPAY_KEY_SECRET || null,
  webhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET || null,
};
