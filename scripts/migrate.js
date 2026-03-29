#!/usr/bin/env node
/**
 * Run database migrations via Supabase service role key.
 * Usage: node scripts/migrate.js
 */

const https = require("https");

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieWV3b2Nwdm9wYXR1YWdxZmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ2MjEwNiwiZXhwIjoyMDkwMDM4MTA2fQ.fHN4xxduXuuSzPyxI9fCA4sQPY1LMXowIgOa5AlXVPI";
const PROJECT_REF = "obyewocpvopatuagqfkx";

// Use Supabase's pg-meta REST API for SQL execution
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
];

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  for (const sql of statements) {
    const label = sql.trim().slice(0, 60).replace(/\s+/g, " ");
    try {
      // Use pg-meta admin API
      const body = JSON.stringify({ query: sql });
      const res = await request(
        `https://${PROJECT_REF}.supabase.co/pg/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey": SERVICE_KEY,
          },
        },
        body
      );
      console.log(`[${res.status === 200 || res.status === 204 ? "OK" : "ERR"}] ${label}`);
      if (res.status !== 200 && res.status !== 204) {
        console.log("  Response:", JSON.stringify(res.body).slice(0, 200));
      }
    } catch (err) {
      console.log(`[ERR] ${label}: ${err.message}`);
    }
  }
  console.log("Migration complete.");
}

run();
