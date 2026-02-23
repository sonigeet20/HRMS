-- Profiles table linked to auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  employee_code TEXT NOT NULL,
  designation TEXT,
  department_id UUID,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  location_id UUID,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employment_type employment_type NOT NULL DEFAULT 'FULL_TIME',
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  hr_policy_id UUID,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_employee_code_org ON profiles(employee_code, organization_id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
