import { z } from 'zod';

export const generatePayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  organization_id: z.string().uuid(),
});

export const exportPayrollCsvSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  organization_id: z.string().uuid(),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type ExportPayrollCsvInput = z.infer<typeof exportPayrollCsvSchema>;
