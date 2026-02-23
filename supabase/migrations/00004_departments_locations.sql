-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  head_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_departments_name_org ON departments(name, organization_id);

-- Locations (geofence + wifi)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 200,
  allowed_wifi_ssids TEXT[] DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_org ON locations(organization_id);

-- Add FK to profiles for department_id and location_id
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
