// Migration 003 — weekly timetable.
// A timetable is a set of recurring weekly class slots per batch.
// day_of_week: 0 = Monday ... 6 = Sunday (Indian coaching week is usually Mon–Sat).

const migration = `

CREATE TABLE IF NOT EXISTS timetable_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id      UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  subject       VARCHAR(150) NOT NULL,
  teacher_id    UUID REFERENCES teachers(id) ON DELETE SET NULL,
  room          VARCHAR(100),
  color         VARCHAR(20),                       -- optional UI hint, e.g. '#2563eb'
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_batch_day ON timetable_slots(batch_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_institute ON timetable_slots(institute_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_slots(teacher_id);
`;

module.exports = { name: '003_timetable', sql: migration };
