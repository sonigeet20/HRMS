export type NotificationType =
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'IDLE_THRESHOLD'
  | 'NON_COMPLIANT'
  | 'PAYSLIP_GENERATED'
  | 'FEEDBACK_RECEIVED'
  | 'POLICY_CHANGED';

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AnonymousFeedback {
  id: string;
  organization_id: string;
  user_hash: string;
  category: string;
  content: string;
  moderation_status: 'PENDING' | 'APPROVED' | 'FLAGGED';
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
