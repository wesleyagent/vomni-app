"use client";

import { useState } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

const G = "#00C896";
const N = "#0A0F1E";
const TS = "#6B7280";
const BD = "#E5E7EB";
const OW = "#F7F8FA";

const ALL_TAGS = ["All", "Reviews", "Booking", "Pricing", "Growth"] as const;
type Tag = (typeof ALL_TAGS)[number];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndex({ posts }: { posts: PostMeta[] }) {
  const [activeTag, setActiveTag] = useState<Tag>("All");

  const filtered =
    activeTag === "All"
      ? posts
      : posts.filter((p) => p.tags?.includes(activeTag));

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "64px 48px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 56,
            fontWeight: 800,
            color: N,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          The Vomni Blog
        </h1>
        <p
          style={{
            fontSize: 20,
            color: TS,
            marginTop: 16,
            lineHeight: 1.6,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Practical guides for barbers, salons, and service businesses.
        </p>
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 48,
        }}
      >
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            style={{
              padding: "8px 20px",
              borderRadius: 9999,
              border: `2px solid ${activeTag === tag ? G : BD}`,
              background: activeTag === tag ? G : "#fff",
              color: activeTag === tag ? "#fff" : TS,
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Post grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
        }}
        className="blog-grid"
      >
        {filtered.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{ textDecoration: "none" }}
          >
            <article
              style={{
                background: OW,
                border: `1px solid ${BD}`,
                borderRadius: 16,
                padding: 28,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-3px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 8px 24px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {/* Tags */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {post.tags?.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: G,
                      background: "rgba(0,200,150,0.1)",
                      padding: "3px 10px",
                      borderRadius: 9999,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: N,
                  margin: 0,
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {post.title}
              </h2>

              {/* Description */}
              <p
                style={{
                  fontSize: 14,
                  color: TS,
                  marginTop: 12,
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {post.description}
              </p>

              {/* Meta */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: `1px solid ${BD}`,
                }}
              >
                <span style={{ fontSize: 13, color: TS }}>
                  {formatDate(post.publishedAt)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: TS,
                    background: BD,
                    padding: "2px 10px",
                    borderRadius: 9999,
                  }}
                >
                  {post.readingTime}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: TS, marginTop: 48 }}>
          No posts in this category yet.
        </p>
      )}

      <style>{`
        @media (max-width: 900px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 580px) {
          .blog-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .blog-nav-links { display: none !important; }
        }
      `}</style>
    </div>
  );
}
