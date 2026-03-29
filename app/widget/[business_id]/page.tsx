import { createClient } from "@supabase/supabase-js";

interface Props {
  params: { business_id: string };
}

export default async function WidgetPage({ params }: Props) {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(url, anonKey);

  const { data: biz } = await supabase
    .from("businesses")
    .select("name, google_review_count")
    .eq("id", params.business_id)
    .single();

  const { data: ratingData } = await supabase
    .from("bookings")
    .select("rating")
    .eq("business_id", params.business_id)
    .not("rating", "is", null);

  const ratings = ((ratingData ?? []) as { rating: number }[]).map(r => r.rating);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length)
    : 0;

  const reviewCount = biz?.google_review_count ?? ratings.length;
  const businessName = biz?.name ?? "Business";
  const displayRating = avgRating > 0 ? avgRating.toFixed(1) : "-";

  const G = "#00C896";
  const N = "#0A0F1E";

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{businessName} - Reviews</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          border: "1px solid #E5E7EB",
          fontFamily: "Inter, sans-serif",
        }}>
          {/* Google G logo */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>

          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, color: N, lineHeight: 1 }}>
              {displayRating} ★
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 3 }}>
              on Google · {reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "-"}
            </div>
          </div>

          <div style={{ borderLeft: "1px solid #E5E7EB", paddingLeft: 12 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#9CA3AF" }}>
              Powered by
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: G }}>
              vomni
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
