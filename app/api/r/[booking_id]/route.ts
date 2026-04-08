import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBusinessPushNotification } from "@/lib/push";

// Server-side data loader for the /r/[id] rating page.
// ALL writes go through here using the service role key so they bypass RLS.
// Unauthenticated customers cannot write directly to Supabase with the anon key.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  const { booking_id } = await params;

  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  const { data: booking, error: bkErr } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_name, review_status, rating")
    .eq("id", booking_id)
    .single();

  if (bkErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // ── One-use link: if rating already submitted, return alreadyUsed flag ───
  const completedStatuses = ["form_submitted", "redirected", "private_feedback",
    "reviewed_negative", "reviewed_positive", "private_feedback_from_positive"];
  if (booking.review_status && completedStatuses.includes(booking.review_status)) {
    // Fetch business name only — no need for full data
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("name")
      .eq("id", booking.business_id)
      .single();
    return NextResponse.json({ alreadyUsed: true, businessName: biz?.name ?? "us" });
  }

  // Try with logo_url first; fall back to without it if the column doesn't exist yet
  let business: Record<string, unknown> | null = null;
  const { data: bizFull, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("name, google_review_link, logo_url, owner_name, weekly_google_redirects, weekly_redirect_cap, booking_slug, booking_enabled")
    .eq("id", booking.business_id)
    .single();

  if (bizErr) {
    console.error("[/api/r] business fetch error (full):", bizErr.message);
    const { data: bizFallback, error: bizFallbackErr } = await supabaseAdmin
      .from("businesses")
      .select("name, google_review_link, owner_name, weekly_google_redirects, weekly_redirect_cap, booking_slug, booking_enabled")
      .eq("id", booking.business_id)
      .single();

    if (bizFallbackErr) {
      console.error("[/api/r] business fetch error (fallback):", bizFallbackErr.message);
    } else {
      business = { ...bizFallback, logo_url: null };
    }
  } else {
    business = bizFull;
  }

  console.log("[/api/r] booking_id:", booking_id, "business:", JSON.stringify(business));

  // Mark form opened
  const { error: openErr } = await supabaseAdmin
    .from("bookings")
    .update({ review_status: "form_opened", form_opened_at: new Date().toISOString() })
    .eq("id", booking_id);
  if (openErr) console.error("[/api/r] form_opened update error:", openErr.message);

  return NextResponse.json({ booking, business });
}

// ── POST: Customer submits star rating ────────────────────────────────────────
// Writes booking rating + inserts feedback row using admin key (bypasses RLS).
// Falls back to minimal field sets if optional columns don't exist yet.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  const { booking_id } = await params;
  const body = await req.json().catch(() => ({}));
  const { rating, business_id } = body as { rating?: number; business_id?: string };

  if (!booking_id || !rating || !business_id) {
    return NextResponse.json({ error: "Missing booking_id, rating, or business_id" }, { status: 400 });
  }

  // ── 1. Update booking with rating ───────────────────────────────────────
  let bkOk = false;
  const { error: bkErr1 } = await supabaseAdmin
    .from("bookings")
    .update({ rating, review_status: "form_submitted", rating_submitted_at: new Date().toISOString() })
    .eq("id", booking_id);

  if (bkErr1) {
    console.error("[/api/r POST] booking update (full) failed:", bkErr1.message);
    // Retry without rating_submitted_at in case the column doesn't exist
    const { error: bkErr2 } = await supabaseAdmin
      .from("bookings")
      .update({ rating, review_status: "form_submitted" })
      .eq("id", booking_id);
    if (bkErr2) {
      console.error("[/api/r POST] booking update (minimal) failed:", bkErr2.message);
      // Last resort — just update review_status
      const { error: bkErr3 } = await supabaseAdmin
        .from("bookings")
        .update({ review_status: "form_submitted" })
        .eq("id", booking_id);
      bkOk = !bkErr3;
      if (bkErr3) console.error("[/api/r POST] booking update (status only) failed:", bkErr3.message);
      else console.log("[/api/r POST] booking update (status only): ok");
    } else {
      bkOk = true;
      console.log("[/api/r POST] booking update (without rating_submitted_at): ok");
    }
  } else {
    bkOk = true;
    console.log("[/api/r POST] booking update: ok");
  }

  // ── 2. Insert feedback row ──────────────────────────────────────────────
  let feedbackId: string | null = null;

  // Try full insert first
  const { data: fb1, error: fbErr1 } = await supabaseAdmin
    .from("feedback")
    .insert({ booking_id, business_id, rating, feedback_text: null, status: "new", source: "vomni_native" })
    .select("id")
    .single();

  if (!fbErr1) {
    feedbackId = fb1?.id ?? null;
    console.log("[/api/r POST] feedback insert (full): ok, id=", feedbackId);
  } else {
    console.error("[/api/r POST] feedback insert (full) failed:", fbErr1.message);

    // Retry without source (column might not exist)
    const { data: fb2, error: fbErr2 } = await supabaseAdmin
      .from("feedback")
      .insert({ booking_id, business_id, rating, feedback_text: null, status: "new" })
      .select("id")
      .single();

    if (!fbErr2) {
      feedbackId = fb2?.id ?? null;
      console.log("[/api/r POST] feedback insert (without source): ok, id=", feedbackId);
    } else {
      console.error("[/api/r POST] feedback insert (without source) failed:", fbErr2.message);

      // Retry without status and source
      const { data: fb3, error: fbErr3 } = await supabaseAdmin
        .from("feedback")
        .insert({ booking_id, business_id, rating, feedback_text: null })
        .select("id")
        .single();

      if (!fbErr3) {
        feedbackId = fb3?.id ?? null;
        console.log("[/api/r POST] feedback insert (minimal): ok, id=", feedbackId);
      } else {
        console.error("[/api/r POST] feedback insert (minimal) failed:", fbErr3.message);

        // Last resort — insert without booking_id in case FK doesn't exist
        const { data: fb4, error: fbErr4 } = await supabaseAdmin
          .from("feedback")
          .insert({ business_id, rating, feedback_text: null })
          .select("id")
          .single();

        if (!fbErr4) {
          feedbackId = fb4?.id ?? null;
          console.log("[/api/r POST] feedback insert (no booking_id): ok, id=", feedbackId);
        } else {
          console.error("[/api/r POST] feedback insert (no booking_id) failed:", fbErr4.message);
        }
      }
    }
  }

  return NextResponse.json({ ok: bkOk, feedbackId });
}

// ── PATCH: Customer clicks Google button ─────────────────────────────────────
// Increments weekly_google_redirects and marks booking as redirected_to_google
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  const { booking_id } = await params;
  const body = await req.json().catch(() => ({}));
  const { business_id } = body as { business_id?: string };

  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  const { error: bkErr } = await supabaseAdmin
    .from("bookings")
    .update({
      review_status: "redirected_to_google",
      redirected_at: new Date().toISOString(),
    })
    .eq("id", booking_id);

  console.log("[/api/r PATCH] booking redirected_to_google:", bkErr ? `ERROR: ${bkErr.message}` : "ok");

  if (business_id) {
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("weekly_google_redirects")
      .eq("id", business_id)
      .single();

    if (biz) {
      await supabaseAdmin
        .from("businesses")
        .update({ weekly_google_redirects: (biz.weekly_google_redirects ?? 0) + 1 })
        .eq("id", business_id);
    }
  }

  // ── Trigger 2: google_redirect notification (non-blocking) ───────────────
  try {
    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("customer_name, business_id")
      .eq("id", booking_id)
      .maybeSingle();
    const notifBusinessId = business_id ?? bk?.business_id;
    if (notifBusinessId) {
      const customerName = bk?.customer_name ?? "A customer";
      const notifBody = `${customerName} was directed to leave a Google review.`;
      const { data: existingNotif } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("business_id", notifBusinessId)
        .eq("type", "google_redirect")
        .ilike("body", `${customerName}%`)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (!existingNotif) {
        void supabaseAdmin.from("notifications").insert({
          business_id: notifBusinessId,
          type: "google_redirect",
          title: "Customer sent to Google review",
          body: notifBody,
          read: false,
        });
      }
    }
  } catch (e) {
    console.error("[/api/r PATCH] google_redirect notification failed:", e);
  }

  return NextResponse.json({ ok: true });
}

// ── PUT: Customer submits private feedback text ───────────────────────────────
// Updates existing feedback row (or inserts if missing) using admin key.
// Falls back to minimal field sets if optional columns don't exist yet.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  const { booking_id } = await params;
  const body = await req.json().catch(() => ({}));
  const { feedback_id, feedback_text, business_id, rating, is_from_positive } =
    body as {
      feedback_id?: string;
      feedback_text?: string;
      business_id?: string;
      rating?: number;
      is_from_positive?: boolean;
    };

  if (!booking_id || !feedback_text?.trim()) {
    return NextResponse.json({ error: "Missing booking_id or feedback_text" }, { status: 400 });
  }

  const newBookingStatus = is_from_positive ? "private_feedback_from_positive" : "private_feedback";
  const feedbackSource   = is_from_positive ? "positive_flow" : "vomni_native";
  const trimmed          = feedback_text.trim();

  // ── Update or insert feedback text ─────────────────────────────────────
  if (feedback_id) {
    // Try with source first
    const { error: e1 } = await supabaseAdmin
      .from("feedback")
      .update({ feedback_text: trimmed, source: feedbackSource })
      .eq("id", feedback_id);

    if (e1) {
      console.error("[/api/r PUT] feedback update (with source) failed:", e1.message);
      // Retry without source
      const { error: e2 } = await supabaseAdmin
        .from("feedback")
        .update({ feedback_text: trimmed })
        .eq("id", feedback_id);
      if (e2) console.error("[/api/r PUT] feedback update (text only) failed:", e2.message);
      else console.log("[/api/r PUT] feedback update (text only): ok");
    } else {
      console.log("[/api/r PUT] feedback update: ok");
    }
  } else {
    // No existing feedback row — create one with progressive fallback
    const { error: e1 } = await supabaseAdmin
      .from("feedback")
      .insert({ booking_id, business_id, rating, feedback_text: trimmed, status: "new", source: feedbackSource });

    if (e1) {
      console.error("[/api/r PUT] feedback insert (full) failed:", e1.message);
      const { error: e2 } = await supabaseAdmin
        .from("feedback")
        .insert({ booking_id, business_id, rating, feedback_text: trimmed, status: "new" });
      if (e2) {
        console.error("[/api/r PUT] feedback insert (without source) failed:", e2.message);
        const { error: e3 } = await supabaseAdmin
          .from("feedback")
          .insert({ booking_id, business_id, rating, feedback_text: trimmed });
        if (e3) console.error("[/api/r PUT] feedback insert (minimal) failed:", e3.message);
        else console.log("[/api/r PUT] feedback insert (minimal): ok");
      } else {
        console.log("[/api/r PUT] feedback insert (without source): ok");
      }
    } else {
      console.log("[/api/r PUT] feedback insert: ok");
    }
  }

  // ── Update booking status ────────────────────────────────────────────────
  const { error: bkErr1 } = await supabaseAdmin
    .from("bookings")
    .update({ review_status: newBookingStatus, reviewed_at: new Date().toISOString() })
    .eq("id", booking_id);

  if (bkErr1) {
    console.error("[/api/r PUT] booking update (with reviewed_at) failed:", bkErr1.message);
    const { error: bkErr2 } = await supabaseAdmin
      .from("bookings")
      .update({ review_status: newBookingStatus })
      .eq("id", booking_id);
    if (bkErr2) console.error("[/api/r PUT] booking update (status only) failed:", bkErr2.message);
    else console.log("[/api/r PUT] booking update (status only): ok");
  } else {
    console.log("[/api/r PUT] booking update: ok");
  }

  // ── Trigger 1: complaint notification for rating <= 2 (non-blocking) ────
  if (business_id && rating && rating <= 2) {
    try {
      const notifBody = trimmed
        ? trimmed.slice(0, 80)
        : "A customer left private feedback before their Google review.";
      const { data: existingNotif } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("business_id", business_id)
        .eq("type", "complaint")
        .ilike("body", `${notifBody.slice(0, 40)}%`)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (!existingNotif) {
        void supabaseAdmin.from("notifications").insert({
          business_id,
          type: "complaint",
          title: "Private complaint received",
          body: notifBody,
          read: false,
        });
        Promise.resolve().then(() => sendBusinessPushNotification(business_id, {
          title: "Private complaint received",
          body: notifBody,
          data: { type: "complaint", id: feedback_id ?? booking_id },
        })).catch(e => console.error("[/api/r PUT] complaint push failed:", e));
      }
    } catch (e) {
      console.error("[/api/r PUT] complaint notification failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
