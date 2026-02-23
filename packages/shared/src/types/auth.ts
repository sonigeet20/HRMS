import type { USER_ROLE } from '../constants';

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  profile_id: string;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_name: string;
  device_os: string;
  session_key: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}
