import { NextRequest } from "next/server";
import { redirect }    from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

// This is a server component — records the click then redirects to Google review link
export default async function ReviewInvitePage({
  params,
  searchParams,
}: {
  params:       Promise<{ business_id: string }>;
  searchParams: Promise<{ name?: string; booking_id?: string; invite_id?: string }>;
}) {
  const { business_id }                     = await params;
  const { name, booking_id, invite_id }     = await searchParams;

  // Mark invite as clicked
  if (invite_id) {
    await supabaseAdmin
      .from("review_invites")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", invite_id);
  } else if (booking_id && business_id) {
    // Find invite by booking_id and mark clicked
    await supabaseAdmin
      .from("review_invites")
      .update({ clicked_at: new Date().toISOString() })
      .eq("business_id", business_id)
      .eq("booking_id", booking_id)
      .is("clicked_at", null);
  }

  // Fetch the business google_maps_url
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("google_maps_url, name")
    .eq("id", business_id)
    .single();

  if (!biz?.google_maps_url) {
    // No Google Maps URL configured — show a simple thank-you page
    return (
      <html>
        <body style={{ fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, background: "#F7F8FA" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#0A0F1E", margin: "0 0 12px" }}>
              Thanks{name ? `, ${name}` : ""}!
            </h1>
            <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.6 }}>
              We really appreciate your visit to {biz?.name ?? "us"}. Your feedback means a lot!
            </p>
          </div>
        </body>
      </html>
    );
  }

  // Redirect to Google Maps review URL
  redirect(biz.google_maps_url);
}
