import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { marked } from "marked";
import { getAllSlugs, getPost } from "@/lib/blog";

const G = "#00C896";
const N = "#0A0F1E";
const TS = "#6B7280";
const BD = "#E5E7EB";
const OW = "#F7F8FA";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let post;
  try {
    post = getPost(slug);
  } catch {
    return {};
  }
  return {
    title: post.title + " | Vomni",
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://vomni.io/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    alternates: {
      canonical: `https://vomni.io/blog/${post.slug}`,
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post;
  try {
    post = getPost(slug);
  } catch {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "Vomni" },
    publisher: {
      "@type": "Organization",
      name: "Vomni",
      url: "https://vomni.io",
    },
    mainEntityOfPage: `https://vomni.io/blog/${post.slug}`,
  };

  const faqSchema =
    post.faqs && post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  const isRtl = post.dir === "rtl";

  return (
    <>
      {/* JSON-LD schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={post.lang}
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "56px 48px",
          fontFamily: "Inter, sans-serif",
        }}
        className="blog-post"
      >
        {/* Breadcrumb */}
        <nav
          style={{
            marginBottom: 32,
            fontSize: 14,
            color: TS,
            display: "flex",
            gap: 8,
            alignItems: "center",
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          <a
            href="/blog"
            style={{ color: G, textDecoration: "none", fontWeight: 500 }}
          >
            Blog
          </a>
          <span>›</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 400,
            }}
          >
            {post.title}
          </span>
        </nav>

        {/* Tag pills */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: G,
                  background: "rgba(0,200,150,0.1)",
                  padding: "3px 12px",
                  borderRadius: 9999,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 44,
            fontWeight: 800,
            color: N,
            lineHeight: 1.15,
            margin: "0 0 16px",
          }}
          className="post-title"
        >
          {post.title}
        </h1>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            color: TS,
            fontSize: 14,
            marginBottom: 40,
            paddingBottom: 32,
            borderBottom: `1px solid ${BD}`,
            flexWrap: "wrap",
          }}
        >
          <span>By Vomni</span>
          <span style={{ color: BD }}>·</span>
          <span>{formatDate(post.publishedAt)}</span>
          <span style={{ color: BD }}>·</span>
          <span
            style={{
              background: OW,
              border: `1px solid ${BD}`,
              borderRadius: 9999,
              padding: "2px 12px",
              fontSize: 13,
            }}
          >
            {post.readingTime} read
          </span>
        </div>

        {/* Post content */}
        <div
          className="prose"
          dangerouslySetInnerHTML={{
            __html: marked(post.content, { gfm: true, breaks: false }) as string,
          }}
        />
      </div>

      <style>{`
        .prose {
          font-family: Inter, sans-serif;
          font-size: 17px;
          line-height: 1.75;
          color: #374151;
        }
        .prose h2 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: ${N};
          margin: 40px 0 16px;
          line-height: 1.3;
        }
        .prose h3 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: ${N};
          margin: 32px 0 12px;
          line-height: 1.3;
        }
        .prose p {
          margin: 0 0 20px;
        }
        .prose strong {
          color: ${N};
          font-weight: 600;
        }
        .prose a {
          color: ${G};
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .prose ul, .prose ol {
          padding-left: 28px;
          margin: 0 0 20px;
        }
        .prose li {
          margin-bottom: 8px;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-size: 15px;
          overflow-x: auto;
          display: block;
        }
        .prose th {
          background: #F7F8FA;
          font-weight: 600;
          color: ${N};
          padding: 12px 16px;
          text-align: left;
          border: 1px solid ${BD};
          white-space: nowrap;
        }
        .prose td {
          padding: 12px 16px;
          border: 1px solid ${BD};
          color: #374151;
        }
        .prose tr:nth-child(even) td {
          background: #FAFAFA;
        }
        .prose blockquote {
          border-left: 4px solid ${G};
          margin: 24px 0;
          padding: 12px 24px;
          background: rgba(0,200,150,0.04);
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: ${TS};
        }
        .prose hr {
          border: none;
          border-top: 1px solid ${BD};
          margin: 40px 0;
        }
        .prose pre {
          background: #F7F8FA;
          border: 1px solid ${BD};
          border-radius: 8px;
          padding: 20px;
          overflow-x: auto;
          font-size: 14px;
          line-height: 1.6;
          margin: 24px 0;
        }
        .prose code {
          background: #F7F8FA;
          border: 1px solid ${BD};
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 14px;
        }
        .prose pre code {
          background: none;
          border: none;
          padding: 0;
        }
        [dir="rtl"] .prose {
          text-align: right;
        }
        [dir="rtl"] .prose ul,
        [dir="rtl"] .prose ol {
          padding-right: 28px;
          padding-left: 0;
        }
        [dir="rtl"] .prose blockquote {
          border-left: none;
          border-right: 4px solid ${G};
          border-radius: 8px 0 0 8px;
        }
        @media (max-width: 768px) {
          .blog-post {
            padding: 32px 24px !important;
          }
          .post-title {
            font-size: 32px !important;
          }
          .prose {
            font-size: 16px !important;
          }
          .prose h2 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </>
  );
}
