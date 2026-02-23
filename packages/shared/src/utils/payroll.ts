import type {
  PayrollCalculationInput,
  PayrollCalculationResult,
  SalaryStructure,
} from '../types/payroll';

/**
 * Standard payroll calculation.
 *
 * Formula:
 *   working_days = calendar_days - weekends - holidays
 *   per_day_rate = gross_monthly / working_days
 *   LOP_days = unpaid_leave + (absents if count_absent_as_lop) + (non_compliant if count_non_compliant_as_lop)
 *   payable_days = working_days - LOP_days
 *   lop_deduction = per_day_rate × LOP_days
 *   net_pay = gross_pay - lop_deduction - statutory_deductions
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const { base_monthly_salary, salary_structure, working_days, lop_days } = input;

  const payable_days = Math.max(0, working_days - lop_days);
  const per_day_rate = working_days > 0 ? base_monthly_salary / working_days : 0;
  const lop_deduction = roundCurrency(per_day_rate * lop_days);

  // Compute earnings
  const earnings = computeEarnings(base_monthly_salary, salary_structure);
  const gross_pay = earnings.reduce((sum, e) => sum + e.amount, 0);

  // Compute deductions (statutory)
  const deductions = computeDeductions(gross_pay, salary_structure);
  const total_statutory_deductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  const total_deductions = roundCurrency(lop_deduction + total_statutory_deductions);
  const net_pay = roundCurrency(gross_pay - total_deductions);

  return {
    working_days,
    lop_days,
    payable_days,
    per_day_rate: roundCurrency(per_day_rate),
    gross_pay: roundCurrency(gross_pay),
    lop_deduction,
    earnings,
    deductions,
    total_deductions,
    net_pay: Math.max(0, net_pay),
  };
}

/**
 * Compute earnings from salary structure or default to base salary.
 */
function computeEarnings(
  baseSalary: number,
  structure: SalaryStructure | null
): { name: string; amount: number }[] {
  if (!structure || structure.earnings.length === 0) {
    return [{ name: 'Basic Salary', amount: roundCurrency(baseSalary) }];
  }

  const result: { name: string; amount: number }[] = [];
  const computed: Record<string, number> = {};

  // First pass: fixed amounts
  for (const comp of structure.earnings) {
    if (!comp.is_percentage) {
      computed[comp.name] = comp.amount;
      result.push({ name: comp.name, amount: roundCurrency(comp.amount) });
    }
  }

  // Second pass: percentage-based
  for (const comp of structure.earnings) {
    if (comp.is_percentage) {
      const baseRef = comp.percentage_of ? (computed[comp.percentage_of] ?? baseSalary) : baseSalary;
      const amount = (comp.amount / 100) * baseRef;
      computed[comp.name] = amount;
      result.push({ name: comp.name, amount: roundCurrency(amount) });
    }
  }

  return result;
}

/**
 * Compute statutory deductions.
 * Defaults:
 *   EPF Employee = 12% of Basic
 *   ESI Employee = 0.75% of Gross (if gross <= 21000)
 *   Professional Tax = flat 200 (standard, capped)
 *
 * Can be overridden via salary_structure.deductions.
 */
function computeDeductions(
  grossPay: number,
  structure: SalaryStructure | null
): { name: string; amount: number }[] {
  if (structure && structure.deductions.length > 0) {
    return structure.deductions.map((d) => {
      if (d.is_percentage) {
        return { name: d.name, amount: roundCurrency((d.amount / 100) * grossPay) };
      }
      return { name: d.name, amount: roundCurrency(d.amount) };
    });
  }

  // Default statutory deductions (Indian standard)
  const deductions: { name: string; amount: number }[] = [];

  // EPF: 12% of Basic (assume Basic = 40% of Gross for default)
  const basicForPF = grossPay * 0.4;
  const epf = Math.min(basicForPF * 0.12, 1800); // capped at 15000 basic * 12%
  deductions.push({ name: 'EPF (Employee)', amount: roundCurrency(epf) });

  // ESI: 0.75% of Gross if gross <= 21000
  if (grossPay <= 21000) {
    deductions.push({ name: 'ESI (Employee)', amount: roundCurrency(grossPay * 0.0075) });
  }

  // Professional Tax: standard 200/month
  deductions.push({ name: 'Professional Tax', amount: 200 });

  return deductions;
}

/**
 * Round to 2 decimal places for currency.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
