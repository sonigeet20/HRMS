import { getServiceClient } from './supabase.ts';

export interface AuthContext {
  userId: string;
  orgId: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  email: string;
}

export async function getAuthContext(authHeader: string): Promise<AuthContext> {
  const supabase = getServiceClient();
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role, email')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  return {
    userId: user.id,
    orgId: profile.organization_id,
    role: profile.role,
    email: profile.email,
  };
}

export function requireRole(ctx: AuthContext, ...roles: AuthContext['role'][]): void {
  if (!roles.includes(ctx.role)) {
    throw new Error(`Forbidden: requires one of [${roles.join(', ')}]`);
  }
}
