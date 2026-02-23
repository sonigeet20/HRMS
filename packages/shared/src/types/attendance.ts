import type { ATTENDANCE_STATUS, WORK_MODE_DETECTED } from '../constants';

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];
export type WorkModeDetected = (typeof WORK_MODE_DETECTED)[keyof typeof WORK_MODE_DETECTED];

export interface AttendanceDay {
  id: string;
  user_id: string;
  organization_id: string;
  date: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  worked_minutes: number;
  idle_minutes: number;
  work_mode_detected: WorkModeDetected;
  office_compliant: boolean | null;
  location_snapshot: LocationSnapshot | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  wifi_ssid: string | null;
  timestamp: string;
}

export interface AttendanceEvent {
  id: string;
  user_id: string;
  organization_id: string;
  attendance_day_id: string;
  event_type: 'CHECK_IN' | 'CHECK_OUT' | 'PING' | 'IDLE_START' | 'IDLE_END' | 'LOCATION_UPDATE';
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface CheckInRequest {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  wifi_ssid?: string;
}

export interface CheckInResponse {
  success: boolean;
  attendance_day_id: string;
  status: AttendanceStatus;
  work_mode_detected: WorkModeDetected;
  office_compliant: boolean | null;
  message?: string;
}
