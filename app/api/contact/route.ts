import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { name, email, business, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("contact_submissions")
      .insert({ name: name.trim(), email: email.trim(), business: business?.trim() || null, message: message.trim() });

    if (error) {
      console.error("contact insert error", error);
      return NextResponse.json({ error: "Failed to save message." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact route error", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
