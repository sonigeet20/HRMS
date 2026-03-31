'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

type EmployeeRole = 'ADMIN' | 'HR' | 'EMPLOYEE';
type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

interface EmployeeForm {
  id?: string;
  full_name: string;
  email: string;
  password: string;
  employee_code: string;
  role: EmployeeRole;
  phone: string;
  designation: string;
  department_id: string;
  location_id: string;
  joining_date: string;
  employment_type: EmploymentType;
  is_active: boolean;
}

const EMPTY_FORM: EmployeeForm = {
  full_name: '',
  email: '',
  password: 'password123',
  employee_code: '',
  role: 'EMPLOYEE',
  phone: '',
  designation: '',
  department_id: 'none',
  location_id: 'none',
  joining_date: new Date().toISOString().slice(0, 10),
  employment_type: 'FULL_TIME',
  is_active: true,
};

export default function AdminEmployeesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);

  const { data: employees, isFetching: isLoading } = useQuery({
    queryKey: ['admin-employees', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments!fk_profiles_department(name), locations(name)')
        .eq('organization_id', profile!.organization_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'ADMIN',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', profile!.organization_id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile && profile.role === 'ADMIN',
  });

  const { data: locations } = useQuery({
    queryKey: ['admin-locations', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', profile!.organization_id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile && profile.role === 'ADMIN',
  });

  const saveEmployee = useMutation({
    mutationFn: async (payload: EmployeeForm) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired. Please log in again.');

      const endpoint = '/api/admin/employees';
      const method = payload.id ? 'PUT' : 'POST';

      const body = {
        ...payload,
        department_id: payload.department_id === 'none' ? null : payload.department_id,
        location_id: payload.location_id === 'none' ? null : payload.location_id,
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save employee');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees', profile?.organization_id] });
      setOpen(false);
      setEditing(false);
      setForm(EMPTY_FORM);
      toast.success('Employee saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees?.filter((e: any) =>
      e.full_name.toLowerCase().includes(q)
      || e.employee_code.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const openCreate = () => {
    setEditing(false);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditing(true);
    setForm({
      id: emp.id,
      full_name: emp.full_name,
      email: emp.email,
      password: '',
      employee_code: emp.employee_code,
      role: emp.role,
      phone: emp.phone ?? '',
      designation: emp.designation ?? '',
      department_id: emp.department_id ?? 'none',
      location_id: emp.location_id ?? 'none',
      joining_date: emp.joining_date,
      employment_type: emp.employment_type,
      is_active: emp.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Employees</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editing ? 'Update employee details and role.' : 'Create employee login and profile from admin panel.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={editing} />
                </div>
                <div className="grid gap-2">
                  <Label>Employee Code</Label>
                  <Input value={form.employee_code} onChange={(e) => setForm((p) => ({ ...p, employee_code: e.target.value }))} />
                </div>
              </div>

              {!editing && (
                <div className="grid gap-2">
                  <Label>Initial Password</Label>
                  <Input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm((p) => ({ ...p, role: value as EmployeeRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Employment Type</Label>
                  <Select value={form.employment_type} onValueChange={(value) => setForm((p) => ({ ...p, employment_type: value as EmploymentType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">FULL_TIME</SelectItem>
                      <SelectItem value="PART_TIME">PART_TIME</SelectItem>
                      <SelectItem value="CONTRACT">CONTRACT</SelectItem>
                      <SelectItem value="INTERN">INTERN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(value) => setForm((p) => ({ ...p, department_id: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Select value={form.location_id} onValueChange={(value) => setForm((p) => ({ ...p, location_id: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {locations?.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Joining Date</Label>
                  <Input type="date" value={form.joining_date} onChange={(e) => setForm((p) => ({ ...p, joining_date: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={saveEmployee.isPending}
                onClick={() => {
                  if (!form.full_name || !form.email || !form.employee_code || (!editing && !form.password)) {
                    toast.error('Please fill required fields');
                    return;
                  }
                  saveEmployee.mutate(form);
                }}
              >
                {saveEmployee.isPending ? 'Saving...' : 'Save Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search by name, code, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
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
                    <TableCell><Badge variant="outline">{emp.role}</Badge></TableCell>
                    <TableCell>{emp.departments?.name ?? '—'}</TableCell>
                    <TableCell>{emp.locations?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={emp.is_active ? 'success' : 'destructive'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
