import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';

const schema = z.object({
  device_name: z.string().min(1),
  device_os: z.enum(['macos', 'windows', 'linux']),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(schema, body);
    const supabase = getServiceClient();

    // Deactivate existing sessions for this device
    await supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('user_id', ctx.userId)
      .eq('device_name', input.device_name);

    // Create new session
    const { data: session, error } = await supabase
      .from('device_sessions')
      .insert({
        user_id: ctx.userId,
        organization_id: ctx.orgId,
        device_name: input.device_name,
        device_os: input.device_os,
      })
      .select('id, session_key')
      .single();

    if (error) throw error;

    return jsonResponse({
      success: true,
      session_id: session!.id,
      session_key: session!.session_key,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return errorResponse(message, message === 'Unauthorized' ? 401 : 400);
  }
});
