'use client';

import { useState } from 'react';
import { useOrgLeaveRequests, useApproveLeave } from '@/hooks/use-leave';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function HRLeavesPage() {
  const [tab, setTab] = useState('PENDING');
  const { data: requests, isFetching: isLoading } = useOrgLeaveRequests(tab === 'ALL' ? undefined : tab);
  const approveLeave = useApproveLeave();

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await approveLeave.mutateAsync({ leave_request_id: id, action });
      toast.success(`Leave ${action.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leave Requests</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {tab === 'PENDING' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
                  ) : !requests?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No requests</TableCell></TableRow>
                  ) : (
                    requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{r.profiles?.employee_code}</p>
                        </TableCell>
                        <TableCell>{r.leave_types?.name}</TableCell>
                        <TableCell>{r.start_date}</TableCell>
                        <TableCell>{r.end_date}</TableCell>
                        <TableCell>{Number(r.total_days)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.reason}</TableCell>
                        <TableCell><Badge>{r.status}</Badge></TableCell>
                        {tab === 'PENDING' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction(r.id, 'APPROVED')}
                                disabled={approveLeave.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(r.id, 'REJECTED')}
                                disabled={approveLeave.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
