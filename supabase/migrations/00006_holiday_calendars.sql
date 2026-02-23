-- Holiday Calendars
CREATE TABLE holiday_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_holiday_cal_org_year_loc ON holiday_calendars(organization_id, year, location_id);

-- Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES holiday_calendars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_holidays_calendar ON holidays(calendar_id);
CREATE UNIQUE INDEX idx_holidays_calendar_date ON holidays(calendar_id, date);
