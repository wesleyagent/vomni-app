import type { ReactNode } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ManageClient from "./ManageClient";

const G = "#00C896";
const N = "#0A0F1E";

// ── Static terminal states ────────────────────────────────────────────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <Shell>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>
        This link is no longer valid.
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0 }}>
        הקישור כבר לא בתוקף.
      </p>
    </Shell>
  );
}

function AlreadyCancelled({ businessName }: { businessName: string }) {
  return (
    <Shell>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✕</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>
        This appointment has already been cancelled.
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0 }}>
        הפגישה ב-{businessName} כבר בוטלה.
      </p>
    </Shell>
  );
}

function ReviewOnly({ businessName, googleReviewLink }: { businessName: string; googleReviewLink: string | null }) {
  return (
    <Shell>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>
        We hope you enjoyed your visit!
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
        מקווים שנהנית מהביקור ב-{businessName}!
      </p>
      {googleReviewLink && (
        <a
          href={googleReviewLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block", background: G, color: "#fff", textDecoration: "none",
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700,
            padding: "14px 28px", borderRadius: 9999,
          }}
        >
          Leave us a review →
        </a>
      )}
    </Shell>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, service_name, service_duration_minutes, appointment_at, status, staff_id, service_id, services(name, name_he), staff(name, name_he), businesses(name, google_review_link, booking_slug, booking_timezone, booking_buffer_minutes)")
    .eq("cancellation_token", token)
    .maybeSingle();

  if (!booking) return <NotFound />;

  const biz = booking.businesses as unknown as {
    name: string | null;
    google_review_link: string | null;
    booking_slug: string | null;
    booking_timezone: string | null;
    booking_buffer_minutes: number | null;
  } | null;

  const svc = booking.services as unknown as { name: string | null; name_he: string | null } | null;
  const stf = booking.staff as unknown as { name: string | null; name_he: string | null } | null;

  if (booking.status === "cancelled") {
    return <AlreadyCancelled businessName={biz?.name ?? ""} />;
  }

  if (booking.status === "completed" || booking.status === "no_show") {
    return (
      <ReviewOnly
        businessName={biz?.name ?? ""}
        googleReviewLink={biz?.google_review_link ?? null}
      />
    );
  }

  return (
    <ManageClient
      token={token}
      booking={{
        id: booking.id,
        customerName: booking.customer_name ?? "",
        serviceName: svc?.name ?? booking.service_name ?? "",
        staffName: stf?.name ?? null,
        appointmentAt: booking.appointment_at ?? "",
        staffId: (booking.staff_id as string | null) ?? null,
        serviceId: (booking.service_id as string | null) ?? null,
      }}
      business={{
        name: biz?.name ?? "",
        googleReviewLink: biz?.google_review_link ?? null,
        bookingSlug: biz?.booking_slug ?? null,
        timezone: biz?.booking_timezone ?? "Asia/Jerusalem",
        bufferMinutes: biz?.booking_buffer_minutes ?? 0,
      }}
    />
  );
}
