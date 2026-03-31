import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { getISTDate } from '../_shared/date.ts';

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  idle_seconds: z.number().min(0).default(0),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(pingSchema, body);
    const supabase = getServiceClient();
    // Use IST date — never UTC, which drifts from Indian calendar before 05:30
    const today = getISTDate();

    const { data: attendance } = await supabase
      .from('attendance_days')
      .select('id, check_in_at')
      .eq('user_id', ctx.userId)
      .eq('date', today)
      .single();

    if (!attendance?.check_in_at) {
      return errorResponse('Not checked in today');
    }

    // Update location snapshot
    if (input.latitude != null) {
      await supabase
        .from('attendance_days')
        .update({
          location_snapshot: {
            latitude: input.latitude,
            longitude: input.longitude,
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', attendance.id);
    }

    // Log ping event
    await supabase.from('attendance_events').insert({
      user_id: ctx.userId,
      organization_id: ctx.orgId,
      attendance_day_id: attendance.id,
      event_type: 'PING',
      payload: {
        latitude: input.latitude,
        longitude: input.longitude,
        idle_seconds: input.idle_seconds,
      },
    });

    // Update device session last seen
    await supabase
      .from('device_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', ctx.userId)
      .eq('is_active', true);

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return errorResponse(message, message === 'Unauthorized' ? 401 : 400);
  }
});
