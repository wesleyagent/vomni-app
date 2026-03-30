import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

// POST /api/booking/[slug]/waitlist — Join the waitlist for a date
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ip = getClientIP(req);
  if (!checkRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: {
    date: string;
    service_id?: string;
    staff_id?: string;
    customer_name: string;
    customer_phone: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { date, service_id, staff_id, customer_name, customer_phone } = body;

  if (!date || !customer_name || !customer_phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (!business || !business.booking_enabled) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("booking_waitlist").insert({
    business_id: business.id,
    service_id: service_id ?? null,
    staff_id: staff_id && staff_id !== "any" ? staff_id : null,
    date,
    customer_name: customer_name.trim().slice(0, 100),
    customer_phone: customer_phone.replace(/[^\d+\-() ]/g, "").trim().slice(0, 20),
  });

  if (error) {
    console.error("[waitlist] insert error:", error.message);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
