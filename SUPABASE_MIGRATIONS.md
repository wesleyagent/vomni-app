# Supabase Migrations Required

Run these in the Supabase SQL editor:

```sql
-- GDPR onboarding columns
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_gdpr_accepted boolean default false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_gdpr_accepted_at timestamp;

-- Data minimisation cleanup log
CREATE TABLE IF NOT EXISTS cleanup_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamp DEFAULT now(),
  bookings_cleaned integer,
  feedback_cleaned integer,
  leads_expired integer
);
```

## Memory System Tables (March 2026)

Run these in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS agent_memory_episodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  episode_type text NOT NULL,
  summary text NOT NULL,
  outcome text,
  lesson text,
  entities jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_memory_facts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text,
  category text NOT NULL,
  fact text NOT NULL,
  confidence integer DEFAULT 50,
  evidence_count integer DEFAULT 1,
  last_confirmed_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_memory_procedures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  procedure_name text NOT NULL,
  current_best_version text NOT NULL,
  previous_versions jsonb,
  performance_score integer DEFAULT 50,
  last_updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_memory_strategic (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  insight text NOT NULL,
  data_points integer DEFAULT 1,
  confidence integer DEFAULT 50,
  action_taken text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_performance_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  notes text,
  created_at timestamp DEFAULT now()
);
```

## Plan Feature Gating (March 2026)

```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan text DEFAULT 'growth';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_sent_this_month integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_limit integer DEFAULT null;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_limit_reset_at timestamp DEFAULT now();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_number text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS max_locations integer DEFAULT 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_business_id uuid;
```
