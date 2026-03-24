import { z } from 'zod';

export const userObjectiveSchema = z.enum([
  'lose_weight',
  'gain_muscle',
  'improve_health',
  'maintain',
]);

export const moodLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  dateOfBirth: z.string().date().optional(),
  heightCm: z.number().min(50).max(300).optional(),
  initialWeight: z.number().min(10).max(500).optional(),
  objective: userObjectiveSchema.optional(),
  timezone: z.string().optional(),
});

export const onboardingSchema = z.object({
  objective: userObjectiveSchema,
  heightCm: z.number().min(50).max(300).optional(),
  initialWeight: z.number().min(10).max(500).optional(),
  dateOfBirth: z.string().date().optional(),
  exerciseLocations: z.array(z.enum(['home', 'gym', 'outdoor', 'other'])),
  dietaryRestrictions: z.array(z.string().max(100)),
  aiDislikes: z.array(z.string().max(200)),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export * from './auth';
export * from './chat';
export * from './health';
export * from './health-info';
