import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { business_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { business_id } = body;
  if (!business_id) {
    return NextResponse.json({ ok: false, error: "Missing business_id" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  try {
    await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("business_id", business_id)
      .eq("read", false);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
