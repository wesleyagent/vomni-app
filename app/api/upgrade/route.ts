import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 100,
  growth:  300,
  pro:     null,
};

export async function POST(req: NextRequest) {
  try {
    const { business_id, plan } = await req.json();

    if (!business_id || !plan) {
      return NextResponse.json({ error: "Missing business_id or plan" }, { status: 400 });
    }

    if (!["growth", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const newLimit = PLAN_LIMITS[plan] ?? null;

    const { error } = await supabaseAdmin
      .from("businesses")
      .update({
        plan,
        billing_anchor_day: new Date().getDate(),
      })
      .eq("id", business_id);

    if (error) {
      return NextResponse.json({ error: "Failed to upgrade plan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Upgrade error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
