import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const deviceTokenExchangeSchema = z.object({
  device_name: z.string().min(1),
  device_os: z.enum(['macos', 'windows', 'linux']),
  auth_token: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type DeviceTokenExchangeInput = z.infer<typeof deviceTokenExchangeSchema>;
