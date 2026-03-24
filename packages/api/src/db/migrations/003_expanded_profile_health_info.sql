-- Migration 003: Expanded profile, health info, meal/exercise times, chat topics
-- Run this in Supabase SQL Editor

-- 1. Expand gender enum (add non_binary, prefer_not_to_say)
ALTER TYPE gender ADD VALUE IF NOT EXISTS 'non_binary';
ALTER TYPE gender ADD VALUE IF NOT EXISTS 'prefer_not_to_say';

-- 2. Blood type enum
DO $$ BEGIN
  CREATE TYPE blood_type_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add blood_type to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blood_type blood_type_enum;

-- 4. Expand meal_type enum
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'morning_snack';
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'afternoon_snack';
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'supper';
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'pre_workout';
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'post_workout';
ALTER TYPE meal_type ADD VALUE IF NOT EXISTS 'other';

-- 5. Add logged_at to food_logs
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS logged_at TIME;

-- 6. Add started_at and session_label to exercise_logs
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS started_at TIME;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS session_label TEXT;

CREATE INDEX IF NOT EXISTS idx_exercise_user_time
  ON exercise_logs (user_id, logged_date, started_at);

-- 7. Message topic enum
DO $$ BEGIN
  CREATE TYPE message_topic AS ENUM ('nutrition', 'exercise', 'sleep', 'wellness', 'goals', 'general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Add topic to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS topic message_topic DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_messages_topic
  ON chat_messages (user_id, topic, created_at DESC);

-- 9. User health info table
CREATE TABLE IF NOT EXISTS user_health_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  intolerances TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  medications JSONB DEFAULT '[]'::jsonb,
  supplements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_health_info_user UNIQUE (user_id)
);

-- RLS for user_health_info
ALTER TABLE user_health_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health info"
  ON user_health_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health info"
  ON user_health_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health info"
  ON user_health_info FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health info"
  ON user_health_info FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for user_health_info
CREATE TRIGGER set_user_health_info_updated_at
  BEFORE UPDATE ON user_health_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
