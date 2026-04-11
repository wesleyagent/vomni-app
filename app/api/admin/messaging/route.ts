import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

// Twilio pricing (USD) — approximate
const SMS_COST_USD        = 0.0079;
const WHATSAPP_COST_USD   = 0.005;

export async function GET(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // ── SMS stats ─────────────────────────────────────────────────────────────
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
      .select("id, name"),
  ]);

  const bizMap: Record<string, string> = {};
  for (const b of businesses ?? []) bizMap[b.id] = b.name ?? b.id;

  // ── Per-business aggregation ───────────────────────────────────────────────
  const perBiz: Record<string, {
    name: string;
    smsSent: number;
    smsFailed: number;
    waSent: number;
    waFailed: number;
  }> = {};

  const ensure = (id: string | null) => {
    const key = id ?? "__unknown__";
    if (!perBiz[key]) {
      perBiz[key] = {
        name: id ? (bizMap[id] ?? id.slice(0, 8)) : "(no business)",
        smsSent: 0, smsFailed: 0, waSent: 0, waFailed: 0,
      };
    }
    return perBiz[key];
  };

  for (const r of smsRows ?? []) {
    const b = ensure(r.business_id);
    if (r.status === "sent")   b.smsSent++;
    if (r.status === "failed") b.smsFailed++;
  }
  for (const r of waRows ?? []) {
    const b = ensure(r.business_id);
    if (r.status === "sent")   b.waSent++;
    if (r.status === "failed") b.waFailed++;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalSmsSent  = (smsRows ?? []).filter(r => r.status === "sent").length;
  const totalSmsFail  = (smsRows ?? []).filter(r => r.status === "failed").length;
  const totalWaSent   = (waRows  ?? []).filter(r => r.status === "sent").length;
  const totalWaFail   = (waRows  ?? []).filter(r => r.status === "failed").length;

  const totalCostUsd  = totalSmsSent * SMS_COST_USD + totalWaSent * WHATSAPP_COST_USD;

  // ── SMS type breakdown ────────────────────────────────────────────────────
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
    totals: {
      smsSent: totalSmsSent, smsFailed: totalSmsFail,
      waSent: totalWaSent,   waFailed: totalWaFail,
      estimatedCostUsd: Math.round(totalCostUsd * 100) / 100,
    },
    smsTypes,
    waTypes,
    perBusiness: Object.entries(perBiz)
      .map(([id, v]) => ({ id, ...v, estimatedCostUsd: Math.round((v.smsSent * SMS_COST_USD + v.waSent * WHATSAPP_COST_USD) * 100) / 100 }))
      .sort((a, b) => (b.smsSent + b.waSent) - (a.smsSent + a.waSent)),
  });
}
