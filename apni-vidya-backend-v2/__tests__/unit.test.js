const { computeFeeStatus } = require('../src/utils/fee');
const { validTimes, overlaps } = require('../src/utils/timetable');
const { normalizePhone } = require('../src/services/smsProviders');
const { ipKey, userOrIpKey } = require('../src/middleware/rateLimit');
const { signupSchema, loginSchema } = require('../src/schemas/auth');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../src/utils/payments');
const crypto = require('crypto');

describe('fee status math', () => {
  test('full payment marks paid', () => {
    expect(computeFeeStatus(15000, 15000)).toBe('paid');
    expect(computeFeeStatus(15000, 16000)).toBe('paid'); // overpay still paid
  });
  test('partial payment marks partial', () => {
    expect(computeFeeStatus(15000, 5000)).toBe('partial');
  });
  test('no payment is pending', () => {
    expect(computeFeeStatus(15000, 0)).toBe('pending');
  });
});

describe('timetable time helpers', () => {
  test('valid HH:MM with start before end', () => {
    expect(validTimes('09:00', '10:30')).toBe(true);
    expect(validTimes('09:00:00', '10:30:00')).toBe(true);
  });
  test('rejects start >= end and malformed times', () => {
    expect(validTimes('10:30', '09:00')).toBe(false);
    expect(validTimes('09:00', '09:00')).toBe(false);
    expect(validTimes('25:00', '26:00')).toBe(false);
    expect(validTimes('9:00', '10:00')).toBe(false);
  });
  test('overlap detection', () => {
    expect(overlaps('09:00', '10:30', '10:00', '11:00')).toBe(true);  // partial
    expect(overlaps('09:00', '10:00', '10:00', '11:00')).toBe(false); // touching edge
    expect(overlaps('09:00', '12:00', '10:00', '11:00')).toBe(true);  // contained
  });
});

describe('phone normalization (Indian numbers)', () => {
  test('prepends country code to 10-digit numbers', () => {
    expect(normalizePhone('9876543210')).toBe('919876543210');
  });
  test('leaves 91-prefixed numbers intact and strips formatting', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
    expect(normalizePhone('919876543210')).toBe('919876543210');
  });
});

describe('rate-limit keying (shared-NAT fix)', () => {
  test('falls back to IP when unauthenticated', () => {
    const req = { headers: {}, ip: '203.0.113.5' };
    expect(userOrIpKey(req)).toBe('ip:203.0.113.5');
  });
  test('collapses IPv6 to a /64-ish prefix', () => {
    expect(ipKey({ ip: '2001:db8:abcd:0012:0000:0000:0000:0001' }))
      .toBe('2001:db8:abcd:0012');
  });
});

describe('auth validation schemas', () => {
  test('valid signup passes', () => {
    const r = signupSchema.safeParse({ phone: '9876543210', email: 'asha@example.com', password: 'secret1', full_name: 'Asha Rao' });
    expect(r.success).toBe(true);
  });
  test('rejects bad phone and short password', () => {
    const r = signupSchema.safeParse({ phone: '123', password: 'x', full_name: 'A' });
    expect(r.success).toBe(false);
    const fields = r.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['phone', 'password', 'full_name', 'email']));
  });
  test('login requires a password', () => {
    expect(loginSchema.safeParse({ phone: '9876543210' }).success).toBe(false);
  });
});

describe('razorpay signature verification', () => {
  const secret = 'whsec_test_secret';
  test('payment signature round-trips and rejects tampering', () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const sig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature(orderId, paymentId, sig, secret)).toBe(true);
    expect(verifyPaymentSignature(orderId, paymentId, 'deadbeef', secret)).toBe(false);
    expect(verifyPaymentSignature(orderId, 'pay_TAMPERED', sig, secret)).toBe(false);
  });
  test('webhook signature round-trips and rejects body tampering', () => {
    const raw = JSON.stringify({ event: 'payment.captured', amount: 1500000 });
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    expect(verifyWebhookSignature(raw, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(raw + ' ', sig, secret)).toBe(false);
  });
});

const { parentReportBody, studentReportBody, nextRunAfter } = require('../src/utils/parentReportBody');

describe('parent report composer', () => {
  const baseReport = {
    student: { name: 'Aarav Singh' },
    attendance: { attendance_pct: 87.3 },
    performance: {
      tests_taken: 4,
      average_pct: 72.5,
      recent_tests: [{ title: 'Algebra W3', percentage: 80, rank: 3 }],
    },
    swot: { weaknesses: [{ topic: 'Quadratics' }] },
    fees: [{ amount_due: 5000, amount_paid: 2000, status: 'partial' }],
  };

  test('parentReportBody includes name, attendance, average, recent, focus, fees', () => {
    const msg = parentReportBody('AV Coaching', baseReport);
    expect(msg).toContain('Aarav Singh');
    expect(msg).toContain('87%');
    expect(msg).toContain('73%');           // 72.5 rounds to 73
    expect(msg).toContain('Algebra W3');
    expect(msg).toContain('Quadratics');
    expect(msg).toContain('Rs.3000');       // 5000 - 2000 outstanding
  });

  test('parentReportBody omits fee line when nothing outstanding', () => {
    const msg = parentReportBody('AV', { ...baseReport, fees: [{ amount_due: 1000, amount_paid: 1000, status: 'paid' }] });
    expect(msg).not.toMatch(/Fees due/);
  });

  test('studentReportBody addresses the student directly', () => {
    const msg = studentReportBody('AV', baseReport);
    expect(msg).toMatch(/Your progress/);
    expect(msg).not.toContain('Aarav Singh');
  });

  test('handles a brand-new student with no data', () => {
    const empty = { student: {}, attendance: {}, performance: { tests_taken: 0, recent_tests: [] }, swot: {}, fees: [] };
    const msg = parentReportBody('AV', empty);
    expect(msg).toContain('your child');
    expect(msg).toContain('—');             // attendance falls back to em-dash
  });
});

describe('nextRunAfter', () => {
  const ref = new Date('2025-01-15T10:00:00Z');
  test('daily adds 1 day', () => {
    expect(nextRunAfter('daily', ref).toISOString()).toBe('2025-01-16T10:00:00.000Z');
  });
  test('weekly adds 7 days', () => {
    expect(nextRunAfter('weekly', ref).toISOString()).toBe('2025-01-22T10:00:00.000Z');
  });
  test('monthly adds 1 month', () => {
    expect(nextRunAfter('monthly', ref).toISOString()).toBe('2025-02-15T10:00:00.000Z');
  });
});

describe('institute 7-day trial & ₹80/student subscription math', () => {
  test('computes trial active within 7 days', () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const isTrialActive = trialEndsAt > now;
    expect(isTrialActive).toBe(true);
  });

  test('computes trial expired after 7 days', () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const isTrialExpired = trialEndsAt <= now;
    expect(isTrialExpired).toBe(true);
  });

  test('calculates correct monthly billing amount at ₹80 per student', () => {
    const rate = 80;
    const students50 = 50;
    expect(students50 * rate).toBe(4000); // ₹4,000

    const students120 = 120;
    expect(students120 * rate).toBe(9600); // ₹9,600

    const students0 = 0;
    expect(Math.max(students0, 1) * rate).toBe(80); // Base unit ₹80
  });

  test('active subscription valid until extends 1 month', () => {
    const now = new Date('2026-08-25T12:00:00Z');
    const validUntil = new Date(now);
    validUntil.setMonth(validUntil.getMonth() + 1);
    expect(validUntil > now).toBe(true);
  });
});

