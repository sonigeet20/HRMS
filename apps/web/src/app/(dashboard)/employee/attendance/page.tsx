'use client';

import { useState } from 'react';
import { useAttendance } from '@/hooks/use-attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ATTENDANCE_STATUS_COLORS } from '@/lib/constants';

export default function AttendancePage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: attendance, isFetching: isLoading } = useAttendance(monthStr);

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const attendanceMap = new Map(attendance?.map((a) => [a.date, a]) ?? []);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Attendance</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setMonthOffset((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{monthName}</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonthOffset((p) => p + 1)}
              disabled={monthOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((d) => (
                <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const record = attendanceMap.get(dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());

                return (
                  <div
                    key={day}
                    className={`relative rounded-md border p-2 text-center min-h-[70px] ${
                      isToday ? 'ring-2 ring-primary' : ''
                    } ${isWeekend && !record ? 'bg-muted/50' : ''}`}
                  >
                    <span className="text-xs font-medium">{day}</span>
                    {record && (
                      <div className="mt-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            ATTENDANCE_STATUS_COLORS[record.status] ?? 'bg-gray-400'
                          }`}
                        />
                        <p className="text-[10px] mt-0.5 truncate">{record.status}</p>
                        {record.check_in_at && (
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(record.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                    {!record && isWeekend && (
                      <p className="text-[10px] mt-1 text-muted-foreground">Weekend</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(ATTENDANCE_STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <span className="text-xs">{status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
