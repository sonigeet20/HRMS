-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==================== ORGANIZATIONS ====================
CREATE POLICY "Users can read own org"
  ON organizations FOR SELECT
  USING (id = auth_org_id());

CREATE POLICY "Admin can update own org"
  ON organizations FOR UPDATE
  USING (id = auth_org_id() AND auth_role() = 'ADMIN');

-- ==================== PROFILES ====================
CREATE POLICY "Employee reads own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org profiles"
  ON profiles FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

CREATE POLICY "HR/Admin can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

CREATE POLICY "HR/Admin can update profiles"
  ON profiles FOR UPDATE
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

CREATE POLICY "Employee can update own non-sensitive fields"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==================== DEPARTMENTS ====================
CREATE POLICY "Org members can read departments"
  ON departments FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can manage departments"
  ON departments FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== LOCATIONS ====================
CREATE POLICY "Org members can read locations"
  ON locations FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "Admin can manage locations"
  ON locations FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() = 'ADMIN');

-- ==================== HR POLICIES ====================
CREATE POLICY "Org members can read policies"
  ON hr_policies FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can manage policies"
  ON hr_policies FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== HOLIDAY CALENDARS ====================
CREATE POLICY "Org members can read calendars"
  ON holiday_calendars FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can manage calendars"
  ON holiday_calendars FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== HOLIDAYS ====================
CREATE POLICY "Org members can read holidays"
  ON holidays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM holiday_calendars hc
      WHERE hc.id = holidays.calendar_id
      AND hc.organization_id = auth_org_id()
    )
  );

CREATE POLICY "HR/Admin can manage holidays"
  ON holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM holiday_calendars hc
      WHERE hc.id = holidays.calendar_id
      AND hc.organization_id = auth_org_id()
      AND auth_role() IN ('HR', 'ADMIN')
    )
  );

-- ==================== LEAVE TYPES ====================
CREATE POLICY "Org members can read leave types"
  ON leave_types FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can manage leave types"
  ON leave_types FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== LEAVE POLICIES ====================
CREATE POLICY "Org members can read leave policies"
  ON leave_policies FOR SELECT
  USING (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can manage leave policies"
  ON leave_policies FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== LEAVE BALANCES ====================
CREATE POLICY "Employee reads own balances"
  ON leave_balances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org balances"
  ON leave_balances FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== LEAVE REQUESTS ====================
CREATE POLICY "Employee reads own requests"
  ON leave_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org requests"
  ON leave_requests FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

CREATE POLICY "Employee can insert own requests"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = auth_org_id());

CREATE POLICY "Employee can cancel own pending requests"
  ON leave_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'PENDING');

-- ==================== ATTENDANCE DAYS ====================
CREATE POLICY "Employee reads own attendance"
  ON attendance_days FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org attendance"
  ON attendance_days FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== ATTENDANCE EVENTS ====================
CREATE POLICY "Employee reads own events"
  ON attendance_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org events"
  ON attendance_events FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== PAYROLL PROFILES ====================
CREATE POLICY "Employee reads own payroll profile"
  ON payroll_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org payroll profiles"
  ON payroll_profiles FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

CREATE POLICY "HR/Admin can manage payroll profiles"
  ON payroll_profiles FOR ALL
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== PAYROLL RUNS ====================
CREATE POLICY "HR/Admin reads payroll runs"
  ON payroll_runs FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== PAYSLIPS ====================
CREATE POLICY "Employee reads own payslips"
  ON payslips FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "HR/Admin reads org payslips"
  ON payslips FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== ANONYMOUS FEEDBACK ====================
CREATE POLICY "Org members can insert feedback"
  ON anonymous_feedback FOR INSERT
  WITH CHECK (organization_id = auth_org_id());

CREATE POLICY "HR/Admin can read feedback"
  ON anonymous_feedback FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() IN ('HR', 'ADMIN'));

-- ==================== NOTIFICATIONS ====================
CREATE POLICY "User reads own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can update own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ==================== AUDIT LOGS ====================
CREATE POLICY "Admin reads audit logs"
  ON audit_logs FOR SELECT
  USING (organization_id = auth_org_id() AND auth_role() = 'ADMIN');

-- ==================== DEVICE SESSIONS ====================
CREATE POLICY "User reads own device sessions"
  ON device_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can manage own sessions"
  ON device_sessions FOR ALL
  USING (user_id = auth.uid());
