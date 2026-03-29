import { NextRequest, NextResponse } from "next/server";
import { createLSCheckoutUrl, VALID_VARIANT_IDS, VARIANT_PLAN_MAP } from "@/lib/lemonsqueezy";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/lemonsqueezy/checkout
// Body: { variantId, email?, businessId?, isUpgrade? }
// Returns: { url }
//
// New-user flow:  redirects to /signup?payment=success&plan=X&period=Y
// Upgrade flow:   redirects to /dashboard  (when isUpgrade=true or businessId present)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { variantId, email, businessId, isUpgrade } = body as {
    variantId?: number;
    email?: string;
    businessId?: string;
    isUpgrade?: boolean;
  };

  if (!variantId || !VALID_VARIANT_IDS.has(Number(variantId))) {
    return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });
  }

  const vid      = Number(variantId);
  const planInfo = VARIANT_PLAN_MAP[vid];
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni-app.vercel.app";

  // Resolve businessId for existing users upgrading
  let resolvedBusinessId = businessId ?? "";
  if (!resolvedBusinessId && email) {
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("owner_email", email)
      .maybeSingle();
    resolvedBusinessId = biz?.id ?? "";
  }

  // New-user flow: redirect back to /signup with payment proof + plan in URL
  // Upgrade flow (existing user or isUpgrade flag): redirect to /dashboard
  const isExistingUser = !!resolvedBusinessId || isUpgrade;
  const redirectUrl = isExistingUser
    ? `${appUrl}/dashboard`
    : `${appUrl}/signup?payment=success&plan=${planInfo?.plan ?? "starter"}&period=${planInfo?.period ?? "monthly"}`;

  try {
    const url = await createLSCheckoutUrl({
      variantId: vid,
      email,
      businessId: resolvedBusinessId,
      redirectUrl,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[ls-checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
