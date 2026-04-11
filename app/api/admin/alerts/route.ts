import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type");   // "cron" | "sentry" | null (all)
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  let query = supabaseAdmin
    .from("system_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type === "cron" || type === "sentry") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute summary stats
  const all = data ?? [];
  const cronAlerts    = all.filter(a => a.type === "cron");
  const sentryAlerts  = all.filter(a => a.type === "sentry");
  const warnAlerts    = all.filter(a => a.type === "warning");
  const cronFailed    = cronAlerts.filter(a => a.status === "failure").length;
  const cronSuccess   = cronAlerts.filter(a => a.status === "success").length;

  // Last run per cron job
  const lastRuns: Record<string, { status: string; created_at: string; duration_ms: number | null }> = {};
  for (const a of cronAlerts) {
    if (!lastRuns[a.name]) {
      lastRuns[a.name] = { status: a.status, created_at: a.created_at, duration_ms: a.duration_ms };
    }
  }

  return NextResponse.json({
    alerts: all,
    stats: {
      cronTotal: cronAlerts.length,
      cronSuccess,
      cronFailed,
      sentryTotal: sentryAlerts.length,
      warningTotal: warnAlerts.length,
      lastRuns,
    },
  });
}
