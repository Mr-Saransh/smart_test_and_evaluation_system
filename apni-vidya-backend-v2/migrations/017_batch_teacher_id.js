// Migration 017 — add teacher_id to batches.
// Allows assigning a primary faculty to a batch directly in addition to timetable slots.

const migration = `
ALTER TABLE batches ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON batches(teacher_id);
`;

module.exports = { name: '017_batch_teacher_id', sql: migration };
