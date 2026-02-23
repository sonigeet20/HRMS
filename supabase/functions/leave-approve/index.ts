import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext, requireRole } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { logAudit } from '../_shared/audit.ts';

const approveSchema = z.object({
  leave_request_id: z.string().uuid(),
  action: z.enum(['APPROVED', 'REJECTED']),
  rejection_reason: z.string().max(1000).optional(),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    requireRole(ctx, 'HR', 'ADMIN');

    const body = await req.json();
    const input = validateInput(approveSchema, body);
    const supabase = getServiceClient();

    // Get leave request
    const { data: request } = await supabase
      .from('leave_requests')
      .select('*, leave_types(*)')
      .eq('id', input.leave_request_id)
      .eq('organization_id', ctx.orgId)
      .single();

    if (!request) return errorResponse('Leave request not found');
    if (request.status !== 'PENDING') return errorResponse('Request is not pending');

    const now = new Date().toISOString();

    // Update request status
    await supabase
      .from('leave_requests')
      .update({
        status: input.action,
        approved_by: ctx.userId,
        approved_at: now,
        rejection_reason: input.rejection_reason ?? null,
      })
      .eq('id', request.id);

    const year = new Date(request.start_date).getFullYear();

    if (input.action === 'APPROVED') {
      // Update leave balance
      if (request.leave_types.is_paid) {
        await supabase
          .from('leave_balances')
          .update({
            total_used: request.total_days,
            total_pending: 0,
          })
          .eq('user_id', request.user_id)
          .eq('leave_type_id', request.leave_type_id)
          .eq('year', year);
      }

      // Mark attendance days as LEAVE
      const current = new Date(request.start_date);
      const end = new Date(request.end_date);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();

        // Skip weekends (default Sat/Sun)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          await supabase
            .from('attendance_days')
            .upsert({
              user_id: request.user_id,
              organization_id: ctx.orgId,
              date: dateStr,
              status: 'LEAVE',
              work_mode_detected: 'UNKNOWN',
            }, { onConflict: 'user_id,date' });
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Reset pending balance
      if (request.leave_types.is_paid) {
        await supabase
          .from('leave_balances')
          .update({ total_pending: 0 })
          .eq('user_id', request.user_id)
          .eq('leave_type_id', request.leave_type_id)
          .eq('year', year);
      }
    }

    // Notify employee
    await supabase.rpc('create_notification', {
      p_user_id: request.user_id,
      p_org_id: ctx.orgId,
      p_type: input.action === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      p_title: `Leave ${input.action === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      p_message: input.action === 'APPROVED'
        ? `Your ${request.leave_types.name} request has been approved.`
        : `Your ${request.leave_types.name} request was rejected. ${input.rejection_reason ?? ''}`,
      p_metadata: { leave_request_id: request.id },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: `LEAVE_${input.action}`,
      resourceType: 'leave_requests',
      resourceId: request.id,
      oldValue: { status: 'PENDING' },
      newValue: { status: input.action, rejection_reason: input.rejection_reason },
    });

    return jsonResponse({ success: true, status: input.action }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 400;
    return errorResponse(message, status);
  }
});
