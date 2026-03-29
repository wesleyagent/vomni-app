import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { VARIANT_PLAN_MAP } from "@/lib/lemonsqueezy";

// POST /api/webhooks/lemonsqueezy
// Handles: order_created, subscription_created, subscription_updated, subscription_cancelled

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 100,
  growth: 300,
  pro: null,
};

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return false;
  try {
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function findBusinessByEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_email", email)
    .maybeSingle();
  return data?.id ?? null;
}

async function findBusinessBySubscriptionId(lsSubId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("lemon_subscription_id", lsSubId)
    .maybeSingle();
  return data?.id ?? null;
}

async function applyPlanToBusinesses(
  businessId: string,
  opts: {
    plan: string;
    period: string;
    status: string;
    lemonCustomerId?: string;
    lemonSubscriptionId?: string;
  }
) {
  const patch: Record<string, unknown> = {
    plan:                opts.plan,
    subscription_status: opts.status,
    subscription_period: opts.period,
    billing_anchor_day:  new Date().getDate(),
  };
  if (opts.lemonCustomerId)    patch.lemon_customer_id    = opts.lemonCustomerId;
  if (opts.lemonSubscriptionId) patch.lemon_subscription_id = opts.lemonSubscriptionId;

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(patch)
    .eq("id", businessId);

  if (error) console.error("[ls-webhook] DB update error:", error.message);
  else console.log(`[ls-webhook] business ${businessId} → plan=${opts.plan} status=${opts.status}`);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.error("[ls-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meta   = payload.meta   as Record<string, unknown> | undefined;
  const data   = payload.data   as Record<string, unknown> | undefined;
  const attrs  = data?.attributes as Record<string, unknown> | undefined;
  const event  = meta?.event_name as string | undefined;
  const custom = meta?.custom_data as { business_id?: string } | undefined;

  console.log("[ls-webhook] event:", event);

  // ── order_created ──────────────────────────────────────────────────────────
  if (event === "order_created") {
    const email     = attrs?.user_email as string | undefined;
    const firstItem = (attrs?.first_order_item as { variant_id?: number }) ?? {};
    const variantId = Number(firstItem.variant_id ?? 0);
    const planInfo  = VARIANT_PLAN_MAP[variantId];

    if (planInfo && (custom?.business_id || email)) {
      const bizId = custom?.business_id || (email ? await findBusinessByEmail(email) : null);
      if (bizId) {
        await applyPlanToBusinesses(bizId, {
          plan: planInfo.plan, period: planInfo.period, status: "active",
        });
      }
    }
  }

  // ── subscription_created ──────────────────────────────────────────────────
  else if (event === "subscription_created") {
    const email      = attrs?.user_email as string | undefined;
    const variantId  = Number(attrs?.variant_id ?? 0);
    const lsSubId    = String(data?.id ?? "");
    const lsCustId   = String(attrs?.customer_id ?? "");
    const status     = (attrs?.status as string) ?? "active";
    const planInfo   = VARIANT_PLAN_MAP[variantId];

    if (planInfo) {
      const bizId = custom?.business_id || (email ? await findBusinessByEmail(email) : null);

      if (bizId) {
        // Existing user upgrading — apply plan immediately
        await applyPlanToBusinesses(bizId, {
          plan: planInfo.plan, period: planInfo.period, status,
          lemonCustomerId: lsCustId, lemonSubscriptionId: lsSubId,
        });
      } else {
        // New user — hasn't created their account yet.
        // Store in pending_subscriptions so we can link it once they sign up.
        console.log("[ls-webhook] new user subscription — storing as pending for email:", email);
        const { error: pendingErr } = await supabaseAdmin
          .from("pending_subscriptions")
          .upsert({
            email:                  email ?? "",
            plan:                   planInfo.plan,
            period:                 planInfo.period,
            lemon_subscription_id:  lsSubId,
            lemon_customer_id:      lsCustId,
            subscription_status:    status,
            created_at:             new Date().toISOString(),
          }, { onConflict: "email" });

        if (pendingErr) {
          // Table may not exist yet — log but don't fail the webhook
          console.error("[ls-webhook] pending_subscriptions upsert error:", pendingErr.message);
        }
      }
    }
  }

  // ── subscription_updated ─────────────────────────────────────────────────
  else if (event === "subscription_updated") {
    const lsSubId   = String(data?.id ?? "");
    const variantId = Number(attrs?.variant_id ?? 0);
    const status    = (attrs?.status as string) ?? "active";
    const planInfo  = VARIANT_PLAN_MAP[variantId];

    const bizId = await findBusinessBySubscriptionId(lsSubId);
    if (bizId && planInfo) {
      await applyPlanToBusinesses(bizId, {
        plan: planInfo.plan, period: planInfo.period, status,
        lemonSubscriptionId: lsSubId,
      });
    }
  }

  // ── subscription_cancelled ────────────────────────────────────────────────
  else if (event === "subscription_cancelled") {
    const lsSubId = String(data?.id ?? "");
    const bizId   = await findBusinessBySubscriptionId(lsSubId);
    if (bizId) {
      await supabaseAdmin
        .from("businesses")
        .update({ subscription_status: "cancelled" })
        .eq("id", bizId);
      console.log("[ls-webhook] subscription cancelled for business:", bizId);
    }
  }

  else {
    console.log("[ls-webhook] unhandled event:", event);
  }

  return NextResponse.json({ ok: true });
}
