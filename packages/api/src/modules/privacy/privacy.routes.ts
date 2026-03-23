import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  userProfiles,
  onboardingData,
  userConsents,
  userBoundaries,
  userPreferences,
  weightLogs,
  exerciseLogs,
  moodLogs,
  sleepLogs,
  waterLogs,
  stepLogs,
  chatSessions,
  chatMessages,
  userGoals,
} from '../../db/schema.js';

export async function privacyRoutes(fastify: FastifyInstance) {
  // GET /api/privacy/export — Export all user data (JSON)
  fastify.get('/api/privacy/export', async (request) => {
    const userId = request.userId;

    const [
      profile,
      onboarding,
      consents,
      boundaries,
      preferences,
      weights,
      exercises,
      moods,
      sleeps,
      waters,
      steps,
      sessions,
      messages,
      goals,
    ] = await Promise.all([
      db.query.userProfiles.findFirst({ where: eq(userProfiles.id, userId) }),
      db.query.onboardingData.findFirst({ where: eq(onboardingData.userId, userId) }),
      db.query.userConsents.findFirst({ where: eq(userConsents.userId, userId) }),
      db.select().from(userBoundaries).where(eq(userBoundaries.userId, userId)),
      db.select().from(userPreferences).where(eq(userPreferences.userId, userId)),
      db.select().from(weightLogs).where(eq(weightLogs.userId, userId)),
      db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userId)),
      db.select().from(moodLogs).where(eq(moodLogs.userId, userId)),
      db.select().from(sleepLogs).where(eq(sleepLogs.userId, userId)),
      db.select().from(waterLogs).where(eq(waterLogs.userId, userId)),
      db.select().from(stepLogs).where(eq(stepLogs.userId, userId)),
      db.select().from(chatSessions).where(eq(chatSessions.userId, userId)),
      db.select().from(chatMessages).where(eq(chatMessages.userId, userId)),
      db.select().from(userGoals).where(eq(userGoals.userId, userId)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      profile,
      onboarding,
      consents,
      boundaries,
      preferences,
      healthData: { weights, exercises, moods, sleeps, waters, steps },
      chat: { sessions, messages },
      goals,
    };
  });

  // DELETE /api/privacy/account — Delete all user data
  fastify.delete('/api/privacy/account', async (request, reply) => {
    const userId = request.userId;

    // Delete in reverse dependency order
    await db.transaction(async (tx) => {
      await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
      await tx.delete(chatSessions).where(eq(chatSessions.userId, userId));
      await tx.delete(userGoals).where(eq(userGoals.userId, userId));
      await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
      await tx.delete(userBoundaries).where(eq(userBoundaries.userId, userId));
      await tx.delete(stepLogs).where(eq(stepLogs.userId, userId));
      await tx.delete(waterLogs).where(eq(waterLogs.userId, userId));
      await tx.delete(sleepLogs).where(eq(sleepLogs.userId, userId));
      await tx.delete(moodLogs).where(eq(moodLogs.userId, userId));
      await tx.delete(exerciseLogs).where(eq(exerciseLogs.userId, userId));
      await tx.delete(weightLogs).where(eq(weightLogs.userId, userId));
      await tx.delete(userConsents).where(eq(userConsents.userId, userId));
      await tx.delete(onboardingData).where(eq(onboardingData.userId, userId));
      await tx.delete(userProfiles).where(eq(userProfiles.id, userId));
    });

    // Note: Supabase Auth user deletion must be done via admin API in the application layer

    return { success: true, message: 'Todos os dados foram excluídos permanentemente' };
  });

  // GET /api/privacy/consent
  fastify.get('/api/privacy/consent', async (request) => {
    const consent = await db.query.userConsents.findFirst({
      where: eq(userConsents.userId, request.userId),
    });
    return consent || { aiDataUsage: false, dataRetention: false, privacyPolicyAccepted: false };
  });

  // PUT /api/privacy/consent
  fastify.put('/api/privacy/consent', async (request, reply) => {
    const body = request.body as {
      aiDataUsage?: boolean;
      dataRetention?: boolean;
      privacyPolicyAccepted?: boolean;
    };

    const existing = await db.query.userConsents.findFirst({
      where: eq(userConsents.userId, request.userId),
    });

    if (existing) {
      const updated = await db.update(userConsents)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(userConsents.userId, request.userId))
        .returning();
      return updated[0];
    }

    const created = await db.insert(userConsents).values({
      userId: request.userId,
      aiDataUsage: body.aiDataUsage || false,
      dataRetention: body.dataRetention || false,
      privacyPolicyAccepted: body.privacyPolicyAccepted || false,
    }).returning();

    return created[0];
  });
}
