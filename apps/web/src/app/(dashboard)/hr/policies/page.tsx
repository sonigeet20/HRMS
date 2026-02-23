'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function HRPoliciesPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ['hr-policies', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_policies')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">HR Policies</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Name</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Location Enforced</TableHead>
                <TableHead>WiFi Enforced</TableHead>
                <TableHead>WFH Fallback</TableHead>
                <TableHead>Block Outside</TableHead>
                <TableHead>Idle Threshold</TableHead>
                <TableHead>Absent=LOP</TableHead>
                <TableHead>NC=LOP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                policies?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.work_mode}</Badge></TableCell>
                    <TableCell>{p.location_enforced ? '✓' : '—'}</TableCell>
                    <TableCell>{p.office_wifi_enforced ? '✓' : '—'}</TableCell>
                    <TableCell>{p.wfh_fallback_on_outside_office ? '✓' : '—'}</TableCell>
                    <TableCell>{p.block_outside_office_checkin ? '✓' : '—'}</TableCell>
                    <TableCell>{p.idle_threshold_minutes} min</TableCell>
                    <TableCell>{p.count_absent_as_lop ? '✓' : '—'}</TableCell>
                    <TableCell>{p.count_non_compliant_as_lop ? '✓' : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
