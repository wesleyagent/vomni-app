import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/require-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const { id } = await params;

  // Fetch business
  const { data: biz, error: bizError } = await supabase
    .from("businesses")
    .select(`
      id, name, owner_name, owner_email, plan, status,
      business_type, notification_email, google_review_link,
      onboarding_step, onboarding_gdpr_accepted, onboarding_gdpr_accepted_at,
      created_at, weekly_google_redirects
    `)
    .eq("id", id)
    .single();

  if (bizError || !biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Fetch recent bookings (last 100)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_email, review_status, sms_sent_at, created_at, rating")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Compute stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const allBookings = bookings ?? [];

  const thisMonthBookings = allBookings.filter(b => b.created_at >= startOfMonth);
  const reviewsThisMonth = thisMonthBookings.filter(b =>
    b.review_status === "redirected_to_google" || b.review_status === "redirected"
  ).length;

  const smsSent = allBookings.filter(b => b.sms_sent_at).length;
  const redirected = allBookings.filter(b =>
    b.review_status === "redirected_to_google" || b.review_status === "redirected"
  ).length;
  const completionRate = smsSent > 0 ? Math.round((redirected / smsSent) * 100) : 0;

  const lastActivity = allBookings[0]?.created_at ?? null;

  return NextResponse.json({
    business: biz,
    bookings: allBookings,
    stats: {
      totalBookings: allBookings.length,
      reviewsThisMonth,
      completionRate,
      totalRedirected: redirected,
      lastActivity,
    },
  });
}
