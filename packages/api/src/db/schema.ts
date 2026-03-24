import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  integer,
  pgEnum,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================
export const userObjectiveEnum = pgEnum('user_objective', [
  'lose_weight',
  'gain_muscle',
  'improve_health',
  'maintain',
]);

export const moodLevelEnum = pgEnum('mood_level', ['1', '2', '3', '4', '5']);

export const exerciseLocationEnum = pgEnum('exercise_location', [
  'home',
  'gym',
  'outdoor',
  'other',
]);

export const boundaryTypeEnum = pgEnum('boundary_type', ['hard', 'deferred']);

export const boundaryCategoryEnum = pgEnum('boundary_category', [
  'exercise',
  'food',
  'suggestion',
  'topic',
  'other',
]);

export const preferenceSourceEnum = pgEnum('preference_source', [
  'explicit',
  'implicit',
  'onboarding',
]);

export const feedbackTypeEnum = pgEnum('feedback_type', ['liked', 'rejected']);

export const goalTypeEnum = pgEnum('goal_type', [
  'weight',
  'water',
  'exercise_duration',
  'steps',
  'sleep',
  'custom',
]);

export const goalStatusEnum = pgEnum('goal_status', [
  'active',
  'achieved',
  'archived',
]);

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]);

export const reportTypeEnum = pgEnum('report_type', ['weekly', 'monthly']);

export const genderEnum = pgEnum('gender', ['male', 'female']);

// ============================================================
// USER PROFILES
// ============================================================
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  heightCm: numeric('height_cm', { precision: 5, scale: 1 }),
  initialWeight: numeric('initial_weight', { precision: 5, scale: 1 }),
  objective: userObjectiveEnum('objective').notNull().default('improve_health'),
  gender: genderEnum('gender'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').notNull().default('America/Sao_Paulo'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  featureUnlockLevel: integer('feature_unlock_level').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// ONBOARDING DATA
// ============================================================
export const onboardingData = pgTable('onboarding_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' })
    .unique(),
  exerciseLocations: text('exercise_locations').array().default([]),
  dietaryRestrictions: text('dietary_restrictions').array().default([]),
  aiDislikes: text('ai_dislikes').array().default([]),
  dailyRoutine: jsonb('daily_routine').default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// USER CONSENTS (LGPD)
// ============================================================
export const userConsents = pgTable('user_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' })
    .unique(),
  aiDataUsage: boolean('ai_data_usage').notNull().default(false),
  dataRetention: boolean('data_retention').notNull().default(false),
  privacyPolicyAccepted: boolean('privacy_policy_accepted').notNull().default(false),
  privacyPolicyVersion: text('privacy_policy_version').notNull().default('1.0'),
  consentedAt: timestamp('consented_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// USER BOUNDARIES (AI Engine)
// ============================================================
export const userBoundaries = pgTable('user_boundaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  boundaryType: boundaryTypeEnum('boundary_type').notNull(),
  category: boundaryCategoryEnum('category').notNull(),
  item: text('item').notNull(),
  itemNormalized: text('item_normalized').notNull(),
  reason: text('reason'),
  keywords: text('keywords').array().default([]),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  sourceMessageId: uuid('source_message_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// USER PREFERENCES
// ============================================================
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  category: boundaryCategoryEnum('category').notNull(),
  item: text('item').notNull(),
  description: text('description'),
  source: preferenceSourceEnum('source').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).notNull().default('0.50'),
  lastReinforcedAt: timestamp('last_reinforced_at', { withTimezone: true }).notNull().defaultNow(),
  decayAt: timestamp('decay_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// WEIGHT LOGS
// ============================================================
export const weightLogs = pgTable(
  'weight_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 1 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueWeightPerDay: uniqueIndex('uq_weight_per_day').on(table.userId, table.loggedDate),
  }),
);

// ============================================================
// MOOD LOGS
// ============================================================
export const moodLogs = pgTable(
  'mood_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    mood: moodLevelEnum('mood').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueMoodPerDay: uniqueIndex('uq_mood_per_day').on(table.userId, table.loggedDate),
  }),
);

// ============================================================
// EXERCISE LOGS
// ============================================================
export const exerciseLogs = pgTable('exercise_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  loggedDate: date('logged_date').notNull(),
  rawInput: text('raw_input').notNull(),
  exercises: jsonb('exercises').notNull().default([]),
  totalDurationMin: integer('total_duration_min'),
  estimatedCalories: integer('estimated_calories'),
  aiConfidence: numeric('ai_confidence', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// SLEEP LOGS
// ============================================================
export const sleepLogs = pgTable(
  'sleep_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    sleptAt: timestamp('slept_at', { withTimezone: true }).notNull(),
    wokeAt: timestamp('woke_at', { withTimezone: true }).notNull(),
    quality: integer('quality').notNull(),
    durationMin: integer('duration_min'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSleepPerDay: uniqueIndex('uq_sleep_per_day').on(table.userId, table.loggedDate),
  }),
);

// ============================================================
// WATER LOGS
// ============================================================
export const waterLogs = pgTable(
  'water_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    glasses: integer('glasses').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueWaterPerDay: uniqueIndex('uq_water_per_day').on(table.userId, table.loggedDate),
  }),
);

// ============================================================
// STEP LOGS
// ============================================================
export const stepLogs = pgTable(
  'step_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    steps: integer('steps').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueStepsPerDay: uniqueIndex('uq_steps_per_day').on(table.userId, table.loggedDate),
  }),
);

// ============================================================
// FOOD LOGS
// ============================================================
export const foodLogs = pgTable(
  'food_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    loggedDate: date('logged_date').notNull(),
    mealType: mealTypeEnum('meal_type').notNull(),
    description: text('description').notNull(),
    items: jsonb('items').default([]),
    totalCalories: integer('total_calories'),
    aiEstimated: boolean('ai_estimated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueFoodPerMeal: uniqueIndex('uq_food_per_meal').on(
      table.userId,
      table.loggedDate,
      table.mealType,
    ),
  }),
);

// ============================================================
// CHAT SESSIONS & MESSAGES
// ============================================================
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  title: text('title'),
  summary: text('summary'),
  messageCount: integer('message_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// USER GOALS
// ============================================================
export const userGoals = pgTable('user_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  goalType: goalTypeEnum('goal_type').notNull(),
  title: text('title').notNull(),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }),
  unit: text('unit').notNull(),
  direction: text('direction').notNull().default('decrease'),
  status: goalStatusEnum('status').notNull().default('active'),
  aiSuggested: boolean('ai_suggested').notNull().default(false),
  achievedAt: timestamp('achieved_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
