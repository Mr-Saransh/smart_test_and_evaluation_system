const { z } = require('zod');

// Indian mobile numbers: 10 digits, optionally prefixed with +91 / 91 / 0.
const phone = z.string().trim().regex(/^(\+?91|0)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
const password = z.string().min(6, 'Password must be at least 6 characters').max(128);

const signupSchema = z.object({
  phone,
  password,
  full_name: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  role: z.enum(['institute_admin', 'teacher']).optional(),
});

const loginSchema = z.object({
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.phone || data.email || data.identifier, {
  message: 'Enter a valid 10-digit mobile number or email address',
  path: ['phone'],
});

const changePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: password,
});

const forgotSchema = z.object({ phone });

const resetSchema = z.object({
  phone,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  new_password: password,
});

module.exports = {
  signupSchema, loginSchema, changePasswordSchema, forgotSchema, resetSchema, phone, password,
};
