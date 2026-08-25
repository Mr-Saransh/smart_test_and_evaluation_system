// Migration 016 - Institute 7-Day Free Trial & ₹80/Student Monthly Subscription

const migration = `

-- 1. Add subscription & trial fields to institutes table
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days');
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS subscription_valid_until TIMESTAMPTZ;
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS plan_price_per_student INTEGER DEFAULT 80;

-- Backfill existing institutes with trial_ends_at if null
UPDATE institutes 
SET trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '7 days')
WHERE trial_ends_at IS NULL;

-- Backfill subscription_status for existing institutes
UPDATE institutes
SET subscription_status = CASE 
  WHEN subscription_valid_until IS NOT NULL AND subscription_valid_until > now() THEN 'active'
  WHEN trial_ends_at > now() THEN 'trial'
  ELSE 'expired'
END
WHERE subscription_status IS NULL OR subscription_status = 'trial';

-- 2. Create institute_subscriptions table for monthly payments
CREATE TABLE IF NOT EXISTS institute_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(64) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(64),
  student_count       INTEGER NOT NULL DEFAULT 0,
  batch_count         INTEGER NOT NULL DEFAULT 0,
  amount              INTEGER NOT NULL,         -- paise (Rupees * 100)
  rate_per_student    INTEGER NOT NULL DEFAULT 80,
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_sub_institute ON institute_subscriptions(institute_id);
CREATE INDEX IF NOT EXISTS idx_inst_sub_order ON institute_subscriptions(razorpay_order_id);
`;

module.exports = { name: '016_institute_trials_and_subscriptions', sql: migration };
