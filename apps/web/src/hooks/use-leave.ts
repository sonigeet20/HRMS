'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export function useLeaveBalances() {
  const { user } = useAuth();
  const supabase = createClient();
  const year = new Date().getFullYear();

  return useQuery({
    queryKey: ['leave-balances', user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, leave_types(name, code, is_paid)')
        .eq('user_id', user!.id)
        .eq('year', year);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useLeaveRequests(status?: string) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['leave-requests', user?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*, leave_types(name, code)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useOrgLeaveRequests(status?: string) {
  const { profile } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['org-leave-requests', profile?.organization_id, status],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*, leave_types(name, code), profiles!fk_leave_requests_profile(full_name, employee_code)')
        .eq('organization_id', profile!.organization_id)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile && (profile.role === 'HR' || profile.role === 'ADMIN'),
  });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: { leave_type_id: string; start_date: string; end_date: string; reason: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/leave-apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Leave application failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: { leave_request_id: string; action: 'APPROVED' | 'REJECTED'; rejection_reason?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/leave-approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-leave-requests'] });
    },
  });
}
