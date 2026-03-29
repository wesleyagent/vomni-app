import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ business_id: string }> }) {
  const { business_id } = await params;
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("plan")
    .eq("id", business_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ allowed: true, remaining: null, limit: null });
  }

  // Credit-based SMS limits removed — sending is now unrestricted per plan
  return NextResponse.json({ allowed: true, remaining: null, limit: null });
}
