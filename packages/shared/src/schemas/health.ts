import { z } from 'zod';

// ============================================================
// HEALTH LOG SCHEMAS
// ============================================================

const dateString = z.string().date();

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const weightLogSchema = z.object({
  loggedDate: dateString,
  weightKg: z.number().min(10).max(500),
  notes: z.string().max(500).optional(),
});

export const exerciseLogSchema = z.object({
  loggedDate: dateString,
  rawInput: z.string().min(1).max(2000),
});

export const moodLogSchema = z.object({
  loggedDate: dateString,
  mood: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  note: z.string().max(500).optional(),
});

export const sleepLogSchema = z.object({
  loggedDate: dateString,
  sleptAt: z.string().datetime(),
  wokeAt: z.string().datetime(),
  quality: z.number().int().min(1).max(5),
});

export const waterLogSchema = z.object({
  loggedDate: dateString,
  glasses: z.number().int().min(0).max(50),
});

export const stepLogSchema = z.object({
  loggedDate: dateString,
  steps: z.number().int().min(0).max(200000),
});

export const foodLogSchema = z.object({
  loggedDate: dateString,
  meal: mealTypeSchema,
  rawInput: z.string().min(1).max(2000),
});

// ============================================================
// INFERRED TYPES
// ============================================================

export type WeightLogInput = z.infer<typeof weightLogSchema>;
export type ExerciseLogInput = z.infer<typeof exerciseLogSchema>;
export type MoodLogInput = z.infer<typeof moodLogSchema>;
export type SleepLogInput = z.infer<typeof sleepLogSchema>;
export type WaterLogInput = z.infer<typeof waterLogSchema>;
export type StepLogInput = z.infer<typeof stepLogSchema>;
export type FoodLogInput = z.infer<typeof foodLogSchema>;
export type MealTypeInput = z.infer<typeof mealTypeSchema>;
