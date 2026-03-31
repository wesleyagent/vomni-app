import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/debug/calendar — shows what URL this server sees + DB connectivity
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "NOT SET";
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  // Test DB write
  let dbWriteOk = false;
  let dbError = "";
  try {
    const { error } = await supabaseAdmin
      .from("calendar_connections")
      .delete()
      .eq("business_id", "00000000-0000-0000-0000-000000000000")
      .eq("provider", "debug");
    dbWriteOk = !error;
    if (error) dbError = error.message;
  } catch (e: unknown) {
    dbError = String(e);
  }

  // Count existing rows
  const { data: rows } = await supabaseAdmin
    .from("calendar_connections")
    .select("id, business_id, provider, is_active, created_at");

  return NextResponse.json({
    request_origin: origin,
    next_public_app_url: appUrl,
    redirect_uri_would_be: `${origin}/api/auth/callback/google-calendar`,
    google_client_id_set: hasClientId,
    google_client_secret_set: hasClientSecret,
    db_write_ok: dbWriteOk,
    db_error: dbError,
    calendar_connections_rows: rows?.length ?? 0,
    rows: rows ?? [],
  });
}
