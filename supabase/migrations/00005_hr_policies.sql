-- HR Policies
CREATE TABLE hr_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  work_mode work_mode NOT NULL DEFAULT 'HYBRID',
  location_enforced BOOLEAN NOT NULL DEFAULT true,
  office_wifi_enforced BOOLEAN NOT NULL DEFAULT false,
  wfh_fallback_on_outside_office BOOLEAN NOT NULL DEFAULT true,
  block_outside_office_checkin BOOLEAN NOT NULL DEFAULT false,
  idle_threshold_minutes INTEGER NOT NULL DEFAULT 30,
  count_absent_as_lop BOOLEAN NOT NULL DEFAULT true,
  count_non_compliant_as_lop BOOLEAN NOT NULL DEFAULT false,
  weekend_days INTEGER[] NOT NULL DEFAULT '{0,6}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_policies_org ON hr_policies(organization_id);

CREATE TRIGGER trg_hr_policies_updated_at
  BEFORE UPDATE ON hr_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK to profiles
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_hr_policy FOREIGN KEY (hr_policy_id) REFERENCES hr_policies(id) ON DELETE SET NULL;
