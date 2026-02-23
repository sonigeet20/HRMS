import type { PAYROLL_RUN_STATUS } from '../constants';

export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUS)[keyof typeof PAYROLL_RUN_STATUS];

export interface SalaryComponent {
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
  is_percentage: boolean;
  percentage_of?: string;
}

export interface SalaryStructure {
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
}

export interface PayrollProfile {
  id: string;
  user_id: string;
  organization_id: string;
  base_monthly_salary: number;
  currency: string;
  salary_structure: SalaryStructure | null;
  payment_method: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  organization_id: string;
  month: string;
  status: PayrollRunStatus;
  total_employees: number;
  total_gross: number;
  total_net: number;
  started_by: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface PayslipBreakdown {
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  lop_deduction: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
}

export interface Payslip {
  id: string;
  user_id: string;
  organization_id: string;
  payroll_run_id: string;
  month: string;
  version: number;
  is_active: boolean;
  working_days: number;
  lop_days: number;
  payable_days: number;
  gross_pay: number;
  lop_deduction: number;
  total_deductions: number;
  net_pay: number;
  breakdown: PayslipBreakdown;
  file_path: string | null;
  created_at: string;
}

export interface PayrollCalculationInput {
  base_monthly_salary: number;
  salary_structure: SalaryStructure | null;
  working_days: number;
  lop_days: number;
}

export interface PayrollCalculationResult {
  working_days: number;
  lop_days: number;
  payable_days: number;
  per_day_rate: number;
  gross_pay: number;
  lop_deduction: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  total_deductions: number;
  net_pay: number;
}
