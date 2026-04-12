import { supabaseAdmin } from "@/lib/supabase-admin";
import ReviewGatingClient from "./ReviewGatingClient";

export default async function ReviewInvitePage({
  params,
  searchParams,
}: {
  params:       Promise<{ business_id: string }>;
  searchParams: Promise<{ name?: string; booking_id?: string; invite_id?: string }>;
}) {
  const { business_id }                 = await params;
  const { name, booking_id, invite_id } = await searchParams;

  // Mark invite as clicked
  if (invite_id) {
    await supabaseAdmin
      .from("review_invites")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", invite_id);
  } else if (booking_id) {
    await supabaseAdmin
      .from("review_invites")
      .update({ clicked_at: new Date().toISOString() })
      .eq("business_id", business_id)
      .eq("booking_id", booking_id)
      .is("clicked_at", null);
  }

  // Fetch business data — google_review_link is the correct column
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name, google_review_link, owner_name, booking_slug, booking_enabled")
    .eq("id", business_id)
    .single();

  return (
    <ReviewGatingClient
      businessId={business_id}
      businessName={biz?.name ?? ""}
      googleReviewLink={biz?.google_review_link ?? null}
      ownerName={biz?.owner_name ?? null}
      bookingSlug={biz?.booking_slug ?? null}
      bookingEnabled={biz?.booking_enabled ?? false}
      customerName={name ?? null}
      bookingId={booking_id ?? null}
    />
  );
}
