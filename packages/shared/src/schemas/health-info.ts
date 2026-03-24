import { z } from 'zod';

export const medicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
});

export const updateHealthInfoSchema = z.object({
  intolerances: z.array(z.string().max(100)).max(50).default([]),
  allergies: z.array(z.string().max(100)).max(50).default([]),
  medications: z.array(medicationSchema).max(30).default([]),
  supplements: z.array(medicationSchema).max(30).default([]),
});

export type UpdateHealthInfoInput = z.infer<typeof updateHealthInfoSchema>;
