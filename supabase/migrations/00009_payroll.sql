-- Payroll Profiles
CREATE TABLE payroll_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  salary_structure JSONB,
  payment_method TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_profiles_org ON payroll_profiles(organization_id);

CREATE TRIGGER trg_payroll_profiles_updated_at
  BEFORE UPDATE ON payroll_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Payroll Runs
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  status payroll_run_status NOT NULL DEFAULT 'PENDING',
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  started_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_runs_org_month ON payroll_runs(organization_id, month);

-- Payslips
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  working_days INTEGER NOT NULL,
  lop_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  payable_days NUMERIC(5,1) NOT NULL,
  gross_pay NUMERIC(12,2) NOT NULL,
  lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}',
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_payslips_user_month_version ON payslips(user_id, month, version, organization_id);
CREATE INDEX idx_payslips_org_month ON payslips(organization_id, month);
CREATE INDEX idx_payslips_run ON payslips(payroll_run_id);
