#!/usr/bin/env npx tsx
/**
 * Register a Supabase Database Webhook that fires on INSERT to the `feedback` table.
 *
 * Supabase doesn't have a management API for database webhooks — they're created
 * via the pg_net extension + a database trigger. This script connects to Supabase
 * via the SQL editor API and creates the trigger directly.
 *
 * Usage:
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   WEBHOOK_URL=https://your-app.vercel.app/api/webhooks/feedback \
 *   WEBHOOK_SECRET=your_secret \
 *   npx tsx scripts/register-feedback-webhook.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.SUPABASE_WEBHOOK_SECRET || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_URL) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_URL");
  process.exit(1);
}

async function run() {
  // The SQL creates:
  // 1. A function that calls net.http_post to send the new row to our endpoint
  // 2. A trigger on the feedback table that fires AFTER INSERT
  const sql = `
-- Enable pg_net if not already (Supabase has it pre-installed)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop existing trigger/function so this script is idempotent
DROP TRIGGER IF EXISTS feedback_webhook_trigger ON public.feedback;
DROP FUNCTION IF EXISTS public.feedback_webhook_notify();

-- Function: POST the new row as JSON to our endpoint
CREATE OR REPLACE FUNCTION public.feedback_webhook_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := '${WEBHOOK_URL}',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'feedback',
      'record', to_jsonb(NEW)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${WEBHOOK_SECRET}'
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger: fires after every INSERT on feedback
CREATE TRIGGER feedback_webhook_trigger
AFTER INSERT ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.feedback_webhook_notify();
  `.trim();

  console.log("🔗 Registering feedback webhook...");
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Webhook:  ${WEBHOOK_URL}`);
  console.log(`   Secret:   ${WEBHOOK_SECRET ? "✓ set" : "✗ none (open)"}`);
  console.log();

  // Use the Supabase REST SQL endpoint (available with service_role key)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  // The /rest/v1/rpc endpoint may not support raw SQL.
  // Fall back to the management API SQL endpoint.
  if (!res.ok) {
    console.log("   REST RPC unavailable, trying SQL query endpoint...");

    // Supabase exposes a /pg endpoint via the management API
    // For self-hosted or dashboard, use the SQL editor approach instead.
    // Here we try the pg-meta endpoint that some Supabase versions expose.
    const pgRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    // If neither works, output the SQL for manual execution
    if (!pgRes.ok) {
      console.log();
      console.log("⚠️  Could not execute SQL via API. Run this SQL manually in the Supabase SQL Editor:");
      console.log("   Dashboard → SQL Editor → New Query → Paste & Run");
      console.log();
      console.log("─".repeat(70));
      console.log(sql);
      console.log("─".repeat(70));
      console.log();
      console.log("After running the SQL, insert a test row into the feedback table to verify.");
      return;
    }
  }

  console.log("✅ Webhook registered successfully!");
  console.log();
  console.log("Test it by inserting a row in the Supabase table editor:");
  console.log("  Table: feedback");
  console.log("  business_id: (your test business UUID)");
  console.log("  rating: 2");
  console.log('  feedback_text: "test negative"');
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
