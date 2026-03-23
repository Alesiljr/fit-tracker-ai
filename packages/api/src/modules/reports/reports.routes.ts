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

export async function reportsRoutes(fastify: FastifyInstance) {
  // GET /api/reports/weekly
  fastify.get('/api/reports/weekly', async (request) => {
    const userId = request.userId;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const start = weekStart.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    const [weights, moods, sleeps, waters, steps, exercises] = await Promise.all([
      db.select().from(weightLogs).where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedDate, start))),
      db.select().from(moodLogs).where(and(eq(moodLogs.userId, userId), gte(moodLogs.loggedDate, start))),
      db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.loggedDate, start))),
      db.select().from(waterLogs).where(and(eq(waterLogs.userId, userId), gte(waterLogs.loggedDate, start))),
      db.select().from(stepLogs).where(and(eq(stepLogs.userId, userId), gte(stepLogs.loggedDate, start))),
      db.select().from(exerciseLogs).where(and(eq(exerciseLogs.userId, userId), gte(exerciseLogs.loggedDate, start))),
    ]);

    const avgMood = moods.length > 0 ? moods.reduce((s, m) => s + Number(m.mood), 0) / moods.length : null;
    const avgWater = waters.length > 0 ? waters.reduce((s, w) => s + w.glasses, 0) / waters.length : null;
    const avgSleepQuality = sleeps.length > 0 ? sleeps.reduce((s, sl) => s + sl.quality, 0) / sleeps.length : null;
    const totalExerciseMin = exercises.reduce((s, e) => s + (e.totalDurationMin || 0), 0);
    const daysWithLogs = new Set([
      ...weights.map(w => w.loggedDate),
      ...moods.map(m => m.loggedDate),
      ...exercises.map(e => e.loggedDate),
    ]).size;

    return {
      periodStart: start,
      periodEnd: end,
      type: 'weekly',
      metrics: {
        daysWithLogs,
        avgMood: avgMood?.toFixed(1),
        avgWater: avgWater?.toFixed(1),
        avgSleepQuality: avgSleepQuality?.toFixed(1),
        totalExerciseMinutes: totalExerciseMin,
        weightStart: weights.length > 0 ? weights[0].weightKg : null,
        weightEnd: weights.length > 0 ? weights[weights.length - 1].weightKg : null,
      },
      // AI narrative will be generated here when Claude API is connected
      narrative: null,
      rawData: { weights, moods, sleeps, waters, steps, exercises },
    };
  });

  // GET /api/reports/insights — Basic pattern detection
  fastify.get('/api/reports/insights', async (request) => {
    const userId = request.userId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const start = thirtyDaysAgo.toISOString().split('T')[0];

    const [moods, sleeps] = await Promise.all([
      db.select().from(moodLogs).where(and(eq(moodLogs.userId, userId), gte(moodLogs.loggedDate, start))).orderBy(moodLogs.loggedDate),
      db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.loggedDate, start))).orderBy(sleepLogs.loggedDate),
    ]);

    const insights: string[] = [];

    // Sleep-mood correlation
    if (moods.length >= 5 && sleeps.length >= 5) {
      const goodSleepDays = sleeps.filter(s => (s.durationMin || 0) >= 420); // 7h+
      const goodSleepDates = new Set(goodSleepDays.map(s => s.loggedDate));
      const moodsAfterGoodSleep = moods.filter(m => goodSleepDates.has(m.loggedDate));
      const avgMoodGoodSleep = moodsAfterGoodSleep.length > 0
        ? moodsAfterGoodSleep.reduce((s, m) => s + Number(m.mood), 0) / moodsAfterGoodSleep.length
        : 0;
      const avgMoodAll = moods.reduce((s, m) => s + Number(m.mood), 0) / moods.length;

      if (avgMoodGoodSleep > avgMoodAll + 0.3) {
        insights.push('Quando você dorme 7h ou mais, seu humor no dia seguinte tende a ser melhor.');
      }
    }

    // Consistency detection
    if (moods.length >= 20) {
      insights.push(`Você registrou humor em ${moods.length} dos últimos 30 dias. Consistência excelente!`);
    }

    return { insights, period: '30d' };
  });
}
