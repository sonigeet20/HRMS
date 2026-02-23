import { z } from 'zod';

export const leaveApplySchema = z.object({
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  reason: z.string().min(1).max(1000),
}).refine(data => data.end_date >= data.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const leaveApproveSchema = z.object({
  leave_request_id: z.string().uuid(),
  action: z.enum(['APPROVED', 'REJECTED']),
  rejection_reason: z.string().max(1000).optional(),
});

export type LeaveApplyInput = z.infer<typeof leaveApplySchema>;
export type LeaveApproveInput = z.infer<typeof leaveApproveSchema>;
