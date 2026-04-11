import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTelegramAlert } from "@/lib/telegram";

// POST /api/internal/system-warn
// Called fire-and-forget from middleware when a detectable config issue occurs.
// Rate-limited to one DB insert + Telegram alert per event name per hour.
// Auth: Authorization: Bearer $CRON_SECRET

const RATE_LIMIT_MINUTES = 60;

export async function POST(req: NextRequest) {
  // Auth — reuse CRON_SECRET to avoid a new env var
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name: string; detail: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, detail, path } = body;
  if (!name || !detail) {
    return NextResponse.json({ error: "name and detail required" }, { status: 400 });
  }

  // ── Rate-limit check: skip if same warning was logged within the window ──
  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("system_alerts")
    .select("id")
    .eq("type", "warning")
    .eq("name", name)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    // Already logged recently — skip silently
    return NextResponse.json({ skipped: true });
  }

  // ── Log to DB ──────────────────────────────────────────────────────────────
  await supabaseAdmin.from("system_alerts").insert({
    type: "warning",
    name,
    status: "failure",
    detail,
    path: path ?? null,
  });

  // ── Telegram alert ─────────────────────────────────────────────────────────
  await sendTelegramAlert(
    `⚠️ <b>Warning — ${name}</b>\n` +
    `<b>Detail:</b> ${detail}\n` +
    (path ? `<b>Path:</b> ${path}\n` : "") +
    `<b>Time:</b> ${new Date().toISOString()}`
  );

  return NextResponse.json({ logged: true });
}
