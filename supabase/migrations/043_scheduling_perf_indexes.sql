-- Programación: acelerar cobertura por día y joins schedule→assignments.
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_day
  ON schedule_assignments (schedule_id, day);

CREATE INDEX IF NOT EXISTS idx_monthly_schedules_year_month_post
  ON monthly_schedules (year, month, post_id);
