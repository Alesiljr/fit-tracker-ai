import { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  weightLogs,
  exerciseLogs,
  moodLogs,
  sleepLogs,
  waterLogs,
  stepLogs,
} from '../../db/schema.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/today
  fastify.get('/api/dashboard/today', async (request) => {
    const today = new Date().toISOString().split('T')[0];
    const userId = request.userId;

    const [weight, mood, sleep, water, steps, exercises] = await Promise.all([
      db.query.weightLogs.findFirst({
        where: and(eq(weightLogs.userId, userId), eq(weightLogs.loggedDate, today)),
      }),
      db.query.moodLogs.findFirst({
        where: and(eq(moodLogs.userId, userId), eq(moodLogs.loggedDate, today)),
      }),
      db.query.sleepLogs.findFirst({
        where: and(eq(sleepLogs.userId, userId), eq(sleepLogs.loggedDate, today)),
      }),
      db.query.waterLogs.findFirst({
        where: and(eq(waterLogs.userId, userId), eq(waterLogs.loggedDate, today)),
      }),
      db.query.stepLogs.findFirst({
        where: and(eq(stepLogs.userId, userId), eq(stepLogs.loggedDate, today)),
      }),
      db.select()
        .from(exerciseLogs)
        .where(and(eq(exerciseLogs.userId, userId), eq(exerciseLogs.loggedDate, today))),
    ]);

    const totalExerciseMin = exercises.reduce((sum, e) => sum + (e.totalDurationMin || 0), 0);
    const totalExerciseCal = exercises.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0);

    return {
      date: today,
      weight: weight?.weightKg ?? null,
      mood: mood?.mood ?? null,
      moodNote: mood?.note ?? null,
      sleepDurationMin: sleep?.durationMin ?? null,
      sleepQuality: sleep?.quality ?? null,
      waterGlasses: water?.glasses ?? 0,
      steps: steps?.steps ?? 0,
      exerciseMinutes: totalExerciseMin,
      exerciseCalories: totalExerciseCal,
    };
  });

  // GET /api/dashboard/progress?days=7
  fastify.get('/api/dashboard/progress', async (request) => {
    const { days = '7' } = request.query as { days?: string };
    const numDays = Math.min(Number(days) || 7, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    const start = startDate.toISOString().split('T')[0];
    const userId = request.userId;

    const [weights, moods, sleeps, waters, stepsList] = await Promise.all([
      db.select().from(weightLogs)
        .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedDate, start)))
        .orderBy(weightLogs.loggedDate),
      db.select().from(moodLogs)
        .where(and(eq(moodLogs.userId, userId), gte(moodLogs.loggedDate, start)))
        .orderBy(moodLogs.loggedDate),
      db.select().from(sleepLogs)
        .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.loggedDate, start)))
        .orderBy(sleepLogs.loggedDate),
      db.select().from(waterLogs)
        .where(and(eq(waterLogs.userId, userId), gte(waterLogs.loggedDate, start)))
        .orderBy(waterLogs.loggedDate),
      db.select().from(stepLogs)
        .where(and(eq(stepLogs.userId, userId), gte(stepLogs.loggedDate, start)))
        .orderBy(stepLogs.loggedDate),
    ]);

    return { period: numDays, weights, moods, sleeps, waters, steps: stepsList };
  });
}
