import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Admin client uses the service_role key — bypasses RLS.
// Only use server-side (API routes). Never expose to the browser.
//
// Singleton pattern: stored on globalThis so Next.js dev hot-reloads don't
// create a new GoTrue instance on every file change. In production (Vercel)
// the module is already cached between Lambda invocations.

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined;
}

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function makeAdminClient(): SupabaseClient {
  if (!url || !serviceKey) {
    return new Proxy({}, {
      get: () => () => ({
        data:  null,
        error: new Error("Supabase admin not configured"),
      }),
    }) as unknown as SupabaseClient;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession:     false, // service role never needs a persisted session
      autoRefreshToken:   false, // no user token to refresh
      detectSessionInUrl: false,
    },
  });
}

export const supabaseAdmin: SupabaseClient =
  globalThis._supabaseAdmin ??
  (globalThis._supabaseAdmin = makeAdminClient());
