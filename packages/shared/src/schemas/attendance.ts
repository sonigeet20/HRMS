import { z } from 'zod';

export const checkInSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().positive().optional(),
  wifi_ssid: z.string().optional(),
});

export const checkOutSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const pingSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  idle_seconds: z.number().min(0).default(0),
});

export const idleEventSchema = z.object({
  idle_minutes: z.number().min(0),
  started_at: z.string().datetime(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type PingInput = z.infer<typeof pingSchema>;
export type IdleEventInput = z.infer<typeof idleEventSchema>;
