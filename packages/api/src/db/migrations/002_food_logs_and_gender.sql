-- Migration: Add food_logs table and gender to user_profiles
-- Run this in Supabase SQL Editor

-- 1. Gender enum and column
DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('male', 'female');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender gender;

-- 2. Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  description TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_calories INTEGER,
  ai_estimated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index: one entry per user per date per meal type
CREATE UNIQUE INDEX IF NOT EXISTS uq_food_per_meal
  ON food_logs (user_id, logged_date, meal_type);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
  ON food_logs (user_id, logged_date);

-- RLS
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food logs"
  ON food_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs"
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs"
  ON food_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs"
  ON food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER set_food_logs_updated_at
  BEFORE UPDATE ON food_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
