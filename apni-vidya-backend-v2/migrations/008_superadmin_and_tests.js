// Migration 008 — superadmin and test enhancements.

const migration = `

-- 1. Update users role check constraint to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'institute_admin', 'teacher', 'student', 'parent'));

-- 2. Add chapter to questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS chapter VARCHAR(150);

-- 3. Add test fields for better management
ALTER TABLE tests ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS chapter VARCHAR(150);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE tests ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS attempt_limit INTEGER DEFAULT 1;

-- 4. Test submissions updates for attempts and time
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS time_taken_min INTEGER DEFAULT 0;

-- Drop the old unique constraint (test_id, student_id)
ALTER TABLE test_submissions DROP CONSTRAINT IF EXISTS test_submissions_test_id_student_id_key;

-- Add new unique constraint (test_id, student_id, attempt_number)
ALTER TABLE test_submissions DROP CONSTRAINT IF EXISTS test_submissions_test_id_student_id_attempt_number_key;
ALTER TABLE test_submissions ADD CONSTRAINT test_submissions_test_id_student_id_attempt_number_key UNIQUE(test_id, student_id, attempt_number);

`;

module.exports = { name: '008_superadmin_and_tests', sql: migration };
