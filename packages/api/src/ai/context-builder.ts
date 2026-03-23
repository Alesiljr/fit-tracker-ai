import { eq, and, gte, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  userProfiles,
  userBoundaries,
  userPreferences,
  userGoals,
  moodLogs,
  weightLogs,
  exerciseLogs,
  waterLogs,
  sleepLogs,
  stepLogs,
} from '../db/schema.js';
import { SYSTEM_PROMPT } from './prompts/system.js';
import { getToneInstruction } from './tone-adapter.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function buildPrompt(userId: string, userMessage: string): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = formatDate(sevenDaysAgo);
  const todayStr = formatDate(new Date());

  // Load all data in parallel
  const [
    profileRows,
    boundaries,
    preferences,
    goals,
    todayMood,
    recentWeights,
    recentExercises,
    recentWater,
    recentSleep,
    recentSteps,
  ] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1),
    db
      .select()
      .from(userBoundaries)
      .where(and(eq(userBoundaries.userId, userId), eq(userBoundaries.isActive, true))),
    db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.isActive, true))),
    db
      .select()
      .from(userGoals)
      .where(and(eq(userGoals.userId, userId), eq(userGoals.status, 'active'))),
    db
      .select()
      .from(moodLogs)
      .where(and(eq(moodLogs.userId, userId), eq(moodLogs.loggedDate, todayStr)))
      .limit(1),
    db
      .select()
      .from(weightLogs)
      .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedDate, sevenDaysAgoStr)))
      .orderBy(desc(weightLogs.loggedDate)),
    db
      .select()
      .from(exerciseLogs)
      .where(and(eq(exerciseLogs.userId, userId), gte(exerciseLogs.loggedDate, sevenDaysAgoStr)))
      .orderBy(desc(exerciseLogs.loggedDate)),
    db
      .select()
      .from(waterLogs)
      .where(and(eq(waterLogs.userId, userId), gte(waterLogs.loggedDate, sevenDaysAgoStr)))
      .orderBy(desc(waterLogs.loggedDate)),
    db
      .select()
      .from(sleepLogs)
      .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.loggedDate, sevenDaysAgoStr)))
      .orderBy(desc(sleepLogs.loggedDate)),
    db
      .select()
      .from(stepLogs)
      .where(and(eq(stepLogs.userId, userId), gte(stepLogs.loggedDate, sevenDaysAgoStr)))
      .orderBy(desc(stepLogs.loggedDate)),
  ]);

  const profile = profileRows[0];
  const userName = profile?.displayName ?? 'Usuário';

  // Format boundaries section
  const boundariesText =
    boundaries.length > 0
      ? boundaries
          .map(
            (b) =>
              `- [${b.boundaryType.toUpperCase()}] ${b.category}: ${b.item}${b.reason ? ` (reason: ${b.reason})` : ''}`,
          )
          .join('\n')
      : 'No boundaries configured.';

  // Format preferences section
  const preferencesText =
    preferences.length > 0
      ? preferences
          .map(
            (p) =>
              `- ${p.category}: ${p.item}${p.description ? ` — ${p.description}` : ''} (source: ${p.source}, confidence: ${p.confidence})`,
          )
          .join('\n')
      : 'No preferences recorded yet.';

  // Format mood section
  const currentMood = todayMood[0];
  const moodLevel = currentMood ? parseInt(currentMood.mood, 10) : 3;
  const moodText = currentMood
    ? `Level ${currentMood.mood}/5${currentMood.note ? ` — "${currentMood.note}"` : ''}`
    : 'Not logged today (assuming neutral — level 3)';

  const toneInstruction = getToneInstruction(moodLevel);

  // Format recent health data
  const recentDataLines: string[] = [];

  if (recentWeights.length > 0) {
    recentDataLines.push('Weight:');
    for (const w of recentWeights) {
      recentDataLines.push(`  ${w.loggedDate}: ${w.weightKg} kg`);
    }
  }

  if (recentExercises.length > 0) {
    recentDataLines.push('Exercise:');
    for (const e of recentExercises) {
      recentDataLines.push(
        `  ${e.loggedDate}: ${e.rawInput} (${e.totalDurationMin ?? '?'} min, ~${e.estimatedCalories ?? '?'} cal)`,
      );
    }
  }

  if (recentWater.length > 0) {
    recentDataLines.push('Water:');
    for (const w of recentWater) {
      recentDataLines.push(`  ${w.loggedDate}: ${w.glasses} glasses`);
    }
  }

  if (recentSleep.length > 0) {
    recentDataLines.push('Sleep:');
    for (const s of recentSleep) {
      recentDataLines.push(
        `  ${s.loggedDate}: ${s.durationMin ?? '?'} min, quality ${s.quality}/5`,
      );
    }
  }

  if (recentSteps.length > 0) {
    recentDataLines.push('Steps:');
    for (const s of recentSteps) {
      recentDataLines.push(`  ${s.loggedDate}: ${s.steps} steps`);
    }
  }

  const recentDataText =
    recentDataLines.length > 0 ? recentDataLines.join('\n') : 'No recent data available.';

  // Format goals section
  const goalsText =
    goals.length > 0
      ? goals
          .map(
            (g) =>
              `- ${g.title}: target ${g.targetValue} ${g.unit} (current: ${g.currentValue ?? 'not set'}) [${g.direction}]`,
          )
          .join('\n')
      : 'No active goals.';

  // Assemble the prompt
  const systemPrompt = SYSTEM_PROMPT.replace('{userName}', userName)
    .replace('{boundaries}', boundariesText)
    .replace('{preferences}', preferencesText)
    .replace('{mood}', moodText)
    .replace('{toneInstruction}', toneInstruction)
    .replace('{recentData}', recentDataText)
    .replace('{goals}', goalsText);

  return `${systemPrompt}\n\n## User Message\n${userMessage}`;
}
