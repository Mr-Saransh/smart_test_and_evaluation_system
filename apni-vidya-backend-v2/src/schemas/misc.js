const { z } = require('zod');
const { phone } = require('./auth');

// Public enrollment form (unauthenticated — the most exposed endpoint, so it
// gets the strictest shape).
const enrollmentSchema = z.object({
  student_name: z.string().trim().min(2, 'Student name is required').max(120),
  student_phone: phone,
  parent_name: z.string().trim().max(120).optional().or(z.literal('')),
  parent_phone: phone.optional().or(z.literal('')),
  batch_id: z.string().uuid('Invalid batch').optional().or(z.literal('')).or(z.null()),
});

// Recording a fee payment.
const feePaymentSchema = z.object({
  amount: z.coerce.number().positive('A positive amount is required'),
});

module.exports = { enrollmentSchema, feePaymentSchema };
