import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { logAudit } from '../_shared/audit.ts';

const leaveApplySchema = z.object({
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(1000),
}).refine(d => d.end_date >= d.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(leaveApplySchema, body);
    const supabase = getServiceClient();

    // Get leave type
    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', input.leave_type_id)
      .eq('organization_id', ctx.orgId)
      .single();

    if (!leaveType) return errorResponse('Invalid leave type');

    // Get profile for policy
    const { data: profile } = await supabase
      .from('profiles')
      .select('hr_policy_id, full_name')
      .eq('user_id', ctx.userId)
      .single();

    // Get weekends from policy
    let weekendDays = [0, 6];
    if (profile?.hr_policy_id) {
      const { data: policy } = await supabase
        .from('hr_policies')
        .select('weekend_days')
        .eq('id', profile.hr_policy_id)
        .single();
      if (policy?.weekend_days) weekendDays = policy.weekend_days;
    }

    // Get holidays for the date range
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date, calendar_id')
      .gte('date', input.start_date)
      .lte('date', input.end_date);

    const holidayDates = new Set((holidays ?? []).map(h => h.date));

    // Count working days
    let totalDays = 0;
    const current = new Date(input.start_date);
    const end = new Date(input.end_date);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      if (!weekendDays.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
        totalDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (totalDays <= 0) return errorResponse('No working days in selected range');

    // Check leave balance (for paid leaves)
    if (leaveType.is_paid) {
      const year = new Date(input.start_date).getFullYear();
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('balance')
        .eq('user_id', ctx.userId)
        .eq('leave_type_id', input.leave_type_id)
        .eq('year', year)
        .single();

      if (balance && balance.balance < totalDays) {
        return errorResponse(`Insufficient leave balance. Available: ${balance.balance}, Requested: ${totalDays}`);
      }
    }

    // Create leave request
    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: ctx.userId,
        organization_id: ctx.orgId,
        leave_type_id: input.leave_type_id,
        start_date: input.start_date,
        end_date: input.end_date,
        total_days: totalDays,
        reason: input.reason,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Update pending count in balance
    if (leaveType.is_paid) {
      const year = new Date(input.start_date).getFullYear();
      await supabase.rpc('', {}); // We'll handle via direct update
      await supabase
        .from('leave_balances')
        .update({ total_pending: totalDays })
        .eq('user_id', ctx.userId)
        .eq('leave_type_id', input.leave_type_id)
        .eq('year', year);
    }

    // Notify HR/Manager
    const { data: hrAdmins } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', ctx.orgId)
      .in('role', ['HR', 'ADMIN']);

    if (hrAdmins) {
      for (const admin of hrAdmins) {
        await supabase.rpc('create_notification', {
          p_user_id: admin.user_id,
          p_org_id: ctx.orgId,
          p_type: 'LEAVE_APPLIED',
          p_title: 'Leave Application',
          p_message: `${profile?.full_name ?? 'Employee'} applied for ${leaveType.name} (${totalDays} days)`,
          p_metadata: { leave_request_id: request!.id },
        });
      }
    }

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'LEAVE_APPLY',
      resourceType: 'leave_requests',
      resourceId: request!.id,
      newValue: { leave_type: leaveType.name, total_days: totalDays, start_date: input.start_date, end_date: input.end_date },
    });

    return jsonResponse({
      success: true,
      leave_request_id: request!.id,
      total_days: totalDays,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return errorResponse(message, message === 'Unauthorized' ? 401 : 400);
  }
});
