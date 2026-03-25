-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL,
  business_id     text,
  visitor_name    text,
  visitor_email   text,
  messages        jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs_human','resolved')),
  source          text NOT NULL DEFAULT 'landing_page' CHECK (source IN ('landing_page','dashboard')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     text
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_conversations_session_id_idx ON chat_conversations (session_id);
CREATE INDEX IF NOT EXISTS chat_conversations_status_idx ON chat_conversations (status);
CREATE INDEX IF NOT EXISTS chat_conversations_source_idx ON chat_conversations (source);
CREATE INDEX IF NOT EXISTS chat_conversations_business_id_idx ON chat_conversations (business_id);
CREATE INDEX IF NOT EXISTS chat_conversations_created_at_idx ON chat_conversations (created_at DESC);

-- RLS (allow full anon access for now — lock down per-business later)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON chat_conversations FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
