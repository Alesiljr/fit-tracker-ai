import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { userProfiles, onboardingData, userBoundaries, userPreferences } from '../../db/schema.js';
import { updateProfileSchema, onboardingSchema } from '@fittracker/shared';

export async function profileRoutes(fastify: FastifyInstance) {
  // GET /api/profile
  fastify.get('/api/profile', async (request, reply) => {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, request.userId),
    });

    if (!profile) {
      return reply.code(404).send({ error: 'Perfil não encontrado' });
    }

    return profile;
  });

  // PUT /api/profile
  fastify.put('/api/profile', async (request, reply) => {
    const result = updateProfileSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { heightCm, initialWeight, ...rest } = result.data;
    const updated = await db
      .update(userProfiles)
      .set({
        ...rest,
        ...(heightCm !== undefined && { heightCm: heightCm.toString() }),
        ...(initialWeight !== undefined && { initialWeight: initialWeight.toString() }),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, request.userId))
      .returning();

    if (updated.length === 0) {
      return reply.code(404).send({ error: 'Perfil não encontrado' });
    }

    return updated[0];
  });

  // POST /api/profile/onboarding
  fastify.post('/api/profile/onboarding', async (request, reply) => {
    const result = onboardingSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const data = result.data;

    // Transaction: update profile + create onboarding + create boundaries + create preferences
    await db.transaction(async (tx) => {
      // 1. Update profile
      await tx
        .update(userProfiles)
        .set({
          objective: data.objective,
          heightCm: data.heightCm?.toString(),
          initialWeight: data.initialWeight?.toString(),
          dateOfBirth: data.dateOfBirth,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, request.userId));

      // 2. Upsert onboarding data
      await tx
        .insert(onboardingData)
        .values({
          userId: request.userId,
          exerciseLocations: data.exerciseLocations,
          dietaryRestrictions: data.dietaryRestrictions,
          aiDislikes: data.aiDislikes,
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: onboardingData.userId,
          set: {
            exerciseLocations: data.exerciseLocations,
            dietaryRestrictions: data.dietaryRestrictions,
            aiDislikes: data.aiDislikes,
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      // 3. Create boundaries from ai_dislikes
      for (const dislike of data.aiDislikes) {
        const normalized = dislike.toLowerCase().trim();
        await tx.insert(userBoundaries).values({
          userId: request.userId,
          boundaryType: 'hard',
          category: 'other',
          item: dislike,
          itemNormalized: normalized,
          keywords: [normalized],
          isActive: true,
        });
      }

      // 4. Create preferences from dietary restrictions
      for (const restriction of data.dietaryRestrictions) {
        await tx.insert(userPreferences).values({
          userId: request.userId,
          category: 'food',
          item: restriction,
          description: `Restrição alimentar: ${restriction}`,
          source: 'onboarding',
          confidence: '0.90',
          isActive: true,
        });
      }

      // 5. Create preferences from exercise locations
      for (const location of data.exerciseLocations) {
        await tx.insert(userPreferences).values({
          userId: request.userId,
          category: 'exercise',
          item: location,
          description: `Prefere exercitar: ${location}`,
          source: 'onboarding',
          confidence: '0.90',
          isActive: true,
        });
      }
    });

    return { success: true };
  });
}
