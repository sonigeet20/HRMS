'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function HREmployeesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [search, setSearch] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments!fk_profiles_department(name), locations(name)')
        .eq('organization_id', profile!.organization_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const filtered = employees?.filter((e: any) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Employees</h1>

      <div className="flex gap-4">
        <Input
          placeholder="Search by name, code, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No employees found</TableCell></TableRow>
              ) : (
                filtered.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(emp.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.employee_code}</TableCell>
                    <TableCell>{emp.departments?.name ?? '—'}</TableCell>
                    <TableCell>{emp.designation ?? '—'}</TableCell>
                    <TableCell>{emp.locations?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{emp.employment_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={emp.is_active ? 'success' : 'destructive'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
