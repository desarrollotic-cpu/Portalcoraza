-- Scheduling domain

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE shift_type AS ENUM ('DAY', 'NIGHT', 'REST');

CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE RESTRICT,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  shift_type shift_type NOT NULL,
  workday_hours INTEGER NOT NULL CHECK (workday_hours IN (8, 12)),
  shift_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shift_schedules
  ADD CONSTRAINT no_overlap_associate
  EXCLUDE USING gist (
    associate_id WITH =,
    daterange(shift_date, shift_date, '[]') WITH &&
  );

CREATE INDEX IF NOT EXISTS idx_shift_schedules_post_date ON shift_schedules(post_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_associate_date ON shift_schedules(associate_id, shift_date);

CREATE TRIGGER shift_schedules_updated_at BEFORE UPDATE ON shift_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
