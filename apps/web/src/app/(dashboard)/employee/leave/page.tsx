'use client';

import { useState } from 'react';
import { useLeaveBalances, useLeaveRequests, useApplyLeave } from '@/hooks/use-leave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';

export default function LeavePage() {
  const { profile } = useAuth();
  const { data: balances } = useLeaveBalances();
  const { data: requests, isLoading } = useLeaveRequests();
  const applyLeave = useApplyLeave();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types', profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .eq('is_active', true);
      return data;
    },
    enabled: !!profile,
  });

  const handleApply = async () => {
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await applyLeave.mutateAsync({ leave_type_id: leaveTypeId, start_date: startDate, end_date: endDate, reason });
      toast.success('Leave request submitted');
      setOpen(false);
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'destructive';
      case 'PENDING': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Apply Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Fill in the details to submit your leave request.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map((lt: any) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleApply} disabled={applyLeave.isPending}>
                {applyLeave.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balances */}
      {balances && balances.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          {balances.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">{b.leave_types?.name ?? 'Leave'}</p>
                <p className="text-3xl font-bold mt-1">{Number(b.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  Accrued: {Number(b.total_accrued)} | Used: {Number(b.total_used)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Requests table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
              ) : !requests?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No leave requests</TableCell></TableRow>
              ) : (
                requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.leave_types?.name}</TableCell>
                    <TableCell>{r.start_date}</TableCell>
                    <TableCell>{r.end_date}</TableCell>
                    <TableCell>{Number(r.total_days)}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(r.status) as any}>{r.status}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
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
