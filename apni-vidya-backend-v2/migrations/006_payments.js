// Migration 006 — online payments (Razorpay).
// One row per payment attempt, linked to the fee_record it settles. amount is
// stored in paise (Razorpay's unit). Reconciliation updates fee_records.

const migration = `

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  fee_record_id       UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(64) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(64),
  amount              INTEGER NOT NULL,         -- paise
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_fee_record ON payments(fee_record_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(razorpay_order_id);
`;

module.exports = { name: '006_payments', sql: migration };
