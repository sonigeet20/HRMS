'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

/** Returns today's date in YYYY-MM-DD format using IST (Asia/Kolkata, UTC+5:30). */
const getISTDate = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * Returns firstDay and lastDay of a given month (YYYY-MM string or undefined for current IST month)
 * computed entirely in IST so there is no UTC midnight drift.
 */
function getISTMonthRange(month?: string): { firstDay: string; lastDay: string } {
  const base = month ?? getISTDate(); // YYYY-MM-DD or YYYY-MM
  const [yearStr, monthStr] = base.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10); // 1-based
  const lastDayNum = new Date(year, m, 0).getDate(); // day 0 of next month = last day of m
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    firstDay: `${year}-${pad(m)}-01`,
    lastDay: `${year}-${pad(m)}-${pad(lastDayNum)}`,
  };
}

export function useAttendance(month?: string) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance', user?.id, month],
    queryFn: async () => {
      const { firstDay, lastDay } = getISTMonthRange(month);

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
      const targetDate = date ?? getISTDate();
      const { data, error } = await supabase
        .from('attendance_days')
        .select('*, profiles!fk_attendance_days_profile(full_name, employee_code, designation)')
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
