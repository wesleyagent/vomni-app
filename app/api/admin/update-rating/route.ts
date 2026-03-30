import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const deny = requireAdmin(req);
  if (deny) return deny;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { business_id, rating, notes } = body as {
    business_id: string;
    rating: number;
    notes?: string;
  };

  if (!business_id || rating == null || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "business_id and rating (1–5) are required" }, { status: 400 });
  }

  const roundedRating = Math.round(rating * 10) / 10;

  // Update current_google_rating on businesses
  const { error: updateErr } = await supabaseAdmin
    .from("businesses")
    .update({ current_google_rating: roundedRating })
    .eq("id", business_id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Log a snapshot
  const { error: snapErr } = await supabaseAdmin
    .from("rating_snapshots")
    .insert({
      business_id,
      rating: roundedRating,
      snapshot_date: new Date().toISOString().split("T")[0],
      notes: notes ?? null,
    });

  if (snapErr) console.error("[update-rating] snapshot insert error:", snapErr.message);

  return NextResponse.json({ ok: true, rating: roundedRating });
}
