import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { logAudit } from '../_shared/audit.ts';
import { getISTDate } from '../_shared/date.ts';

const checkInSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().positive().optional(),
  wifi_ssid: z.string().optional(),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    const body = await req.json();
    const input = validateInput(checkInSchema, body);
    const supabase = getServiceClient();
    // Use IST date — never UTC, which drifts from Indian calendar before 05:30
    const today = getISTDate();

    // Check if already checked in today
    const { data: existing } = await supabase
      .from('attendance_days')
      .select('id, check_in_at')
      .eq('user_id', ctx.userId)
      .eq('date', today)
      .single();

    if (existing?.check_in_at) {
      return errorResponse('Already checked in today');
    }

    // Get user profile with policy and location
    const { data: profile } = await supabase
      .from('profiles')
      .select('hr_policy_id, location_id')
      .eq('user_id', ctx.userId)
      .single();

    // Get HR policy
    const { data: policy } = await supabase
      .from('hr_policies')
      .select('*')
      .eq('id', profile?.hr_policy_id)
      .single();

    // Get assigned location
    const { data: location } = await supabase
      .from('locations')
      .select('*')
      .eq('id', profile?.location_id)
      .single();

    // Determine office compliance
    let officeCompliant: boolean | null = null;
    let workModeDetected: 'OFFICE' | 'WFH' | 'UNKNOWN' = 'UNKNOWN';
    // Default to WFH — only override to PRESENT/OFFICE after confirmed geo compliance
    let status: string = 'WFH';

    if (input.latitude != null && input.longitude != null && location) {
      // Check geofence using haversine
      const { data: distance } = await supabase.rpc('haversine_distance', {
        lat1: location.latitude,
        lon1: location.longitude,
        lat2: input.latitude,
        lon2: input.longitude,
      });

      const inGeofence = (distance ?? Infinity) <= location.geofence_radius_meters;
      let wifiMatch = true;

      if (policy?.office_wifi_enforced && location.allowed_wifi_ssids?.length > 0) {
        wifiMatch = input.wifi_ssid ? location.allowed_wifi_ssids.includes(input.wifi_ssid) : false;
      }

      officeCompliant = inGeofence && (policy?.office_wifi_enforced ? wifiMatch : true);
      workModeDetected = officeCompliant ? 'OFFICE' : 'WFH';
    }

    // Apply work mode policy
    if (policy) {
      if (policy.work_mode === 'OFFICE_ONLY') {
        if (!officeCompliant) {
          if (policy.block_outside_office_checkin) {
            return errorResponse('Check-in blocked: You must be at the office location.', 403);
          }
          status = 'NON_COMPLIANT';
          // Notify HR/Admin
          await notifyNonCompliance(supabase, ctx.userId, ctx.orgId);
        } else {
          status = 'PRESENT';
        }
      } else if (policy.work_mode === 'HYBRID') {
        if (officeCompliant) {
          status = 'PRESENT';
        } else if (officeCompliant === false) {
          status = policy.wfh_fallback_on_outside_office ? 'WFH' : 'NON_COMPLIANT';
          if (status === 'NON_COMPLIANT') {
            await notifyNonCompliance(supabase, ctx.userId, ctx.orgId);
          }
        } else {
          // Location unavailable
          status = 'WFH';
        }
      } else if (policy.work_mode === 'WFH_ALLOWED') {
        status = officeCompliant ? 'PRESENT' : 'WFH';
      }
    }

    // Handle location unavailable for OFFICE_ONLY
    if (input.latitude == null && policy?.work_mode === 'OFFICE_ONLY') {
      if (policy.block_outside_office_checkin) {
        return errorResponse('Location required for office-only check-in.', 403);
      }
      status = 'NON_COMPLIANT';
      officeCompliant = null;
    }

    // When no policy exists and no geo was provided, keep WFH default
    // When geo confirms office compliance, status is already set to PRESENT above
    // Sync workModeDetected with final status if geo was unavailable
    if (workModeDetected === 'UNKNOWN') {
      if (status === 'WFH' || status === 'NON_COMPLIANT') workModeDetected = 'WFH';
      else if (status === 'PRESENT') workModeDetected = 'OFFICE';
    }

    const now = new Date().toISOString();
    const locationSnapshot = input.latitude != null ? {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      wifi_ssid: input.wifi_ssid ?? null,
      timestamp: now,
    } : null;

    // Upsert attendance day
    let attendanceDayId: string;
    if (existing) {
      const { data: updated } = await supabase
        .from('attendance_days')
        .update({
          status,
          check_in_at: now,
          work_mode_detected: workModeDetected,
          office_compliant: officeCompliant,
          location_snapshot: locationSnapshot,
        })
        .eq('id', existing.id)
        .select('id')
        .single();
      attendanceDayId = updated!.id;
    } else {
      const { data: inserted } = await supabase
        .from('attendance_days')
        .insert({
          user_id: ctx.userId,
          organization_id: ctx.orgId,
          date: today,
          status,
          check_in_at: now,
          work_mode_detected: workModeDetected,
          office_compliant: officeCompliant,
          location_snapshot: locationSnapshot,
        })
        .select('id')
        .single();
      attendanceDayId = inserted!.id;
    }

    // Log event
    await supabase.from('attendance_events').insert({
      user_id: ctx.userId,
      organization_id: ctx.orgId,
      attendance_day_id: attendanceDayId,
      event_type: 'CHECK_IN',
      payload: { location_snapshot: locationSnapshot },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'CHECK_IN',
      resourceType: 'attendance_days',
      resourceId: attendanceDayId,
      newValue: { status, work_mode_detected: workModeDetected, office_compliant: officeCompliant },
    });

    return jsonResponse({
      success: true,
      attendance_day_id: attendanceDayId,
      status,
      work_mode_detected: workModeDetected,
      office_compliant: officeCompliant,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 400;
    return errorResponse(message, status);
  }
});

async function notifyNonCompliance(supabase: ReturnType<typeof getServiceClient>, userId: string, orgId: string) {
  // Get HR/Admin users
  const { data: hrAdmins } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('organization_id', orgId)
    .in('role', ['HR', 'ADMIN']);

  const { data: empProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single();

  if (hrAdmins) {
    for (const admin of hrAdmins) {
      await supabase.rpc('create_notification', {
        p_user_id: admin.user_id,
        p_org_id: orgId,
        p_type: 'NON_COMPLIANT',
        p_title: 'Non-Compliant Check-in',
        p_message: `${empProfile?.full_name ?? 'An employee'} checked in from outside the office.`,
        p_metadata: { employee_user_id: userId },
      });
    }
  }
}
