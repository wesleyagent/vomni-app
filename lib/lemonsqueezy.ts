/**
 * Lemon Squeezy integration helpers.
 * Server-side only — never import this in client components.
 */
import {
  lemonSqueezySetup,
  createCheckout,
  listStores,
} from "@lemonsqueezy/lemonsqueezy.js";

// ── Setup ────────────────────────────────────────────────────────────────────

export function setupLS() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
    onError: (err) => console.error("[LemonSqueezy]", err),
  });
}

// ── Variant → plan mapping ────────────────────────────────────────────────────

export const VARIANT_PLAN_MAP: Record<number, { plan: string; period: string }> = {
  1460262: { plan: "starter", period: "monthly" },
  1460268: { plan: "starter", period: "yearly"  },
  1460272: { plan: "growth",  period: "monthly" },
  1460276: { plan: "growth",  period: "yearly"  },
  1460277: { plan: "pro",     period: "monthly" },
  1460278: { plan: "pro",     period: "yearly"  },
};

export const VALID_VARIANT_IDS = new Set(Object.keys(VARIANT_PLAN_MAP).map(Number));

// ── Store ID (cached) ─────────────────────────────────────────────────────────

let _storeId: string | null = null;

async function getStoreId(): Promise<string> {
  if (_storeId) return _storeId;
  setupLS();
  const { data, error } = await listStores();
  if (error || !data?.data?.length) {
    throw new Error(`Could not fetch Lemon Squeezy store: ${error?.message ?? "no stores found"}`);
  }
  _storeId = String(data.data[0].id);
  return _storeId;
}

// ── Checkout URL creation ─────────────────────────────────────────────────────

export async function createLSCheckoutUrl(opts: {
  variantId: number;
  email?: string;
  businessId?: string;
  name?: string;
  redirectUrl?: string;
}): Promise<string> {
  setupLS();
  const storeId = await getStoreId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni-app.vercel.app";
  const redirect = opts.redirectUrl ?? `${appUrl}/dashboard`;

  const { data, error } = await createCheckout(storeId, String(opts.variantId), {
    checkoutData: {
      email: opts.email ?? undefined,
      name: opts.name ?? undefined,
      custom: {
        business_id: opts.businessId ?? "",
      },
    },
    productOptions: {
      redirectUrl: redirect,
      enabledVariants: [opts.variantId],
    },
    checkoutOptions: {
      embed: false,
    },
  });

  if (error) throw new Error(error.message ?? "Failed to create checkout session");

  const url = (data as { data?: { attributes?: { url?: string } } })?.data?.attributes?.url;
  if (!url) throw new Error("Lemon Squeezy returned no checkout URL");

  return url;
}
