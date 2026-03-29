import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Probes which columns actually exist in bookings and feedback tables.
// GET /api/debug/schema

const BOOKING_COLS = [
  "id", "business_id", "customer_name", "customer_phone",
  "review_status", "rating", "rating_submitted_at",
  "form_opened_at", "redirected_at", "reviewed_at",
  "sms_sent_at", "sms_status", "created_at",
];

const FEEDBACK_COLS = [
  "id", "booking_id", "business_id", "rating",
  "feedback_text", "status", "source",
  "ai_reply", "sentiment_topic", "created_at",
];

async function probeColumns(table: string, columns: string[]) {
  const results: Record<string, boolean> = {};
  for (const col of columns) {
    const { error } = await supabaseAdmin
      .from(table)
      .select(col)
      .limit(1);
    results[col] = !error;
    if (error) console.log(`[schema] ${table}.${col} MISSING: ${error.message}`);
  }
  return results;
}

export async function GET() {
  const [bookings, feedback] = await Promise.all([
    probeColumns("bookings", BOOKING_COLS),
    probeColumns("feedback", FEEDBACK_COLS),
  ]);

  const missing = {
    bookings: Object.entries(bookings).filter(([, ok]) => !ok).map(([c]) => c),
    feedback: Object.entries(feedback).filter(([, ok]) => !ok).map(([c]) => c),
  };

  const sql = [
    ...missing.bookings.map(col => {
      if (col === "rating") return `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating integer;`;
      if (col === "rating_submitted_at") return `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_submitted_at timestamp with time zone;`;
      if (col === "redirected_at") return `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS redirected_at timestamp with time zone;`;
      if (col === "reviewed_at") return `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;`;
      if (col === "form_opened_at") return `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS form_opened_at timestamp with time zone;`;
      return `-- bookings.${col} missing`;
    }),
    ...missing.feedback.map(col => {
      if (col === "status") return `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';`;
      if (col === "source") return `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source text;`;
      if (col === "booking_id") return `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;`;
      if (col === "ai_reply") return `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ai_reply text;`;
      if (col === "sentiment_topic") return `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sentiment_topic text;`;
      return `-- feedback.${col} missing`;
    }),
  ].filter(Boolean);

  return NextResponse.json({ bookings, feedback, missing, sql });
}
