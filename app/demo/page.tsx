"use client";

import Link from "next/link";
import { Scissors, UtensilsCrossed, ArrowRight } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";

const demos = [
  {
    slug: "kings-cuts",
    name: "Kings Cuts London",
    description: "A thriving barbershop in Shoreditch",
    stats: "66% completion rate, 4.3 avg rating, 28 Google reviews this month",
    icon: Scissors,
  },
  {
    slug: "bella-vista",
    name: "Bella Vista Restaurant",
    description: "A London restaurant growing its reputation",
    stats: "29% completion rate, 3.7 avg rating, needs more reviews",
    icon: UtensilsCrossed,
  },
];

export default function DemoSelectorPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA" }}>
      <div style={{ maxWidth: 896, margin: "0 auto", padding: "80px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 48,
              fontWeight: 800,
              color: N,
              letterSpacing: "-1px",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            See Vomni in Action
          </h1>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              color: "#6B7280",
              marginTop: 16,
              marginBottom: 0,
              lineHeight: 1.6,
            }}
          >
            Explore a live demo account to see how Vomni manages reviews, catches negative feedback, and grows Google ratings.
          </p>
        </div>

        {/* Demo Cards */}
        <div
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {demos.map((demo) => {
            const Icon = demo.icon;
            return (
              <div
                key={demo.slug}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)",
                  padding: 36,
                  transition: "all 0.25s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.10), 0 24px 60px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)";
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(0,200,150,0.1)",
                    color: G,
                  }}
                >
                  <Icon size={28} />
                </div>
                <h2
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: N,
                    marginTop: 20,
                    marginBottom: 0,
                  }}
                >
                  {demo.name}
                </h2>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#6B7280",
                    marginTop: 6,
                    marginBottom: 0,
                  }}
                >
                  {demo.description}
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#9CA3AF",
                    marginTop: 12,
                    marginBottom: 0,
                  }}
                >
                  {demo.stats}
                </p>
                <Link
                  href={`/demo/${demo.slug}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 28,
                    background: G,
                    color: "#fff",
                    borderRadius: 9999,
                    padding: "12px 28px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                >
                  Explore Demo
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 64, textAlign: "center" }}>
          <Link
            href="/signup"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: G,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#00A87D"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = G; }}
          >
            Ready to try it yourself? Sign up now →
          </Link>
        </div>
      </div>
    </div>
  );
}
