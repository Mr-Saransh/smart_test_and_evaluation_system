// Migration 004 — outbound notification log (SMS / WhatsApp).
// Every dispatch attempt is recorded here so we have an audit trail, can show
// delivery status in the UI, and can retry failures.

const migration = `

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  channel       VARCHAR(15) NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  category      VARCHAR(30) NOT NULL DEFAULT 'custom'
                  CHECK (category IN ('fee_reminder', 'planner_reminder', 'announcement', 'custom')),
  recipient_phone   VARCHAR(20) NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  status        VARCHAR(15) NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'sent', 'failed')),
  provider      VARCHAR(30),                 -- 'msg91' | 'gupshup' | 'console'
  provider_message_id VARCHAR(120),
  error         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  sent_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_institute ON notifications(institute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
`;

module.exports = { name: '004_notifications', sql: migration };
