import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side user auth guard for dashboard API routes.
 * Verifies the Supabase Bearer token from the Authorization header.
 * Returns { userId, email } on success, or a 401 NextResponse on failure.
 * Exports: requireAuth, requireBusinessOwnership
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id, email: user.email };
}

/**
 * Verify that the authenticated user owns the given business_id.
 * Returns the business row if valid, or a 403 NextResponse.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireBusinessOwnership(
  email: string,
  businessId: string,
  adminClient: SupabaseClient<any, any, any>
): Promise<{ id: string } | NextResponse> {
  const { data: business } = await adminClient
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_email", email)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return business;
}
