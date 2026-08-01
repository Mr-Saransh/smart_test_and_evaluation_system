// Migration 007 — study materials + scheduled parent reports.
//
// Closes the remaining gaps against the Apni Vidya 2.0 journey:
//   * "View time table, study material, and announcements" — study_materials
//   * "Get test score reports automatically (daily/weekly/monthly)" — report_jobs
//
// Also extends the notifications.category check so the new categories
// ('parent_report', 'study_material') can be logged through the existing
// dispatch pipeline.

const migration = `

-- Study material (notes / PDFs / videos / external links) for a batch.
-- We store URLs only; file hosting (S3/Cloudinary) is a deployment concern.
CREATE TABLE IF NOT EXISTS study_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,  -- null = institute-wide
  created_by    UUID REFERENCES users(id),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  subject       VARCHAR(100),
  kind          VARCHAR(20) DEFAULT 'link'
                  CHECK (kind IN ('link', 'pdf', 'video', 'note', 'other')),
  url           TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_materials_batch ON study_materials(batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_materials_institute ON study_materials(institute_id, created_at DESC);

-- Scheduled auto-report jobs. One row per institute per cadence; the cron
-- endpoint walks active jobs whose next_run_at has passed and dispatches
-- a compiled report for every parent in the institute.
CREATE TABLE IF NOT EXISTS report_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  cadence       VARCHAR(10) NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  channel       VARCHAR(15) NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'whatsapp')),
  audience      VARCHAR(10) NOT NULL DEFAULT 'parents' CHECK (audience IN ('parents', 'students', 'both')),
  is_active     BOOLEAN DEFAULT true,
  next_run_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institute_id, cadence, audience)
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_due ON report_jobs(is_active, next_run_at);

-- Extend the notifications.category check to allow the new categories.
-- Postgres has no IF NOT EXISTS for constraints, so drop-then-add.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_category_check
  CHECK (category IN ('fee_reminder', 'planner_reminder', 'announcement',
                      'custom', 'parent_report', 'study_material'));
`;

module.exports = { name: '007_materials_and_reports', sql: migration };
