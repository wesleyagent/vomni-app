import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });

  const result = await sendSMS(to, "Vomni test SMS ✅ — routing and number confirmed.", {
    messageType: "test",
  });

  return NextResponse.json(result);
}
