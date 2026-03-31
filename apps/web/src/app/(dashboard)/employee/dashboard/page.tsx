'use client';

import { useAuth } from '@/providers/auth-provider';
import { useAttendance, useCheckIn, useCheckOut } from '@/hooks/use-attendance';
import { useLeaveBalances } from '@/hooks/use-leave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarOff, Receipt, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { ATTENDANCE_STATUS_COLORS } from '@/lib/constants';

export default function EmployeeDashboard() {
  const { profile } = useAuth();
  const { data: attendance, isFetching: attLoading } = useAttendance();
  const { data: leaveBalances } = useLeaveBalances();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayAttendance = attendance?.find((a) => a.date === today);
  const isCheckedIn = !!todayAttendance?.check_in_at && !todayAttendance?.check_out_at;
  const isCheckedOut = !!todayAttendance?.check_out_at;

  const handleCheckIn = async () => {
    try {
      let position: { latitude?: number; longitude?: number; accuracy?: number } = {};
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        ).catch(() => null);
        if (pos) {
          position = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        }
      }
      const result = await checkIn.mutateAsync(position);
      toast.success(`Checked in — ${result.status} (${result.work_mode_detected})`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCheckOut = async () => {
    try {
      const result = await checkOut.mutateAsync({});
      toast.success(`Checked out — Worked ${result.worked_minutes} min`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const presentDays = attendance?.filter((a) => ['PRESENT', 'WFH'].includes(a.status)).length ?? 0;
  const absentDays = attendance?.filter((a) => a.status === 'ABSENT').length ?? 0;
  const leaveDays = attendance?.filter((a) => a.status === 'LEAVE').length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Check-in/out card */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-lg font-medium">Today&apos;s Status</p>
            {todayAttendance ? (
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-3 w-3 rounded-full ${ATTENDANCE_STATUS_COLORS[todayAttendance.status] ?? 'bg-gray-400'}`} />
                <span className="text-sm">{todayAttendance.status}</span>
                {todayAttendance.work_mode_detected !== 'UNKNOWN' && (
                  <Badge variant="outline" className="text-xs">{todayAttendance.work_mode_detected}</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Not checked in yet</p>
            )}
            {todayAttendance?.check_in_at && (
              <p className="text-xs text-muted-foreground mt-1">
                In: {new Date(todayAttendance.check_in_at).toLocaleTimeString()}
                {todayAttendance.check_out_at && ` · Out: ${new Date(todayAttendance.check_out_at).toLocaleTimeString()}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!isCheckedIn && !isCheckedOut && (
              <Button onClick={handleCheckIn} disabled={checkIn.isPending}>
                <MapPin className="mr-2 h-4 w-4" />
                {checkIn.isPending ? 'Checking in...' : 'Check In'}
              </Button>
            )}
            {isCheckedIn && (
              <Button variant="destructive" onClick={handleCheckOut} disabled={checkOut.isPending}>
                <Clock className="mr-2 h-4 w-4" />
                {checkOut.isPending ? 'Checking out...' : 'Check Out'}
              </Button>
            )}
            {isCheckedOut && (
              <Badge variant="success" className="text-base px-4 py-2">Day Complete ✓</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leave Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{leaveDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {leaveBalances?.reduce((sum, b) => sum + Number(b.balance), 0) ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">total days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances */}
      {leaveBalances && leaveBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {leaveBalances.map((b: any) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{b.leave_types?.name ?? 'Leave'}</p>
                  <p className="text-2xl font-bold">{Number(b.balance)}</p>
                  <p className="text-xs text-muted-foreground">
                    Used: {Number(b.total_used)} · Pending: {Number(b.total_pending)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
