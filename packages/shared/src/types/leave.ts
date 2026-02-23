import type { LEAVE_STATUS, LEAVE_APPROVAL_FLOW, ACCRUAL_FREQUENCY } from '../constants';

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];
export type LeaveApprovalFlow = (typeof LEAVE_APPROVAL_FLOW)[keyof typeof LEAVE_APPROVAL_FLOW];
export type AccrualFrequency = (typeof ACCRUAL_FREQUENCY)[keyof typeof ACCRUAL_FREQUENCY];

export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_paid: boolean;
  max_days_per_year: number;
  accrual_frequency: AccrualFrequency;
  carry_forward_limit: number;
  max_balance: number;
  pro_rate_on_join: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeavePolicy {
  id: string;
  organization_id: string;
  name: string;
  leave_type_id: string;
  approval_flow: LeaveApprovalFlow;
  allow_negative_balance: boolean;
  min_notice_days: number;
  max_consecutive_days: number | null;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  organization_id: string;
  leave_type_id: string;
  year: number;
  total_accrued: number;
  total_used: number;
  total_pending: number;
  carry_forwarded: number;
  balance: number;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  organization_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveApplyRequest {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}
