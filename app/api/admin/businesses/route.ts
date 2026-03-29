import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("id,name,owner_name,owner_email,plan,status,onboarding_step,business_type,notification_email,created_at,onboarding_gdpr_accepted,onboarding_gdpr_accepted_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/businesses] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
