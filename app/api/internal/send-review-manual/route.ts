import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingMessage } from "@/lib/twilio";
import { decryptPhone } from "@/lib/phone";

// Temporary one-off endpoint — DELETE AFTER USE
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = req.nextUrl.searchParams.get("booking_id");
  if (!bookingId) return NextResponse.json({ error: "missing booking_id" }, { status: 400 });

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_phone_encrypted, business_id, service_name")
    .eq("id", bookingId)
    .single();

  if (error || !booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name")
    .eq("id", booking.business_id)
    .single();

  const enc = (booking as typeof booking & { customer_phone_encrypted?: string }).customer_phone_encrypted;
  const phone: string | null = enc
    ? (() => { try { return decryptPhone(enc); } catch { return booking.customer_phone ?? null; } })()
    : (booking.customer_phone ?? null);

  if (!phone) return NextResponse.json({ error: "no phone" }, { status: 400 });

  const firstName = booking.customer_name?.split(" ")[0] ?? "there";
  const businessName = business?.name ?? "us";
  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${booking.id}`;
  const body = `היי ${firstName}! 😊 מקווים שנהנית מהביקור אצל ${businessName}. נשמח מאוד אם תשאיר/י לנו ביקורת: ${reviewUrl}`;

  const result = await sendBookingMessage(phone, body, false, {
    businessId: booking.business_id,
    bookingId: booking.id,
    messageType: "review_request",
  });

  if (result.success) {
    await supabaseAdmin
      .from("bookings")
      .update({ review_request_sent: true })
      .eq("id", booking.id);
    return NextResponse.json({ success: true, phone: phone.slice(0, 6) + "****" });
  }

  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
