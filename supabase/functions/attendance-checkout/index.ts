import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { logAudit } from '../_shared/audit.ts';

const checkOutSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(checkOutSchema, body);
    const supabase = getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance
    const { data: attendance } = await supabase
      .from('attendance_days')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('date', today)
      .single();

    if (!attendance?.check_in_at) {
      return errorResponse('Not checked in today');
    }
    if (attendance.check_out_at) {
      return errorResponse('Already checked out today');
    }

    const now = new Date().toISOString();
    const checkInTime = new Date(attendance.check_in_at).getTime();
    const checkOutTime = new Date(now).getTime();
    const totalMinutes = Math.round((checkOutTime - checkInTime) / 60000);
    const workedMinutes = Math.max(0, totalMinutes - (attendance.idle_minutes || 0));

    await supabase
      .from('attendance_days')
      .update({
        check_out_at: now,
        worked_minutes: workedMinutes,
      })
      .eq('id', attendance.id);

    // Log event
    await supabase.from('attendance_events').insert({
      user_id: ctx.userId,
      organization_id: ctx.orgId,
      attendance_day_id: attendance.id,
      event_type: 'CHECK_OUT',
      payload: {
        worked_minutes: workedMinutes,
        location: input.latitude ? { latitude: input.latitude, longitude: input.longitude } : null,
      },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'CHECK_OUT',
      resourceType: 'attendance_days',
      resourceId: attendance.id,
      newValue: { check_out_at: now, worked_minutes: workedMinutes },
    });

    return jsonResponse({
      success: true,
      worked_minutes: workedMinutes,
      idle_minutes: attendance.idle_minutes,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return errorResponse(message, message === 'Unauthorized' ? 401 : 400);
  }
});
