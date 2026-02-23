-- Attendance Days
CREATE TABLE attendance_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'ABSENT',
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  worked_minutes INTEGER NOT NULL DEFAULT 0,
  idle_minutes INTEGER NOT NULL DEFAULT 0,
  work_mode_detected work_mode_detected NOT NULL DEFAULT 'UNKNOWN',
  office_compliant BOOLEAN,
  location_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_attendance_days_user_date ON attendance_days(user_id, date);
CREATE INDEX idx_attendance_days_org_date ON attendance_days(organization_id, date);
CREATE INDEX idx_attendance_days_status ON attendance_days(organization_id, status);

CREATE TRIGGER trg_attendance_days_updated_at
  BEFORE UPDATE ON attendance_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Attendance Events
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attendance_day_id UUID NOT NULL REFERENCES attendance_days(id) ON DELETE CASCADE,
  event_type attendance_event_type NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_events_day ON attendance_events(attendance_day_id);
CREATE INDEX idx_attendance_events_user_type ON attendance_events(user_id, event_type);
