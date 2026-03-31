import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { getAuthContext, requireRole } from '../_shared/auth.ts';
import { validateInput, jsonResponse, errorResponse } from '../_shared/validators.ts';
import { logAudit } from '../_shared/audit.ts';

const generateSchema = z.object({
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
    const input = validateInput(generateSchema, body);
    const supabase = getServiceClient();

    const [yearStr, monthStr] = input.month.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // Create payroll run
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        organization_id: ctx.orgId,
        month: input.month,
        status: 'PROCESSING',
        started_by: ctx.userId,
      })
      .select('id')
      .single();

    if (runError) throw runError;

    // Deactivate previous payslips for this month
    await supabase
      .from('payslips')
      .update({ is_active: false })
      .eq('organization_id', ctx.orgId)
      .eq('month', input.month)
      .eq('is_active', true);

    // Get max version for this month
    const { data: maxVersionData } = await supabase
      .from('payslips')
      .select('version')
      .eq('organization_id', ctx.orgId)
      .eq('month', input.month)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = (maxVersionData?.[0]?.version ?? 0) + 1;

    // Get all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, hr_policy_id, location_id')
      .eq('organization_id', ctx.orgId)
      .eq('is_active', true);

    if (employeesError) throw employeesError;

    // Fetch payroll profiles separately (more robust than relational inner join here)
    const { data: payrollProfiles, error: payrollProfilesError } = await supabase
      .from('payroll_profiles')
      .select('user_id, base_monthly_salary, currency, salary_structure')
      .eq('organization_id', ctx.orgId);

    if (payrollProfilesError) throw payrollProfilesError;

    const payrollByUser = new Map((payrollProfiles ?? []).map((p: any) => [p.user_id, p]));
    const employeesWithPayroll = (employees ?? [])
      .map((emp: any) => ({ ...emp, payroll_profile: payrollByUser.get(emp.user_id) }))
      .filter((emp: any) => !!emp.payroll_profile);

    if (employeesWithPayroll.length === 0) {
      await supabase
        .from('payroll_runs')
        .update({ status: 'FAILED', completed_at: new Date().toISOString() })
        .eq('id', run!.id);
      return errorResponse('No employees with payroll profiles found');
    }

    // Get holidays for the month
    const firstDay = input.month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDay = `${yearStr}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: allHolidays } = await supabase
      .from('holidays')
      .select('date, calendar_id, holiday_calendars!inner(organization_id)')
      .gte('date', firstDay)
      .lte('date', lastDay);

    const holidayDates = new Set(
      (allHolidays ?? [])
        .filter((h: any) => h.holiday_calendars?.organization_id === ctx.orgId)
        .map((h: any) => h.date)
    );

    let totalGross = 0;
    let totalNet = 0;
    const payslips: any[] = [];

    for (const emp of employeesWithPayroll) {
      const payrollProfile = emp.payroll_profile;

      if (!payrollProfile) continue;

      // Get policy for weekends
      let weekendDays = [0, 6];
      let countAbsentAsLop = true;
      let countNonCompliantAsLop = false;

      if (emp.hr_policy_id) {
        const { data: policy } = await supabase
          .from('hr_policies')
          .select('weekend_days, count_absent_as_lop, count_non_compliant_as_lop')
          .eq('id', emp.hr_policy_id)
          .single();

        if (policy) {
          weekendDays = policy.weekend_days ?? [0, 6];
          countAbsentAsLop = policy.count_absent_as_lop;
          countNonCompliantAsLop = policy.count_non_compliant_as_lop;
        }
      }

      // Count working days
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dateStr = date.toISOString().split('T')[0];
        if (!weekendDays.includes(date.getDay()) && !holidayDates.has(dateStr)) {
          workingDays++;
        }
      }

      // Count LOP days
      // 1. Unpaid leave days
      const { data: unpaidLeaves } = await supabase
        .from('leave_requests')
        .select('total_days, leave_types!inner(is_paid)')
        .eq('user_id', emp.user_id)
        .eq('status', 'APPROVED')
        .gte('start_date', firstDay)
        .lte('end_date', lastDay);

      let lopDays = 0;
      for (const leave of unpaidLeaves ?? []) {
        const lt = Array.isArray(leave.leave_types) ? leave.leave_types[0] : leave.leave_types;
        if (!lt?.is_paid) {
          lopDays += Number(leave.total_days);
        }
      }

      // 2. Absent days (if policy enabled)
      if (countAbsentAsLop) {
        const { count: absentCount } = await supabase
          .from('attendance_days')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', emp.user_id)
          .eq('status', 'ABSENT')
          .gte('date', firstDay)
          .lte('date', lastDay);
        lopDays += absentCount ?? 0;
      }

      // 3. Non-compliant days (if policy enabled)
      if (countNonCompliantAsLop) {
        const { count: ncCount } = await supabase
          .from('attendance_days')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', emp.user_id)
          .eq('status', 'NON_COMPLIANT')
          .gte('date', firstDay)
          .lte('date', lastDay);
        lopDays += ncCount ?? 0;
      }

      // Calculate payroll
      const baseSalary = Number(payrollProfile.base_monthly_salary);
      const salaryStructure = payrollProfile.salary_structure as any;
      const payableDays = Math.max(0, workingDays - lopDays);
      const perDayRate = workingDays > 0 ? baseSalary / workingDays : 0;
      const lopDeduction = Math.round(perDayRate * lopDays * 100) / 100;

      // Compute earnings
      let earnings: { name: string; amount: number }[] = [];
      let grossPay = baseSalary;

      if (salaryStructure?.earnings?.length) {
        const computed: Record<string, number> = {};
        for (const comp of salaryStructure.earnings) {
          if (!comp.is_percentage) {
            computed[comp.name] = comp.amount;
            earnings.push({ name: comp.name, amount: comp.amount });
          }
        }
        for (const comp of salaryStructure.earnings) {
          if (comp.is_percentage) {
            const base = comp.percentage_of ? (computed[comp.percentage_of] ?? baseSalary) : baseSalary;
            const amt = Math.round((comp.amount / 100) * base * 100) / 100;
            computed[comp.name] = amt;
            earnings.push({ name: comp.name, amount: amt });
          }
        }
        grossPay = earnings.reduce((s, e) => s + e.amount, 0);
      } else {
        earnings = [{ name: 'Basic Salary', amount: baseSalary }];
      }

      // Compute deductions
      let deductions: { name: string; amount: number }[] = [];
      if (salaryStructure?.deductions?.length) {
        for (const d of salaryStructure.deductions) {
          const amt = d.is_percentage ? Math.round((d.amount / 100) * grossPay * 100) / 100 : d.amount;
          deductions.push({ name: d.name, amount: amt });
        }
      } else {
        // Standard deductions
        const basicForPF = grossPay * 0.4;
        const epf = Math.min(Math.round(basicForPF * 0.12 * 100) / 100, 1800);
        deductions.push({ name: 'EPF (Employee)', amount: epf });
        if (grossPay <= 21000) {
          deductions.push({ name: 'ESI (Employee)', amount: Math.round(grossPay * 0.0075 * 100) / 100 });
        }
        deductions.push({ name: 'Professional Tax', amount: 200 });
      }

      const totalDeductions = Math.round((lopDeduction + deductions.reduce((s, d) => s + d.amount, 0)) * 100) / 100;
      const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);

      totalGross += grossPay;
      totalNet += netPay;

      const breakdown = {
        earnings,
        deductions,
        lop_deduction: lopDeduction,
        gross_pay: Math.round(grossPay * 100) / 100,
        total_deductions: totalDeductions,
        net_pay: netPay,
      };

      payslips.push({
        user_id: emp.user_id,
        organization_id: ctx.orgId,
        payroll_run_id: run!.id,
        month: input.month,
        version: nextVersion,
        is_active: true,
        working_days: workingDays,
        lop_days: lopDays,
        payable_days: payableDays,
        gross_pay: Math.round(grossPay * 100) / 100,
        lop_deduction: lopDeduction,
        total_deductions: totalDeductions,
        net_pay: netPay,
        breakdown,
      });
    }

    // Bulk insert payslips
    if (payslips.length > 0) {
      const { error: insertError } = await supabase.from('payslips').insert(payslips);
      if (insertError) throw insertError;
    }

    // Update payroll run
    await supabase
      .from('payroll_runs')
      .update({
        status: 'COMPLETED',
        total_employees: payslips.length,
        total_gross: Math.round(totalGross * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run!.id);

    // Notify all employees
    for (const slip of payslips) {
      await supabase.rpc('create_notification', {
        p_user_id: slip.user_id,
        p_org_id: ctx.orgId,
        p_type: 'PAYSLIP_GENERATED',
        p_title: 'Payslip Available',
        p_message: `Your payslip for ${input.month.substring(0, 7)} is ready.`,
        p_metadata: { month: input.month, payroll_run_id: run!.id },
      });
    }

    await logAudit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'PAYROLL_GENERATE',
      resourceType: 'payroll_runs',
      resourceId: run!.id,
      newValue: {
        month: input.month,
        total_employees: payslips.length,
        total_gross: Math.round(totalGross * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        version: nextVersion,
      },
    });

    return jsonResponse({
      success: true,
      payroll_run_id: run!.id,
      total_employees: payslips.length,
      total_gross: Math.round(totalGross * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 400;
    return errorResponse(message, status);
  }
});
