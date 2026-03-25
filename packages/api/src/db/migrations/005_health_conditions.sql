-- Migration 005: Add health_conditions to user_health_info
-- Allows users to register chronic conditions (hypertension, diabetes, etc.)
-- so the AI can provide safer, more personalized recommendations.

ALTER TABLE user_health_info
ADD COLUMN health_conditions jsonb DEFAULT '[]'::jsonb;

-- RLS already covers user_health_info from migration 004
COMMENT ON COLUMN user_health_info.health_conditions IS 'Array of {name, severity, diagnosedYear, notes} for chronic health conditions';
