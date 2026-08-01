// Migration 005 — OTP-based password reset.
// Stores a bcrypt hash of a short-lived one-time code (never the plaintext),
// with expiry and an attempt counter so a leaked row can't be brute-forced.

const migration = `

CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(15) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER DEFAULT 0,
  consumed    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_phone ON password_resets(phone, created_at DESC);
`;

module.exports = { name: '005_password_resets', sql: migration };
