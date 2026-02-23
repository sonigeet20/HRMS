import { getServiceClient } from './supabase.ts';

export async function logAudit(params: {
  orgId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  const supabase = getServiceClient();
  await supabase.from('audit_logs').insert({
    organization_id: params.orgId,
    actor_id: params.actorId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
}
