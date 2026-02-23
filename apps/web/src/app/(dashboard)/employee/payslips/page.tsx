'use client';

import { usePayslips } from '@/hooks/use-payroll';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function PayslipsPage() {
  const { data: payslips, isLoading } = usePayslips();
  const supabase = createClient();

  const downloadPayslip = async (filePath: string | null) => {
    if (!filePath) return;
    const { data, error } = await supabase.storage.from('payslips').download(filePath);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() ?? 'payslip.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Payslips</h1>

      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>LOP Days</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : !payslips?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No payslips available</TableCell></TableRow>
              ) : (
                payslips.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {new Date(p.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </TableCell>
                    <TableCell>{p.working_days}</TableCell>
                    <TableCell>{Number(p.lop_days) > 0 ? <Badge variant="warning">{Number(p.lop_days)}</Badge> : 0}</TableCell>
                    <TableCell>{formatCurrency(Number(p.gross_pay))}</TableCell>
                    <TableCell className="text-destructive">{formatCurrency(Number(p.total_deductions))}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(p.net_pay))}</TableCell>
                    <TableCell>
                      {p.file_path && (
                        <Button variant="ghost" size="sm" onClick={() => downloadPayslip(p.file_path)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
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
