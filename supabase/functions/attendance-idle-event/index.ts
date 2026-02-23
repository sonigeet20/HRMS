import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';

const idleEventSchema = z.object({
  idle_minutes: z.number().min(0),
  started_at: z.string().datetime(),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(idleEventSchema, body);
    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance } = await supabase
      .from('attendance_days')
      .select('id, idle_minutes')
      .eq('user_id', ctx.userId)
      .eq('date', today)
      .single();

    if (!attendance) {
      return errorResponse('No attendance record for today');
    }

    // Increment idle minutes
    const newIdleMinutes = (attendance.idle_minutes || 0) + input.idle_minutes;
    await supabase
      .from('attendance_days')
      .update({ idle_minutes: newIdleMinutes })
      .eq('id', attendance.id);

    // Log idle event
    await supabase.from('attendance_events').insert({
      user_id: ctx.userId,
      organization_id: ctx.orgId,
      attendance_day_id: attendance.id,
      event_type: 'IDLE_START',
      payload: { idle_minutes: input.idle_minutes, started_at: input.started_at },
    });

    // Check policy threshold and notify
    const { data: profile } = await supabase
      .from('profiles')
      .select('hr_policy_id, full_name')
      .eq('user_id', ctx.userId)
      .single();

    if (profile?.hr_policy_id) {
      const { data: policy } = await supabase
        .from('hr_policies')
        .select('idle_threshold_minutes')
        .eq('id', profile.hr_policy_id)
        .single();

      if (policy && input.idle_minutes >= policy.idle_threshold_minutes) {
        // Notify HR/Admin
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
              p_type: 'IDLE_THRESHOLD',
              p_title: 'Idle Time Alert',
              p_message: `${profile.full_name} has been idle for ${input.idle_minutes} minutes.`,
              p_metadata: { employee_user_id: ctx.userId, idle_minutes: input.idle_minutes },
            });
          }
        }
      }
    }

    return jsonResponse({ success: true, total_idle_minutes: newIdleMinutes }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return errorResponse(message, message === 'Unauthorized' ? 401 : 400);
  }
});
