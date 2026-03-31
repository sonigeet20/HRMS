'use client';

import { useState } from 'react';
import { useOrgAttendance } from '@/hooks/use-attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ATTENDANCE_STATUS_COLORS } from '@/lib/constants';

export default function HRAttendancePage() {
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data: attendance, isFetching: isLoading } = useOrgAttendance(date);

  const filtered = attendance?.filter((a: any) =>
    statusFilter === 'ALL' || a.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Org Attendance</h1>

      <div className="flex gap-4">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="WFH">WFH</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="LEAVE">Leave</SelectItem>
            <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Office Compliant</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Worked (min)</TableHead>
                <TableHead>Idle (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No records for this date</TableCell></TableRow>
              ) : (
                filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{a.profiles?.employee_code}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${ATTENDANCE_STATUS_COLORS[a.status] ?? 'bg-gray-400'}`} />
                        {a.status}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.work_mode_detected}</Badge></TableCell>
                    <TableCell>
                      {a.office_compliant === true && <Badge variant="success">Yes</Badge>}
                      {a.office_compliant === false && <Badge variant="destructive">No</Badge>}
                      {a.office_compliant === null && <Badge variant="secondary">N/A</Badge>}
                    </TableCell>
                    <TableCell>{a.check_in_at ? new Date(a.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                    <TableCell>{a.check_out_at ? new Date(a.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                    <TableCell>{a.worked_minutes}</TableCell>
                    <TableCell>{a.idle_minutes > 0 ? <span className="text-destructive">{a.idle_minutes}</span> : 0}</TableCell>
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
