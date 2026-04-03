import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendRebookingNudge } from "@/lib/whatsapp";

// GET /api/cron/crm-nudges
// Runs daily at 10am. Two passes: pattern-based + lapsed nudges.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let patternSent = 0;
  let lapsedSent = 0;
  const errors: string[] = [];

  // ── Pass 1: Pattern-based nudge ──────────────────────────────────────────
  // Customers whose predicted_next_visit_at has passed (within last 7 days),
  // haven't been nudged recently, and are not lapsed.
  const { data: patternCustomers } = await supabaseAdmin
    .from("customer_profiles")
    .select("id, business_id, phone, name, predicted_next_visit_at, last_visit_at, nudge_count, nudge_sent_at")
    .lt("predicted_next_visit_at", new Date().toISOString())
    .gt("predicted_next_visit_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq("whatsapp_opt_in", true)
    .eq("is_lapsed", false)
    .lt("nudge_count", 3)
    .or(`nudge_sent_at.is.null,nudge_sent_at.lt.${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()}`);

  if (patternCustomers && patternCustomers.length > 0) {
    for (const cp of patternCustomers) {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, name, booking_slug")
        .eq("id", cp.business_id)
        .single();

      if (!biz) continue;

      const lastVisit = cp.last_visit_at ? new Date(cp.last_visit_at as string) : null;
      const weeksSince = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0;

      try {
        const result = await sendRebookingNudge(
          { phone: cp.phone, name: cp.name as string | null },
          { id: biz.id, name: biz.name, booking_slug: biz.booking_slug },
          "pattern",
          weeksSince
        );

        // Log to crm_nudges
        await supabaseAdmin.from("crm_nudges").insert({
          business_id: cp.business_id,
          customer_phone: cp.phone,
          nudge_type: "pattern",
          message_sid: result.messageSid ?? null,
          weeks_since_last_visit: weeksSince,
        });

        // Update customer profile
        await supabaseAdmin.from("customer_profiles").update({
          nudge_sent_at: new Date().toISOString(),
          nudge_count: ((cp.nudge_count as number) ?? 0) + 1,
        }).eq("id", cp.id);

        patternSent++;
      } catch (e) {
        errors.push(`pattern:${cp.phone}:${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Pass 2: Lapsed nudge (single-visit customers only) ──────────────────
  // Customers who are lapsed, have no avg_days_between_visits (single visit),
  // and have never been nudged.
  const { data: lapsedCustomers } = await supabaseAdmin
    .from("customer_profiles")
    .select("id, business_id, phone, name, last_visit_at")
    .eq("is_lapsed", true)
    .is("avg_days_between_visits", null)
    .is("nudge_sent_at", null)
    .eq("whatsapp_opt_in", true);

  if (lapsedCustomers && lapsedCustomers.length > 0) {
    for (const cp of lapsedCustomers) {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, name, booking_slug")
        .eq("id", cp.business_id)
        .single();

      if (!biz) continue;

      const lastVisit = cp.last_visit_at ? new Date(cp.last_visit_at as string) : null;
      const weeksSince = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0;

      try {
        const result = await sendRebookingNudge(
          { phone: cp.phone, name: cp.name as string | null },
          { id: biz.id, name: biz.name, booking_slug: biz.booking_slug },
          "lapsed",
          weeksSince
        );

        // Log to crm_nudges
        await supabaseAdmin.from("crm_nudges").insert({
          business_id: cp.business_id,
          customer_phone: cp.phone,
          nudge_type: "lapsed",
          message_sid: result.messageSid ?? null,
          weeks_since_last_visit: weeksSince,
        });

        // Update customer profile
        await supabaseAdmin.from("customer_profiles").update({
          nudge_sent_at: new Date().toISOString(),
        }).eq("id", cp.id);

        lapsedSent++;
      } catch (e) {
        errors.push(`lapsed:${cp.phone}:${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log(`[cron/crm-nudges] pattern=${patternSent} lapsed=${lapsedSent} errors=${errors.length}`);
  return NextResponse.json({
    patternSent,
    lapsedSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
