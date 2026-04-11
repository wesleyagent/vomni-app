import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

// ── Twilio / WhatsApp pricing (USD) ───────────────────────────────────────────
// SMS rates vary by destination country.
const SMS_COST_IL_USD   = 0.2575; // Israel (+972) — Twilio IL route
const SMS_COST_UK_USD   = 0.0079; // UK (+44) — Twilio UK route
const SMS_COST_DEFAULT  = 0.0079; // Fallback for any other destination

// WhatsApp Business API (Meta) — rate differs by message category.
// Marketing = review requests, re-engagement nudges.
// Utility   = booking confirmations, reminders, no-show follow-ups.
const WA_MARKETING_COST_USD = 0.025;
const WA_UTILITY_COST_USD   = 0.005;

// Templates classified as marketing (everything else treated as utility)
const WA_MARKETING_TEMPLATES = new Set([
  "review_request",
  "rebooking_nudge",
  "nudge_pattern",
  "nudge_lapsed",
]);

function smsCostForCurrency(currency: string | null | undefined): number {
  if (currency === "ILS") return SMS_COST_IL_USD;
  if (currency === "GBP") return SMS_COST_UK_USD;
  return SMS_COST_DEFAULT;
}

function waCostForTemplate(templateName: string | null | undefined): number {
  return WA_MARKETING_TEMPLATES.has(templateName ?? "") ? WA_MARKETING_COST_USD : WA_UTILITY_COST_USD;
}

export async function GET(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [{ data: smsRows }, { data: waRows }, { data: businesses }] = await Promise.all([
    supabaseAdmin
      .from("sms_log")
      .select("business_id, status, message_type, sent_at")
      .gte("sent_at", since),
    supabaseAdmin
      .from("whatsapp_log")
      .select("business_id, status, template_name, sent_at")
      .gte("sent_at", since),
    supabaseAdmin
      .from("businesses")
      .select("id, name, booking_currency"),
  ]);

  // Maps for fast lookup
  const bizNameMap: Record<string, string> = {};
  const bizCurrencyMap: Record<string, string> = {};
  for (const b of businesses ?? []) {
    bizNameMap[b.id] = b.name ?? b.id;
    bizCurrencyMap[b.id] = (b as typeof b & { booking_currency?: string }).booking_currency ?? "";
  }

  // ── Per-business aggregation ───────────────────────────────────────────────
  const perBiz: Record<string, {
    name: string;
    currency: string;
    smsSent: number;
    smsFailed: number;
    waSent: number;
    waFailed: number;
    smsMarketingCost: number;   // estimated USD
    waMarketingCost: number;
    waUtilityCost: number;
  }> = {};

  const ensure = (id: string | null) => {
    const key = id ?? "__unknown__";
    if (!perBiz[key]) {
      const currency = id ? (bizCurrencyMap[id] ?? "") : "";
      perBiz[key] = {
        name: id ? (bizNameMap[id] ?? id.slice(0, 8)) : "(no business)",
        currency,
        smsSent: 0, smsFailed: 0, waSent: 0, waFailed: 0,
        smsMarketingCost: 0, waMarketingCost: 0, waUtilityCost: 0,
      };
    }
    return perBiz[key];
  };

  for (const r of smsRows ?? []) {
    const b = ensure(r.business_id);
    if (r.status === "sent") {
      b.smsSent++;
      b.smsMarketingCost += smsCostForCurrency(bizCurrencyMap[r.business_id ?? ""] ?? null);
    }
    if (r.status === "failed") b.smsFailed++;
  }
  for (const r of waRows ?? []) {
    const b = ensure(r.business_id);
    if (r.status === "sent") {
      b.waSent++;
      const waCost = waCostForTemplate(r.template_name);
      if (WA_MARKETING_TEMPLATES.has(r.template_name ?? "")) {
        b.waMarketingCost += waCost;
      } else {
        b.waUtilityCost += waCost;
      }
    }
    if (r.status === "failed") b.waFailed++;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalSmsSent   = (smsRows ?? []).filter(r => r.status === "sent").length;
  const totalSmsFail   = (smsRows ?? []).filter(r => r.status === "failed").length;
  const totalWaSent    = (waRows  ?? []).filter(r => r.status === "sent").length;
  const totalWaFail    = (waRows  ?? []).filter(r => r.status === "failed").length;

  // Cost totals using per-destination rates
  const totalSmsCostUsd = (smsRows ?? [])
    .filter(r => r.status === "sent")
    .reduce((sum, r) => sum + smsCostForCurrency(bizCurrencyMap[r.business_id ?? ""] ?? null), 0);
  const totalWaCostUsd  = (waRows ?? [])
    .filter(r => r.status === "sent")
    .reduce((sum, r) => sum + waCostForTemplate(r.template_name), 0);

  // ── Breakdown by SMS type and WA template ─────────────────────────────────
  const smsTypes: Record<string, number> = {};
  for (const r of smsRows ?? []) {
    if (r.status === "sent") smsTypes[r.message_type ?? "sms"] = (smsTypes[r.message_type ?? "sms"] ?? 0) + 1;
  }
  const waTypes: Record<string, number> = {};
  for (const r of waRows ?? []) {
    if (r.status === "sent") waTypes[r.template_name ?? "unknown"] = (waTypes[r.template_name ?? "unknown"] ?? 0) + 1;
  }

  return NextResponse.json({
    days,
    rates: {
      smsIsraelUsd:      SMS_COST_IL_USD,
      smsUkUsd:          SMS_COST_UK_USD,
      waMarketingUsd:    WA_MARKETING_COST_USD,
      waUtilityUsd:      WA_UTILITY_COST_USD,
    },
    totals: {
      smsSent: totalSmsSent, smsFailed: totalSmsFail,
      waSent: totalWaSent,   waFailed: totalWaFail,
      estimatedSmsCostUsd: Math.round(totalSmsCostUsd * 100) / 100,
      estimatedWaCostUsd:  Math.round(totalWaCostUsd  * 100) / 100,
      estimatedTotalCostUsd: Math.round((totalSmsCostUsd + totalWaCostUsd) * 100) / 100,
    },
    smsTypes,
    waTypes,
    perBusiness: Object.entries(perBiz)
      .map(([id, v]) => ({
        id,
        name:     v.name,
        currency: v.currency,
        smsSent:  v.smsSent,  smsFailed: v.smsFailed,
        waSent:   v.waSent,   waFailed:  v.waFailed,
        estimatedSmsCostUsd:  Math.round(v.smsMarketingCost * 100) / 100,
        estimatedWaCostUsd:   Math.round((v.waMarketingCost + v.waUtilityCost) * 100) / 100,
        estimatedTotalCostUsd: Math.round((v.smsMarketingCost + v.waMarketingCost + v.waUtilityCost) * 100) / 100,
        waBreakdown: { marketingCostUsd: Math.round(v.waMarketingCost * 100) / 100, utilityCostUsd: Math.round(v.waUtilityCost * 100) / 100 },
      }))
      .sort((a, b) => b.estimatedTotalCostUsd - a.estimatedTotalCostUsd),
  });
}
