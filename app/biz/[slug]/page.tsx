import { notFound }    from "next/navigation";
import Link            from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

const G      = "#00C896";
const N      = "#0A0F1E";
const BORDER = "#E5E7EB";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} fill={filled ? G : "#E5E7EB"}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default async function BizProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("id, name, booking_slug, google_maps_url, instagram_handle, address, city, postcode, bio, primary_color, logo_url, average_rating, total_reviews")
    .eq("booking_slug", slug)
    .eq("booking_enabled", true)
    .single();

  if (!biz) notFound();

  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, price, color")
    .eq("business_id", biz.id)
    .eq("is_active", true)
    .order("display_order");

  const accentColor = (biz as typeof biz & { primary_color?: string }).primary_color ?? G;
  const bookingUrl  = `/book/${biz.booking_slug}`;
  const rating      = (biz as typeof biz & { average_rating?: number }).average_rating ?? 0;
  const totalRev    = (biz as typeof biz & { total_reviews?: number }).total_reviews ?? 0;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{biz.name} — Book Online</title>
        <meta name="description" content={`Book an appointment with ${biz.name} online. ${(biz as typeof biz & { bio?: string }).bio ?? ""}`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#F7F8FA", fontFamily: "Inter, sans-serif" }}>
        {/* Hero */}
        <div style={{ background: accentColor, padding: "40px 24px 80px" }}>
          <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
            {(biz as typeof biz & { logo_url?: string }).logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(biz as typeof biz & { logo_url?: string }).logo_url!}
                alt={`${biz.name} logo`}
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.4)", marginBottom: 16 }}
              />
            )}
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
              {biz.name}
            </h1>
            {(biz as typeof biz & { bio?: string }).bio && (
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "0 0 16px", lineHeight: 1.6 }}>
                {(biz as typeof biz & { bio?: string }).bio}
              </p>
            )}
            {totalRev > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", borderRadius: 9999, padding: "6px 14px", marginBottom: 16 }}>
                {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{rating.toFixed(1)} ({totalRev})</span>
              </div>
            )}
            {biz.address && (
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>
                📍 {biz.address}{biz.city ? `, ${biz.city}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Card */}
        <div style={{ maxWidth: 520, margin: "-48px auto 40px", padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>

            {/* Book Now CTA */}
            <div style={{ padding: "24px 24px 20px" }}>
              <Link href={bookingUrl} style={{
                display: "block", textAlign: "center", padding: "16px 32px",
                background: accentColor, color: "#fff", textDecoration: "none",
                borderRadius: 12, fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px",
              }}>
                Book an Appointment →
              </Link>
            </div>

            {/* Services */}
            {(services ?? []).length > 0 && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: 24 }}>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 16px" }}>
                  Services
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(services ?? []).map(svc => (
                    <Link key={svc.id} href={`${bookingUrl}?service=${svc.id}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`,
                        background: "#FAFAFA", cursor: "pointer",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: svc.color ?? accentColor, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>{svc.name}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{svc.duration_minutes} min</div>
                          </div>
                        </div>
                        {svc.price && (
                          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N }}>
                            £{svc.price}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(biz.google_maps_url || biz.instagram_handle) && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {biz.google_maps_url && (
                  <a href={biz.google_maps_url} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                    border: `1px solid ${BORDER}`, borderRadius: 9999, fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 500, color: N, textDecoration: "none", background: "#fff",
                  }}>
                    📍 Find us on Maps
                  </a>
                )}
                {biz.instagram_handle && (
                  <a href={`https://instagram.com/${biz.instagram_handle}`} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                    border: `1px solid ${BORDER}`, borderRadius: 9999, fontFamily: "Inter, sans-serif",
                    fontSize: 13, fontWeight: 500, color: N, textDecoration: "none", background: "#fff",
                  }}>
                    📸 @{biz.instagram_handle}
                  </a>
                )}
              </div>
            )}
          </div>

          <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 24 }}>
            Powered by <a href="https://vomni.io" style={{ color: G, textDecoration: "none", fontWeight: 600 }}>vomni</a>
          </p>
        </div>
      </body>
    </html>
  );
}
