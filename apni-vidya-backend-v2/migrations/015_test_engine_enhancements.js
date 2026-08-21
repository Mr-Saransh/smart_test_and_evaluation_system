// Migration 015 — Test & Assessment Engine Enhancements
// Adds anti-cheat security audit logging, flexible scoring rates, question explanations & source tracking.

const migration = `

-- 1. Submissions anti-cheat events and status
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS security_events JSONB DEFAULT '[]';
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'submitted';
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS auto_submitted BOOLEAN DEFAULT false;

-- 2. Tests configuration enhancements
ALTER TABLE tests ADD COLUMN IF NOT EXISTS marks_per_question NUMERIC DEFAULT 1;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS negative_marks_per_question NUMERIC DEFAULT 0;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- 3. Questions source and explanation
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- 4. Indexes for rapid batch evaluation analytics & student performance reports
CREATE INDEX IF NOT EXISTS idx_test_submissions_student_sub ON test_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test_score ON test_submissions(test_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_questions_institute_subject ON questions(institute_id, subject);

`;

module.exports = { name: '015_test_engine_enhancements', sql: migration };
