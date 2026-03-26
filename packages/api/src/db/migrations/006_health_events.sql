-- Migration 006: Health events (temporary medications, symptoms, pain)
-- Tracks occasional medications, pain, symptoms reported in chat
-- AI uses active events to adapt recommendations and detect recurrence

CREATE TABLE health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- 'medication' | 'symptom' | 'pain' | 'condition'
  description TEXT NOT NULL,         -- "Ibuprofeno 600mg" or "Dor nas costas"
  details JSONB DEFAULT '{}',        -- {dosage, frequency, duration_days, reason}
  body_area TEXT,                    -- "costas", "cabeca", "joelho"
  severity TEXT,                     -- "leve" | "moderado" | "intenso"
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,                   -- when event "expires" (e.g. medication course ends)
  is_active BOOLEAN NOT NULL DEFAULT true,
  recurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurrence DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_events_user_active ON health_events(user_id, is_active);
CREATE INDEX idx_health_events_user_type ON health_events(user_id, event_type);

ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own health events"
  ON health_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE health_events IS 'Temporary health events (medications, symptoms, pain) extracted from chat';
