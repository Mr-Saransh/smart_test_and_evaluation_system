// Migration 010 — Student admission overhaul.
// Adds profile_completed flag to users, address and date_of_birth to students.

const migration = `
-- Add profile_completed flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add address and date_of_birth to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Mark all existing users as profile_completed so they are not forced to set up again
UPDATE users SET profile_completed = true WHERE role IN ('institute_admin', 'teacher', 'parent', 'super_admin');
UPDATE users SET profile_completed = true
  WHERE role = 'student'
    AND id IN (SELECT user_id FROM students WHERE user_id IS NOT NULL);
`;

module.exports = { name: '010_student_admission', sql: migration };
