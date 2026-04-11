import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Server-side user auth guard for dashboard API routes.
 * Verifies the Supabase Bearer token from the Authorization header.
 * Returns { userId, email } on success, or a 401 NextResponse on failure.
 *
 * Uses supabaseAdmin.auth.getUser(token) rather than creating a new client
 * per request — avoids spinning up a fresh GoTrue instance on every API call.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id, email: user.email };
}

/** Plan hierarchy — higher index = more features */
const PLAN_RANK: Record<string, number> = {
  trial:         1,
  starter:       2,
  growth:        3,
  pro:           4,
  trial_expired: 0,
};

/**
 * Require that the business's plan is at least `minPlan`.
 * Fetches the plan from businesses.plan. Returns the business row or a 403.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requirePlan(
  businessId: string,
  minPlan: "starter" | "growth" | "pro",
  adminClient: SupabaseClient<any, any, any>
): Promise<{ id: string; plan: string } | NextResponse> {
  const { data: business } = await adminClient
    .from("businesses")
    .select("id, plan")
    .eq("id", businessId)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const plan = (business as { id: string; plan?: string | null }).plan ?? "trial";
  const rank    = PLAN_RANK[plan]  ?? 0;
  const minRank = PLAN_RANK[minPlan] ?? 1;

  if (rank < minRank) {
    return NextResponse.json(
      { error: "Upgrade required", required_plan: minPlan, current_plan: plan },
      { status: 403 }
    );
  }

  return business as { id: string; plan: string };
}

/**
 * Require that the business owned by `email` is at least `minPlan`.
 * Returns null on success, or a 403 NextResponse.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requirePlanByEmail(
  email: string,
  minPlan: "starter" | "growth" | "pro",
  adminClient: SupabaseClient<any, any, any>
): Promise<NextResponse | null> {
  const { data: business } = await adminClient
    .from("businesses")
    .select("plan")
    .eq("owner_email", email)
    .single();

  const plan    = (business as { plan?: string | null } | null)?.plan ?? "trial";
  const rank    = PLAN_RANK[plan]    ?? 0;
  const minRank = PLAN_RANK[minPlan] ?? 1;

  if (rank < minRank) {
    return NextResponse.json(
      { error: "Upgrade required", required_plan: minPlan, current_plan: plan },
      { status: 403 }
    );
  }
  return null;
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
