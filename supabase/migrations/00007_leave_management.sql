-- Leave Types
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  max_days_per_year NUMERIC(5,1) NOT NULL DEFAULT 12,
  accrual_frequency accrual_frequency NOT NULL DEFAULT 'MONTHLY',
  carry_forward_limit NUMERIC(5,1) NOT NULL DEFAULT 0,
  max_balance NUMERIC(5,1) NOT NULL DEFAULT 24,
  pro_rate_on_join BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leave_types_code_org ON leave_types(code, organization_id);

-- Leave Policies
CREATE TABLE leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  approval_flow leave_approval_flow NOT NULL DEFAULT 'MANAGER_THEN_HR',
  allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
  min_notice_days INTEGER NOT NULL DEFAULT 0,
  max_consecutive_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Balances
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_accrued NUMERIC(5,1) NOT NULL DEFAULT 0,
  total_used NUMERIC(5,1) NOT NULL DEFAULT 0,
  total_pending NUMERIC(5,1) NOT NULL DEFAULT 0,
  carry_forwarded NUMERIC(5,1) NOT NULL DEFAULT 0,
  balance NUMERIC(5,1) GENERATED ALWAYS AS (total_accrued + carry_forwarded - total_used - total_pending) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leave_balances_user_type_year ON leave_balances(user_id, leave_type_id, year);

-- Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_org_status ON leave_requests(organization_id, status);

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
