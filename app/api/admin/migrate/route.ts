import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !url) {
    return NextResponse.json({ error: "Missing env" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);

  const statements = [
    `CREATE TABLE IF NOT EXISTS milestones (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
      milestone_type text NOT NULL,
      achieved_at timestamp with time zone DEFAULT now(),
      seen boolean DEFAULT false
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
      type text NOT NULL,
      message text NOT NULL,
      link text,
      read boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS weekly_reports (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
      week_starting date NOT NULL,
      sent_at timestamp with time zone DEFAULT now(),
      data_json jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS referrals (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      referrer_business_id uuid REFERENCES businesses(id),
      referred_business_id uuid REFERENCES businesses(id),
      status text DEFAULT 'pending',
      created_at timestamp with time zone DEFAULT now(),
      credited_at timestamp with time zone
    )`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_insights_cache jsonb`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_insights_cached_at timestamp with time zone`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS referral_code text`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_review_count integer DEFAULT 0`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS starting_rating numeric(3,1)`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sentiment_topic text`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sentiment_intensity text`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sentiment_urgency text`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url text`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS initial_google_rating numeric(3,1)`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS current_google_rating numeric(3,1)`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS initial_review_count integer DEFAULT 0`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating_captured_at timestamp with time zone`,
    `CREATE TABLE IF NOT EXISTS rating_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  rating numeric(3,1) NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now()
)`,
  ];

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of statements) {
    try {
      const { error } = await admin.rpc("exec_sql", { sql }).single();
      results.push({ sql: sql.slice(0, 60), ok: !error, error: error?.message });
    } catch (err) {
      results.push({ sql: sql.slice(0, 60), ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
