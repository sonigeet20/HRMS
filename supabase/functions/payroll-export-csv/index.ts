import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext, requireRole } from '../_shared/auth.ts';
import { validateInput, errorResponse } from '../_shared/validators.ts';

const exportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
});

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const ctx = await getAuthContext(authHeader);
    requireRole(ctx, 'HR', 'ADMIN');

    const body = await req.json();
    const input = validateInput(exportSchema, body);
    const supabase = getServiceClient();

    const { data: payslips } = await supabase
      .from('payslips')
      .select(`
        *,
        profiles!inner(full_name, employee_code, designation, department_id)
      `)
      .eq('organization_id', ctx.orgId)
      .eq('month', input.month)
      .eq('is_active', true)
      .order('created_at');

    if (!payslips || payslips.length === 0) {
      return errorResponse('No payslips found for this month');
    }

    // Build CSV
    const headers = [
      'Employee Code', 'Name', 'Designation',
      'Working Days', 'LOP Days', 'Payable Days',
      'Gross Pay', 'LOP Deduction', 'Total Deductions', 'Net Pay',
    ];

    const rows = payslips.map((p: any) => {
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return [
        profile?.employee_code ?? '',
        profile?.full_name ?? '',
        profile?.designation ?? '',
        p.working_days,
        p.lop_days,
        p.payable_days,
        p.gross_pay,
        p.lop_deduction,
        p.total_deductions,
        p.net_pay,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll-${input.month.substring(0, 7)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 400;
    return errorResponse(message, status);
  }
});
