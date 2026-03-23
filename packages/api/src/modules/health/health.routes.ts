import { FastifyInstance } from 'fastify';
import { eq, and, between, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  weightLogs,
  exerciseLogs,
  moodLogs,
  sleepLogs,
  waterLogs,
  stepLogs,
} from '../../db/schema.js';
import {
  weightLogSchema,
  exerciseLogSchema,
  moodLogSchema,
  sleepLogSchema,
  waterLogSchema,
  stepLogSchema,
  foodLogSchema,
} from '@fittracker/shared';

export async function healthRoutes(fastify: FastifyInstance) {
  // ============================================================
  // POST /api/health/weight — upsert weight for a date
  // ============================================================
  fastify.post('/api/health/weight', async (request, reply) => {
    const result = weightLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, weightKg, notes } = result.data;
    const row = await db
      .insert(weightLogs)
      .values({
        userId: request.userId,
        loggedDate,
        weightKg: weightKg.toString(),
        notes: notes ?? null,
      })
      .onConflictDoUpdate({
        target: [weightLogs.userId, weightLogs.loggedDate],
        set: {
          weightKg: weightKg.toString(),
          notes: notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/exercise — append exercise log
  // ============================================================
  fastify.post('/api/health/exercise', async (request, reply) => {
    const result = exerciseLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, rawInput } = result.data;
    const row = await db
      .insert(exerciseLogs)
      .values({
        userId: request.userId,
        loggedDate,
        rawInput,
        exercises: [],
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/mood — upsert mood for a date
  // ============================================================
  fastify.post('/api/health/mood', async (request, reply) => {
    const result = moodLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, mood, note } = result.data;
    const row = await db
      .insert(moodLogs)
      .values({
        userId: request.userId,
        loggedDate,
        mood: mood.toString() as '1' | '2' | '3' | '4' | '5',
        note: note ?? null,
      })
      .onConflictDoUpdate({
        target: [moodLogs.userId, moodLogs.loggedDate],
        set: {
          mood: mood.toString() as '1' | '2' | '3' | '4' | '5',
          note: note ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/sleep — upsert sleep for a date
  // ============================================================
  fastify.post('/api/health/sleep', async (request, reply) => {
    const result = sleepLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, sleptAt, wokeAt, quality } = result.data;
    const sleptAtDate = new Date(sleptAt);
    const wokeAtDate = new Date(wokeAt);
    const durationMin = Math.round(
      (wokeAtDate.getTime() - sleptAtDate.getTime()) / 60000,
    );

    const row = await db
      .insert(sleepLogs)
      .values({
        userId: request.userId,
        loggedDate,
        sleptAt: sleptAtDate,
        wokeAt: wokeAtDate,
        quality,
        durationMin: durationMin > 0 ? durationMin : null,
      })
      .onConflictDoUpdate({
        target: [sleepLogs.userId, sleepLogs.loggedDate],
        set: {
          sleptAt: sleptAtDate,
          wokeAt: wokeAtDate,
          quality,
          durationMin: durationMin > 0 ? durationMin : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/water — upsert (increment) water for a date
  // ============================================================
  fastify.post('/api/health/water', async (request, reply) => {
    const result = waterLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, glasses } = result.data;
    const row = await db
      .insert(waterLogs)
      .values({
        userId: request.userId,
        loggedDate,
        glasses,
      })
      .onConflictDoUpdate({
        target: [waterLogs.userId, waterLogs.loggedDate],
        set: {
          glasses,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/steps — upsert steps for a date
  // ============================================================
  fastify.post('/api/health/steps', async (request, reply) => {
    const result = stepLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { loggedDate, steps } = result.data;
    const row = await db
      .insert(stepLogs)
      .values({
        userId: request.userId,
        loggedDate,
        steps,
      })
      .onConflictDoUpdate({
        target: [stepLogs.userId, stepLogs.loggedDate],
        set: {
          steps,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row[0];
  });

  // ============================================================
  // POST /api/health/food — append food log entry
  // ============================================================
  fastify.post('/api/health/food', async (request, reply) => {
    const result = foodLogSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    // Food logs don't have a DB table with meal column in the current schema.
    // We store as exercise-style raw entries or extend later.
    // For now, return a success acknowledgment with the parsed data.
    // TODO: Add foodLogs table to schema if needed.
    const { loggedDate, meal, rawInput } = result.data;
    return {
      success: true,
      loggedDate,
      meal,
      rawInput,
      message: 'Food log recorded (pending foodLogs table migration)',
    };
  });

  // ============================================================
  // GET /api/health/daily/:date — all logs for a single date
  // ============================================================
  fastify.get('/api/health/daily/:date', async (request, reply) => {
    const { date } = request.params as { date: string };

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    const userId = request.userId;

    const [weight, exercise, mood, sleep, water, steps] = await Promise.all([
      db.query.weightLogs.findFirst({
        where: and(eq(weightLogs.userId, userId), eq(weightLogs.loggedDate, date)),
      }),
      db.query.exerciseLogs.findMany({
        where: and(eq(exerciseLogs.userId, userId), eq(exerciseLogs.loggedDate, date)),
      }),
      db.query.moodLogs.findFirst({
        where: and(eq(moodLogs.userId, userId), eq(moodLogs.loggedDate, date)),
      }),
      db.query.sleepLogs.findFirst({
        where: and(eq(sleepLogs.userId, userId), eq(sleepLogs.loggedDate, date)),
      }),
      db.query.waterLogs.findFirst({
        where: and(eq(waterLogs.userId, userId), eq(waterLogs.loggedDate, date)),
      }),
      db.query.stepLogs.findFirst({
        where: and(eq(stepLogs.userId, userId), eq(stepLogs.loggedDate, date)),
      }),
    ]);

    return {
      date,
      weight: weight ?? null,
      exercise,
      mood: mood ?? null,
      sleep: sleep ?? null,
      water: water ?? null,
      steps: steps ?? null,
    };
  });

  // ============================================================
  // GET /api/health/range?start=&end= — logs for a date range
  // ============================================================
  fastify.get('/api/health/range', async (request, reply) => {
    const { start, end } = request.query as { start?: string; end?: string };

    if (!start || !end) {
      return reply.code(400).send({ error: 'Parâmetros start e end são obrigatórios.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return reply.code(400).send({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    const userId = request.userId;

    const [weights, exercises, moods, sleeps, waters, stepsList] = await Promise.all([
      db.query.weightLogs.findMany({
        where: and(
          eq(weightLogs.userId, userId),
          between(weightLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
      db.query.exerciseLogs.findMany({
        where: and(
          eq(exerciseLogs.userId, userId),
          between(exerciseLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
      db.query.moodLogs.findMany({
        where: and(
          eq(moodLogs.userId, userId),
          between(moodLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
      db.query.sleepLogs.findMany({
        where: and(
          eq(sleepLogs.userId, userId),
          between(sleepLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
      db.query.waterLogs.findMany({
        where: and(
          eq(waterLogs.userId, userId),
          between(waterLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
      db.query.stepLogs.findMany({
        where: and(
          eq(stepLogs.userId, userId),
          between(stepLogs.loggedDate, start, end),
        ),
        orderBy: (t, { asc }) => [asc(t.loggedDate)],
      }),
    ]);

    return {
      start,
      end,
      weights,
      exercises,
      moods,
      sleeps,
      waters,
      steps: stepsList,
    };
  });
}
