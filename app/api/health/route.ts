import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/health — public, no auth
// Returns 200 if healthy, 503 if degraded
// Target: < 500ms response time
export async function GET() {
  const start = Date.now();

  const checks: Record<string, boolean> = {
    db: false,
    twilio: false,
    resend: false,
    anthropic: false,
    google_calendar: false,
  };

  // Helper: race a check against a 400ms timeout
  async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>(resolve => setTimeout(() => resolve(fallback), 400)),
    ]);
  }

  // Check Supabase connectivity
  const dbCheck = withTimeout(
    (async () => {
      const { error } = await supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).limit(1);
      return !error;
    })(),
    false
  );

  // Check env var presence for third-party services
  const twilioCheck = Promise.resolve(
    !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  );

  const resendCheck = Promise.resolve(!!process.env.RESEND_API_KEY);

  const anthropicCheck = Promise.resolve(!!process.env.ANTHROPIC_API_KEY);

  const gcalCheck = Promise.resolve(
    !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  );

  const [db, twilio, resend, anthropic, gcal] = await Promise.all([
    dbCheck, twilioCheck, resendCheck, anthropicCheck, gcalCheck,
  ]);

  checks.db = db;
  checks.twilio = twilio;
  checks.resend = resend;
  checks.anthropic = anthropic;
  checks.google_calendar = gcal;

  const allOk = Object.values(checks).every(Boolean);
  const status = allOk ? "ok" : "degraded";
  const httpStatus = checks.db ? 200 : 503; // DB down = service unavailable

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
      responseMs: Date.now() - start,
    },
    { status: httpStatus }
  );
}
