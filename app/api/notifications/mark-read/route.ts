import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { business_id } = await req.json();

  if (!business_id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(url, anonKey);

  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("business_id", business_id)
      .eq("read", false);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
