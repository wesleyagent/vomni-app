import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Admin client uses the service_role key — bypasses RLS.
// Only use server-side (API routes). Never expose to the browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin: SupabaseClient =
  url && serviceKey
    ? createClient(url, serviceKey)
    : (new Proxy(
        {},
        {
          get: () => () => ({
            data: null,
            error: new Error("Supabase admin not configured"),
          }),
        }
      ) as unknown as SupabaseClient);
