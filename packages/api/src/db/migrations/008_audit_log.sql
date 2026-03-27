-- Migration 008: Audit log for profile and health data changes
-- Tracks who changed what and when for compliance and debugging

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,           -- 'update' | 'insert' | 'delete'
  table_name TEXT NOT NULL,       -- 'user_profiles' | 'user_health_info' | etc
  changed_fields JSONB DEFAULT '{}',  -- {field: {old: X, new: Y}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit log"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Trigger function to auto-log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, changed_fields)
  VALUES (
    NEW.id,
    TG_OP,
    TG_TABLE_NAME,
    jsonb_build_object(
      'display_name', CASE WHEN OLD.display_name IS DISTINCT FROM NEW.display_name THEN jsonb_build_object('old', OLD.display_name, 'new', NEW.display_name) ELSE NULL END,
      'objective', CASE WHEN OLD.objective IS DISTINCT FROM NEW.objective THEN jsonb_build_object('old', OLD.objective, 'new', NEW.objective) ELSE NULL END,
      'height_cm', CASE WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN jsonb_build_object('old', OLD.height_cm, 'new', NEW.height_cm) ELSE NULL END,
      'initial_weight', CASE WHEN OLD.initial_weight IS DISTINCT FROM NEW.initial_weight THEN jsonb_build_object('old', OLD.initial_weight, 'new', NEW.initial_weight) ELSE NULL END
    ) - ARRAY(SELECT key FROM jsonb_each(jsonb_build_object(
      'display_name', CASE WHEN OLD.display_name IS DISTINCT FROM NEW.display_name THEN 1 ELSE NULL END,
      'objective', CASE WHEN OLD.objective IS DISTINCT FROM NEW.objective THEN 1 ELSE NULL END,
      'height_cm', CASE WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN 1 ELSE NULL END,
      'initial_weight', CASE WHEN OLD.initial_weight IS DISTINCT FROM NEW.initial_weight THEN 1 ELSE NULL END
    )) WHERE value IS NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_audit ON user_profiles;
CREATE TRIGGER trg_profile_audit
  AFTER UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_changes();

COMMENT ON TABLE audit_log IS 'Tracks changes to user profile and health data for compliance';
