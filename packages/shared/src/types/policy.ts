import type { WORK_MODE } from '../constants';

export type WorkMode = (typeof WORK_MODE)[keyof typeof WORK_MODE];

export interface HrPolicy {
  id: string;
  organization_id: string;
  name: string;
  work_mode: WorkMode;
  location_enforced: boolean;
  office_wifi_enforced: boolean;
  wfh_fallback_on_outside_office: boolean;
  block_outside_office_checkin: boolean;
  idle_threshold_minutes: number;
  count_absent_as_lop: boolean;
  count_non_compliant_as_lop: boolean;
  weekend_days: number[];
  created_at: string;
  updated_at: string;
}

export interface HolidayCalendar {
  id: string;
  organization_id: string;
  name: string;
  year: number;
  location_id: string | null;
  created_at: string;
}

export interface Holiday {
  id: string;
  calendar_id: string;
  name: string;
  date: string;
  is_optional: boolean;
  created_at: string;
}
