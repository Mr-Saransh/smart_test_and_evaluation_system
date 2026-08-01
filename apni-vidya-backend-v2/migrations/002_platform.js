// Migration 002 — remaining platform modules.
// Builds on 001 (run.js): users, institutes, teachers, batches, courses, enrollment_requests, students.

const migration = `

-- Fee structures: set once per batch/course, system reminds before due date
CREATE TABLE IF NOT EXISTS fee_structures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  total_amount  INTEGER NOT NULL,
  currency      VARCHAR(3) DEFAULT 'INR',
  due_date      DATE,
  reminder_days INTEGER DEFAULT 3,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Per-student fee records (auto-created when a fee structure is assigned to a batch)
CREATE TABLE IF NOT EXISTS fee_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_due    INTEGER NOT NULL,
  amount_paid   INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date      DATE,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fee_structure_id, student_id)
);

-- Attendance: one row per student per day per batch
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by     UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Question bank (MCQ + subjective). Topic powers weak-topic / SWOT analysis.
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  subject       VARCHAR(100) NOT NULL,
  topic         VARCHAR(150),
  type          VARCHAR(20) DEFAULT 'mcq' CHECK (type IN ('mcq', 'subjective')),
  text          TEXT NOT NULL,
  options       JSONB,            -- array of option strings for MCQ
  correct_index INTEGER,          -- index of correct option for MCQ
  marks         INTEGER DEFAULT 4,
  negative_marks INTEGER DEFAULT 0,
  difficulty    VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Tests
CREATE TABLE IF NOT EXISTS tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  title         VARCHAR(255) NOT NULL,
  subject       VARCHAR(100),
  duration_min  INTEGER DEFAULT 30,
  total_marks   INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Test <-> question join, preserving order and per-test marks snapshot
CREATE TABLE IF NOT EXISTS test_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  UNIQUE(test_id, question_id)
);

-- Test submissions (one per student per test). answers is { question_id: chosen_index }
CREATE TABLE IF NOT EXISTS test_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers       JSONB NOT NULL DEFAULT '{}',
  subjective_marks JSONB DEFAULT '{}',
  score         INTEGER DEFAULT 0,
  max_marks     INTEGER DEFAULT 0,
  rank          INTEGER,
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, student_id)
);

-- Study planner tasks set by teacher; students tick them done
CREATE TABLE IF NOT EXISTS study_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_task_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES study_tasks(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, student_id)
);

-- Announcements / broadcast
CREATE TABLE IF NOT EXISTS announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,  -- null = all batches
  created_by    UUID REFERENCES users(id),
  title         VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL,
  audience      VARCHAR(20) DEFAULT 'all' CHECK (audience IN ('all', 'students', 'parents')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Shareable portfolio token on students
ALTER TABLE students ADD COLUMN IF NOT EXISTS portfolio_token VARCHAR(32) UNIQUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_records_student ON fee_records(student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_questions_institute ON questions(institute_id, subject);
CREATE INDEX IF NOT EXISTS idx_tests_batch ON tests(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test ON test_submissions(test_id, score);
CREATE INDEX IF NOT EXISTS idx_study_tasks_batch ON study_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_institute ON announcements(institute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_students_portfolio_token ON students(portfolio_token);

-- Force a password change on first login for auto-provisioned student/parent accounts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;
`;

module.exports = { name: '002_platform', sql: migration };
