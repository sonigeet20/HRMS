import type { EMPLOYMENT_TYPE } from '../constants';

export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE];

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  employee_code: string;
  designation: string | null;
  department_id: string | null;
  manager_id: string | null;
  location_id: string | null;
  joining_date: string;
  employment_type: EmploymentType;
  hr_policy_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  allowed_wifi_ssids: string[];
  timezone: string;
  created_at: string;
}
