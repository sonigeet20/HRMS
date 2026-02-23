'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';

export function usePayslips() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['payslips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('month', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function usePayrollRuns() {
  const { profile } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['payroll-runs', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('month', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile && (profile.role === 'HR' || profile.role === 'ADMIN'),
  });
}

export function usePayrollRegister(month: string) {
  const { profile } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['payroll-register', profile?.organization_id, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, profiles!inner(full_name, employee_code, designation)')
        .eq('organization_id', profile!.organization_id)
        .eq('month', month)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!profile && (profile.role === 'HR' || profile.role === 'ADMIN'),
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payroll-generate-month`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({ month }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payroll generation failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register'] });
    },
  });
}

export function useExportPayrollCsv() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payroll-export-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({ month }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${month.substring(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
