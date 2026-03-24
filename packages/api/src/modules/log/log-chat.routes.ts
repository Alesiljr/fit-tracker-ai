import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  userProfiles,
  weightLogs,
  exerciseLogs,
  moodLogs,
  sleepLogs,
  waterLogs,
  stepLogs,
  foodLogs,
} from '../../db/schema.js';
import { DAILY_LOG_SYSTEM_PROMPT } from '../../ai/prompts/daily-log.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

interface ExtractedData {
  weight_kg?: number | null;
  mood?: number | null;
  mood_note?: string | null;
  exercises?: { description: string; duration_min: number; type: string }[];
  water_glasses?: number | null;
  steps?: number | null;
  sleep?: { slept_at: string; woke_at: string; quality?: number } | null;
  meals?: { meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; description: string; estimated_calories?: number }[];
}

interface LogChatResponse {
  extracted_data: ExtractedData;
  confirmation_message: string;
  missing_fields: string[];
}

export async function logChatRoutes(fastify: FastifyInstance) {
  // POST /api/log/chat — interpret natural language and save daily log
  fastify.post('/api/log/chat', async (request, reply) => {
    const { message } = request.body as { message: string };
    if (!message?.trim()) {
      return reply.code(400).send({ error: 'Mensagem é obrigatória.' });
    }

    const userId = request.userId;
    const today = new Date().toISOString().split('T')[0];

    // Load existing data and user profile in parallel
    const [profile, weight, mood, water, steps, exercises, sleep, food] = await Promise.all([
      db.query.userProfiles.findFirst({ where: eq(userProfiles.id, userId) }),
      db.query.weightLogs.findFirst({ where: and(eq(weightLogs.userId, userId), eq(weightLogs.loggedDate, today)) }),
      db.query.moodLogs.findFirst({ where: and(eq(moodLogs.userId, userId), eq(moodLogs.loggedDate, today)) }),
      db.query.waterLogs.findFirst({ where: and(eq(waterLogs.userId, userId), eq(waterLogs.loggedDate, today)) }),
      db.query.stepLogs.findFirst({ where: and(eq(stepLogs.userId, userId), eq(stepLogs.loggedDate, today)) }),
      db.select().from(exerciseLogs).where(and(eq(exerciseLogs.userId, userId), eq(exerciseLogs.loggedDate, today))),
      db.query.sleepLogs.findFirst({ where: and(eq(sleepLogs.userId, userId), eq(sleepLogs.loggedDate, today)) }),
      db.select().from(foodLogs).where(and(eq(foodLogs.userId, userId), eq(foodLogs.loggedDate, today))),
    ]);

    const existingDataStr = [
      weight ? `Peso: ${weight.weightKg}kg` : null,
      mood ? `Humor: ${mood.mood}/5` : null,
      water ? `Água: ${water.glasses} copos` : null,
      steps ? `Passos: ${steps.steps}` : null,
      exercises.length > 0 ? `Exercício: ${exercises.map(e => e.rawInput).join(', ')}` : null,
      sleep ? `Sono: registrado` : null,
      ...food.map(f => `${f.mealType}: ${f.description}`),
    ].filter(Boolean).join(' | ') || 'Nenhum dado registrado ainda hoje';

    const systemPrompt = DAILY_LOG_SYSTEM_PROMPT
      .replace('{userName}', profile?.displayName || 'Usuário')
      .replace('{existingData}', existingDataStr);

    // Call Gemini API
    let parsed: LogChatResponse;
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      );
      const geminiData = await geminiResponse.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      parsed = JSON.parse(rawText);
    } catch (err) {
      fastify.log.error(err, 'Failed to parse AI response');
      return reply.code(500).send({ error: 'Erro ao interpretar a mensagem. Tente novamente.' });
    }

    const data = parsed.extracted_data;
    const savePromises: Promise<unknown>[] = [];

    // Save extracted data
    if (data.weight_kg != null) {
      savePromises.push(
        db.insert(weightLogs).values({
          userId, loggedDate: today, weightKg: data.weight_kg.toString(),
        }).onConflictDoUpdate({
          target: [weightLogs.userId, weightLogs.loggedDate],
          set: { weightKg: data.weight_kg.toString(), updatedAt: new Date() },
        }),
      );
    }

    if (data.mood != null) {
      const moodStr = String(data.mood) as '1' | '2' | '3' | '4' | '5';
      savePromises.push(
        db.insert(moodLogs).values({
          userId, loggedDate: today, mood: moodStr, note: data.mood_note ?? null,
        }).onConflictDoUpdate({
          target: [moodLogs.userId, moodLogs.loggedDate],
          set: { mood: moodStr, note: data.mood_note ?? null, updatedAt: new Date() },
        }),
      );
    }

    if (data.water_glasses != null) {
      savePromises.push(
        db.insert(waterLogs).values({
          userId, loggedDate: today, glasses: data.water_glasses,
        }).onConflictDoUpdate({
          target: [waterLogs.userId, waterLogs.loggedDate],
          set: { glasses: data.water_glasses, updatedAt: new Date() },
        }),
      );
    }

    if (data.steps != null) {
      savePromises.push(
        db.insert(stepLogs).values({
          userId, loggedDate: today, steps: data.steps,
        }).onConflictDoUpdate({
          target: [stepLogs.userId, stepLogs.loggedDate],
          set: { steps: data.steps, updatedAt: new Date() },
        }),
      );
    }

    if (data.exercises && data.exercises.length > 0) {
      for (const ex of data.exercises) {
        savePromises.push(
          db.insert(exerciseLogs).values({
            userId, loggedDate: today, rawInput: ex.description,
            exercises: [ex], totalDurationMin: ex.duration_min,
            estimatedCalories: Math.round(ex.duration_min * (
              ex.type === 'cardio' ? 10 : ex.type === 'strength' ? 8 : 6
            )),
          }),
        );
      }
    }

    if (data.sleep) {
      const sleptAt = new Date(`${today}T${data.sleep.slept_at}:00`);
      const wokeAt = new Date(`${today}T${data.sleep.woke_at}:00`);
      const durationMin = Math.abs(Math.round((wokeAt.getTime() - sleptAt.getTime()) / 60000));
      savePromises.push(
        db.insert(sleepLogs).values({
          userId, loggedDate: today, sleptAt, wokeAt,
          quality: data.sleep.quality ?? 3, durationMin,
        }).onConflictDoUpdate({
          target: [sleepLogs.userId, sleepLogs.loggedDate],
          set: { sleptAt, wokeAt, quality: data.sleep.quality ?? 3, durationMin, updatedAt: new Date() },
        }),
      );
    }

    if (data.meals && data.meals.length > 0) {
      for (const meal of data.meals) {
        savePromises.push(
          db.insert(foodLogs).values({
            userId, loggedDate: today, mealType: meal.meal_type,
            description: meal.description,
            totalCalories: meal.estimated_calories ?? null,
            aiEstimated: true,
          }).onConflictDoUpdate({
            target: [foodLogs.userId, foodLogs.loggedDate, foodLogs.mealType],
            set: {
              description: meal.description,
              totalCalories: meal.estimated_calories ?? null,
              aiEstimated: true,
              updatedAt: new Date(),
            },
          }),
        );
      }
    }

    await Promise.allSettled(savePromises);

    return {
      message: parsed.confirmation_message,
      extracted_data: parsed.extracted_data,
      missing_fields: parsed.missing_fields,
      saved: true,
    };
  });
}
