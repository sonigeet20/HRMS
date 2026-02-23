'use client';

import { useState } from 'react';
import { usePayrollRuns, usePayrollRegister, useGeneratePayroll, useExportPayrollCsv } from '@/hooks/use-payroll';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Play, Download, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function HRPayrollPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const { data: runs } = usePayrollRuns();
  const { data: register, isLoading: regLoading } = usePayrollRegister(selectedMonth);
  const generatePayroll = useGeneratePayroll();
  const exportCsv = useExportPayrollCsv();

  const handleGenerate = async () => {
    try {
      const result = await generatePayroll.mutateAsync(selectedMonth);
      toast.success(`Payroll generated for ${result.total_employees} employees`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExport = async () => {
    try {
      await exportCsv.mutateAsync(selectedMonth);
      toast.success('CSV exported');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Management</h1>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Payroll</TabsTrigger>
          <TabsTrigger value="register">Payroll Register</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Monthly Payroll</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end gap-4">
              <div>
                <label className="text-sm font-medium">Month</label>
                <Input
                  type="month"
                  value={selectedMonth.substring(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                  className="w-48"
                />
              </div>
              <Button onClick={handleGenerate} disabled={generatePayroll.isPending}>
                <Play className="mr-2 h-4 w-4" />
                {generatePayroll.isPending ? 'Generating...' : 'Generate Payroll'}
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={exportCsv.isPending}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payroll Register — {selectedMonth.substring(0, 7)}</CardTitle>
                <Input
                  type="month"
                  value={selectedMonth.substring(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>LOP Days</TableHead>
                    <TableHead>Payable Days</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>LOP Deduction</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
                  ) : !register?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payslips for this month. Run payroll first.</TableCell></TableRow>
                  ) : (
                    register.map((p: any) => {
                      const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <p className="font-medium">{prof?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{prof?.employee_code}</p>
                          </TableCell>
                          <TableCell>{p.working_days}</TableCell>
                          <TableCell>{Number(p.lop_days) > 0 ? <span className="text-destructive">{Number(p.lop_days)}</span> : 0}</TableCell>
                          <TableCell>{Number(p.payable_days)}</TableCell>
                          <TableCell>{formatCurrency(Number(p.gross_pay))}</TableCell>
                          <TableCell>{formatCurrency(Number(p.lop_deduction))}</TableCell>
                          <TableCell>{formatCurrency(Number(p.total_deductions))}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(p.net_pay))}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader><CardTitle>Payroll Run History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Gross</TableHead>
                    <TableHead>Total Net</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'destructive' : 'warning'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.total_employees}</TableCell>
                      <TableCell>{formatCurrency(Number(r.total_gross))}</TableCell>
                      <TableCell>{formatCurrency(Number(r.total_net))}</TableCell>
                      <TableCell>{new Date(r.started_at).toLocaleString()}</TableCell>
                      <TableCell>{r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
