import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { userGoals } from '../../db/schema.js';
import { z } from 'zod';

const createGoalSchema = z.object({
  goalType: z.enum(['weight', 'water', 'exercise_duration', 'steps', 'sleep', 'custom']),
  title: z.string().min(1).max(200),
  targetValue: z.number().positive(),
  unit: z.string().min(1).max(20),
  direction: z.enum(['increase', 'decrease']).default('decrease'),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetValue: z.number().positive().optional(),
  currentValue: z.number().optional(),
  status: z.enum(['active', 'achieved', 'archived']).optional(),
});

export async function goalsRoutes(fastify: FastifyInstance) {
  // POST /api/goals
  fastify.post('/api/goals', async (request, reply) => {
    const result = createGoalSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const goal = await db.insert(userGoals).values({
      userId: request.userId,
      goalType: result.data.goalType,
      title: result.data.title,
      targetValue: result.data.targetValue.toString(),
      unit: result.data.unit,
      direction: result.data.direction,
    }).returning();

    return goal[0];
  });

  // GET /api/goals
  fastify.get('/api/goals', async (request) => {
    return db.select().from(userGoals)
      .where(and(eq(userGoals.userId, request.userId), eq(userGoals.status, 'active')));
  });

  // PUT /api/goals/:id
  fastify.put<{ Params: { id: string } }>('/api/goals/:id', async (request, reply) => {
    const result = updateGoalSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { currentValue, targetValue, ...rest } = result.data;
    const updated = await db.update(userGoals)
      .set({
        ...rest,
        ...(targetValue !== undefined && { targetValue: targetValue.toString() }),
        ...(currentValue !== undefined && { currentValue: currentValue.toString() }),
        ...(result.data.status === 'achieved' && { achievedAt: new Date() }),
        ...(result.data.status === 'archived' && { archivedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(and(eq(userGoals.id, request.params.id), eq(userGoals.userId, request.userId)))
      .returning();

    if (updated.length === 0) {
      return reply.code(404).send({ error: 'Meta não encontrada' });
    }

    return updated[0];
  });

  // DELETE /api/goals/:id (archive)
  fastify.delete<{ Params: { id: string } }>('/api/goals/:id', async (request, reply) => {
    const updated = await db.update(userGoals)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(userGoals.id, request.params.id), eq(userGoals.userId, request.userId)))
      .returning();

    if (updated.length === 0) {
      return reply.code(404).send({ error: 'Meta não encontrada' });
    }

    return { success: true };
  });
}
