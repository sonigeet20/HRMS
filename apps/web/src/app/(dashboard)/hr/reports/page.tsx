'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Users, Clock, CalendarOff, Banknote } from 'lucide-react';

export default function HRReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <Clock className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Attendance Summary</CardTitle>
            <CardDescription>Monthly attendance overview with compliance metrics</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CalendarOff className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Leave Report</CardTitle>
            <CardDescription>Leave utilization and balance report by department</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <Banknote className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Payroll Report</CardTitle>
            <CardDescription>Monthly payroll summary with department-wise breakdown</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Headcount Report</CardTitle>
            <CardDescription>Active employee count by department and location</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Idle Time Report</CardTitle>
            <CardDescription>Employee idle time trends and threshold violations</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
