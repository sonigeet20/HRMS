'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'ADMIN',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Logs</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : !logs?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No audit logs</TableCell></TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="text-xs">{log.resource_type}{log.resource_id ? ` / ${log.resource_id.substring(0, 8)}...` : ''}</TableCell>
                    <TableCell className="text-xs">{log.actor_id.substring(0, 8)}...</TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.new_value && (
                        <pre className="text-[10px] max-h-20 overflow-auto">{JSON.stringify(log.new_value, null, 1)}</pre>
                      )}
                    </TableCell>
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
