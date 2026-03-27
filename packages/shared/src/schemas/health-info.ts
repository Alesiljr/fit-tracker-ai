import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const medicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
});

export const healthConditionSchema = z.object({
  name: z.string().min(1).max(200),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  diagnosedYear: z.number().int().min(1900).max(currentYear).optional(),
  notes: z.string().max(500).optional(),
});

export const supplementSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
});

export const healthInfoUpdateSchema = z.object({
  intolerances: z.array(z.string().max(100)).max(50).default([]),
  allergies: z.array(z.string().max(100)).max(50).default([]),
  medications: z.array(medicationSchema).max(30).default([]),
  supplements: z.array(supplementSchema).max(30).default([]),
  healthConditions: z.array(healthConditionSchema).max(30).default([]),
});

/** @deprecated Use healthInfoUpdateSchema instead */
export const updateHealthInfoSchema = healthInfoUpdateSchema;

export type MedicationInput = z.infer<typeof medicationSchema>;
export type HealthConditionInput = z.infer<typeof healthConditionSchema>;
export type SupplementInput = z.infer<typeof supplementSchema>;
export type HealthInfoUpdateInput = z.infer<typeof healthInfoUpdateSchema>;
/** @deprecated Use HealthInfoUpdateInput instead */
export type UpdateHealthInfoInput = z.infer<typeof updateHealthInfoSchema>;
