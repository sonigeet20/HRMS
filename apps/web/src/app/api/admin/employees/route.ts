import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAdminContext(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing auth token', status: 401 as const };
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Admin profile not found', status: 403 as const };
  }

  if (profile.role !== 'ADMIN') {
    return { error: 'Only admins can manage employees', status: 403 as const };
  }

  return {
    serviceClient,
    adminProfile: profile,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server env missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const ctx = await getAdminContext(request);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const body = await request.json();
    const {
      full_name,
      email,
      password,
      employee_code,
      role,
      phone,
      designation,
      department_id,
      location_id,
      joining_date,
      employment_type,
      is_active,
    } = body;

    if (!full_name || !email || !password || !employee_code || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedRole = String(role).toUpperCase();
    if (!['ADMIN', 'HR', 'EMPLOYEE'].includes(normalizedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data: existingCode } = await ctx.serviceClient
      .from('profiles')
      .select('id')
      .eq('organization_id', ctx.adminProfile.organization_id)
      .eq('employee_code', employee_code)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 });
    }

    const { data: existingEmail } = await ctx.serviceClient
      .from('profiles')
      .select('id')
      .eq('organization_id', ctx.adminProfile.organization_id)
      .ilike('email', email)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists in organization' }, { status: 409 });
    }

    const { data: createdAuth, error: createAuthError } = await ctx.serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        employee_code,
      },
    });

    if (createAuthError || !createdAuth.user) {
      return NextResponse.json({ error: createAuthError?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const userId = createdAuth.user.id;

    const { data: insertedProfile, error: insertProfileError } = await ctx.serviceClient
      .from('profiles')
      .insert({
        user_id: userId,
        organization_id: ctx.adminProfile.organization_id,
        full_name,
        email,
        phone: phone || null,
        employee_code,
        designation: designation || null,
        department_id: department_id || null,
        location_id: location_id || null,
        joining_date: joining_date || new Date().toISOString().slice(0, 10),
        employment_type: employment_type || 'FULL_TIME',
        role: normalizedRole,
        is_active: is_active ?? true,
      })
      .select('*')
      .single();

    if (insertProfileError) {
      await ctx.serviceClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: insertProfileError.message }, { status: 400 });
    }

    return NextResponse.json({ profile: insertedProfile });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server env missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const ctx = await getAdminContext(request);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const body = await request.json();
    const {
      id,
      full_name,
      email,
      employee_code,
      role,
      phone,
      designation,
      department_id,
      location_id,
      joining_date,
      employment_type,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing profile id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (employee_code !== undefined) updates.employee_code = employee_code;
    if (role !== undefined) updates.role = String(role).toUpperCase();
    if (phone !== undefined) updates.phone = phone || null;
    if (designation !== undefined) updates.designation = designation || null;
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (location_id !== undefined) updates.location_id = location_id || null;
    if (joining_date !== undefined) updates.joining_date = joining_date;
    if (employment_type !== undefined) updates.employment_type = employment_type;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data: updated, error } = await ctx.serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', ctx.adminProfile.organization_id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
