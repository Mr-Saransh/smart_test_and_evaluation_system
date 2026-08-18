// Migration 013 - batch subscription and upgrades
const migration = `

ALTER TABLE batches ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'active' CHECK (payment_status IN ('pending', 'active', 'expired'));

CREATE TABLE IF NOT EXISTS batch_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id            UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(64) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(64),
  amount              INTEGER NOT NULL,         -- paise
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  type                VARCHAR(20) NOT NULL CHECK (type IN ('creation', 'upgrade', 'renewal')),
  additional_capacity INTEGER DEFAULT 0,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_payments_batch ON batch_payments(batch_id);
`;

module.exports = { name: '013_batch_payments', sql: migration };
