import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Vomni Blog",
  description:
    "Practical guides for barbers, salons, and service businesses on reviews, booking software, pricing, and growth.",
};

const G = "#00C896";
const N = "#0A0F1E";
const TS = "#6B7280";
const BD = "#E5E7EB";
const TM = "#9CA3AF";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 72,
          background: "#fff",
          borderBottom: `1px solid ${BD}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 32,
                fontWeight: 800,
                color: N,
              }}
            >
              Vomni
            </span>
          </Link>
          <div
            style={{ display: "flex", gap: 32, alignItems: "center" }}
            className="blog-nav-links"
          >
            {[
              { label: "How it Works", href: "/#how-it-works" },
              { label: "Pricing", href: "/#pricing" },
              { label: "Switch to Vomni", href: "/migrate" },
              { label: "Blog", href: "/blog" },
              { label: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: item.label === "Blog" ? G : TS,
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/signup"
            style={{
              background: G,
              color: "#fff",
              borderRadius: 9999,
              padding: "12px 28px",
              fontFamily: "Inter, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Page content */}
      <main style={{ minHeight: "calc(100vh - 72px - 140px)" }}>
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          background: N,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "48px 0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 48px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              display: "block",
              marginBottom: 24,
            }}
          >
            Vomni
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px 20px",
              marginBottom: 20,
            }}
          >
            {[
              { label: "Pricing", href: "/#pricing" },
              { label: "Blog", href: "/blog" },
              { label: "Switch to Vomni", href: "/migrate" },
              { label: "Contact", href: "/contact" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
            ].map((link, i, arr) => (
              <span key={link.label} style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <Link
                  href={link.href}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: TM,
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
                {i < arr.length - 1 && (
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                )}
              </span>
            ))}
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: TM,
              margin: 0,
            }}
          >
            Vomni · hello@vomni.io
          </p>
        </div>
      </footer>
    </>
  );
}
