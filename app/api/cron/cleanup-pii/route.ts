import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function makeFingerprint(name: string, phone: string): string {
  const parts       = name.trim().split(/\s+/);
  const first       = (parts[0] ?? "").toLowerCase();
  const lastInitial = (parts[parts.length - 1]?.[0] ?? "").toLowerCase();
  const digits      = phone.replace(/\D/g, "");
  const last3       = digits.slice(-3);
  return createHash("sha256").update(`${first}${lastInitial}${last3}`).digest("hex");
}

function truncateName(name: string): string {
  const parts       = name.trim().split(/\s+/);
  const first       = parts[0] ?? "Customer";
  const lastInitial =
    parts.length > 1
      ? ` ${(parts[parts.length - 1][0] ?? "").toUpperCase()}.`
      : "";
  return `${first}${lastInitial}`;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch bookings where SMS was sent but PII has not yet been cleaned
  const { data: bookings, error: fetchError } = await supabase
    .from("bookings")
    .select("id, business_id, customer_name, customer_phone, customer_email")
    .not("sms_sent_at", "is", null)
    .not("customer_phone", "is", null)
    .lt("created_at", twoYearsAgo)
    .eq("opted_out", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ cleaned: 0 });
  }

  let cleaned = 0;

  for (const booking of bookings) {
    const { id, business_id, customer_name, customer_phone } = booking;

    if (!customer_name || !customer_phone) continue;

    // a. Generate fingerprint
    const fingerprint = makeFingerprint(customer_name, customer_phone);

    // b. Upsert fingerprint record for this business
    await supabase
      .from("customer_fingerprints")
      .upsert(
        { business_id, fingerprint },
        { onConflict: "business_id,fingerprint", ignoreDuplicates: true }
      );

    // c. Truncate customer name
    const truncated = truncateName(customer_name);

    // d & e. Null out PII fields and update name
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        customer_phone: null,
        customer_email: null,
        customer_name:  truncated,
      })
      .eq("id", id);

    if (updateError) continue;

    // f. Insert cleanup log entry
    await supabase.from("cleanup_log").insert({
      business_id,
      booking_id:  id,
      fingerprint,
      action:      "pii_deleted",
    });

    cleaned++;
  }

  return NextResponse.json({ cleaned });
}
