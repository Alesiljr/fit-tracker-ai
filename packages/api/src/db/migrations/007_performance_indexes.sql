-- Migration 007: Performance indexes for frequently queried tables
-- All log tables are queried by user_id + logged_date, adding user_id indexes

CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_user ON water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_step_logs_user ON step_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_user ON food_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boundaries_user ON user_boundaries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);
