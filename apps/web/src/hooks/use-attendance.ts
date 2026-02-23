'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export function useAttendance(month?: string) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance', user?.id, month],
    queryFn: async () => {
      const now = month ? new Date(month) : new Date();
      const year = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(year, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, m + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useOrgAttendance(date?: string) {
  const { profile } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['org-attendance', profile?.organization_id, date],
    queryFn: async () => {
      const targetDate = date ?? new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_days')
        .select('*, profiles!inner(full_name, employee_code, designation)')
        .eq('organization_id', profile!.organization_id)
        .eq('date', targetDate)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!profile && (profile.role === 'HR' || profile.role === 'ADMIN'),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: { latitude?: number; longitude?: number; accuracy?: number; wifi_ssid?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/attendance-checkin`,
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
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: { latitude?: number; longitude?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/attendance-checkout`,
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
      if (!res.ok) throw new Error(data.error || 'Check-out failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
