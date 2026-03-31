'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface PolicyForm {
  name: string;
  work_mode: 'HYBRID' | 'OFFICE_ONLY' | 'WFH_ALLOWED';
  location_enforced: boolean;
  office_wifi_enforced: boolean;
  wfh_fallback_on_outside_office: boolean;
  block_outside_office_checkin: boolean;
  idle_threshold_minutes: number;
  count_absent_as_lop: boolean;
  count_non_compliant_as_lop: boolean;
  weekend_days: number[];
}

const defaultForm: PolicyForm = {
  name: '',
  work_mode: 'HYBRID',
  location_enforced: true,
  office_wifi_enforced: false,
  wfh_fallback_on_outside_office: true,
  block_outside_office_checkin: false,
  idle_threshold_minutes: 30,
  count_absent_as_lop: true,
  count_non_compliant_as_lop: false,
  weekend_days: [0, 6],
};

const WORK_MODES = [
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'OFFICE_ONLY', label: 'Office Only' },
  { value: 'WFH_ALLOWED', label: 'WFH Allowed' },
] as const;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HRPoliciesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<PolicyForm>(defaultForm);
  const [saving, setSaving] = useState(false);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      const payload = { ...form, organization_id: profile!.organization_id };

      if (editingId) {
        const { error } = await supabase
          .from('hr_policies')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_policies')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-policies'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      setSaving(false);
    },
    onError: (err) => {
      console.error('Save policy error:', err);
      setSaving(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-policies'] });
      setDeleteDialogOpen(false);
      setDeletingPolicy(null);
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (policy: any) => {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      work_mode: policy.work_mode,
      location_enforced: policy.location_enforced,
      office_wifi_enforced: policy.office_wifi_enforced,
      wfh_fallback_on_outside_office: policy.wfh_fallback_on_outside_office,
      block_outside_office_checkin: policy.block_outside_office_checkin,
      idle_threshold_minutes: policy.idle_threshold_minutes,
      count_absent_as_lop: policy.count_absent_as_lop,
      count_non_compliant_as_lop: policy.count_non_compliant_as_lop,
      weekend_days: policy.weekend_days ?? [0, 6],
    });
    setDialogOpen(true);
  };

  const openDelete = (policy: any) => {
    setDeletingPolicy({ id: policy.id, name: policy.name });
    setDeleteDialogOpen(true);
  };

  const toggleBool = (key: keyof PolicyForm) =>
    setForm((prev) => ({ ...prev, [key]: !prev[key as keyof PolicyForm] }));

  const toggleWeekendDay = (day: number) =>
    setForm((prev) => ({
      ...prev,
      weekend_days: prev.weekend_days.includes(day)
        ? prev.weekend_days.filter((d) => d !== day)
        : [...prev.weekend_days, day].sort(),
    }));

  const isHrOrAdmin = profile?.role === 'ADMIN' || profile?.role === 'HR';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">HR Policies</h1>
        {isHrOrAdmin && (
          <Button onClick={openCreate}>+ New Policy</Button>
        )}
      </div>

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
                {isHrOrAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isHrOrAdmin ? 10 : 9} className="text-center">Loading...</TableCell></TableRow>
              ) : !policies?.length ? (
                <TableRow><TableCell colSpan={isHrOrAdmin ? 10 : 9} className="text-center text-muted-foreground">No policies found</TableCell></TableRow>
              ) : (
                policies.map((p: any) => (
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
                    {isHrOrAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(p)}>Delete</Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the policy settings below.' : 'Configure a new HR policy for your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Policy Name */}
            <div className="grid gap-2">
              <Label htmlFor="policy-name">Policy Name</Label>
              <Input
                id="policy-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Standard Hybrid Policy"
              />
            </div>

            {/* Work Mode */}
            <div className="grid gap-2">
              <Label>Work Mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => setForm({ ...form, work_mode: v as PolicyForm['work_mode'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Idle Threshold */}
            <div className="grid gap-2">
              <Label htmlFor="idle-threshold">Idle Threshold (minutes)</Label>
              <Input
                id="idle-threshold"
                type="number"
                min={1}
                value={form.idle_threshold_minutes}
                onChange={(e) => setForm({ ...form, idle_threshold_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>

            {/* Weekend Days */}
            <div className="grid gap-2">
              <Label>Weekend Days</Label>
              <div className="flex gap-2">
                {DAYS.map((day, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    size="sm"
                    variant={form.weekend_days.includes(idx) ? 'default' : 'outline'}
                    onClick={() => toggleWeekendDay(idx)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            {/* Boolean Toggles */}
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['location_enforced', 'Location Enforced'],
                ['office_wifi_enforced', 'Office WiFi Enforced'],
                ['wfh_fallback_on_outside_office', 'WFH Fallback on Outside Office'],
                ['block_outside_office_checkin', 'Block Outside Office Check-in'],
                ['count_absent_as_lop', 'Count Absent as LOP'],
                ['count_non_compliant_as_lop', 'Count Non-Compliant as LOP'],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={() => toggleBool(key)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingPolicy?.name}</strong>? This action cannot be undone.
              Employees assigned to this policy will have their policy unset.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingPolicy && deleteMutation.mutate(deletingPolicy.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
