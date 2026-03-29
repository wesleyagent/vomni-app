import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — Vomni",
  description: "Get in touch with the Vomni team. We read every message and reply within a few hours.",
};

export default function ContactPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@400;700;800&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; }

        .contact-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          background: #fff;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          padding: 0 24px;
        }

        .contact-wrapper {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 24px 80px;
        }

        .contact-inner {
          max-width: 600px;
          width: 100%;
        }

        .contact-headline {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 48px;
          font-weight: 800;
          color: #0A0F1E;
          margin: 0 0 12px;
          line-height: 1.1;
        }

        .contact-sub {
          font-family: Inter, sans-serif;
          font-size: 18px;
          color: #6B7280;
          margin: 0 0 56px;
          line-height: 1.6;
        }

        .contact-card {
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 36px;
          margin-bottom: 24px;
        }

        .contact-card-label {
          font-family: Inter, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #00C896;
          margin: 0 0 8px;
        }

        .contact-card-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #0A0F1E;
          margin: 0 0 8px;
        }

        .contact-card-desc {
          font-family: Inter, sans-serif;
          font-size: 15px;
          color: #6B7280;
          margin: 0 0 24px;
          line-height: 1.6;
        }

        .contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #00C896;
          color: #fff;
          border-radius: 9999px;
          padding: 12px 24px;
          font-family: Inter, sans-serif;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }

        .contact-btn:hover {
          background: #00A87D;
        }

        .contact-footer {
          margin-top: 56px;
          padding-top: 32px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
        }

        .contact-footer p {
          font-family: Inter, sans-serif;
          font-size: 13px;
          color: #9CA3AF;
          margin: 0;
        }

        .contact-footer a {
          color: #6B7280;
          text-decoration: none;
        }

        .contact-footer a:hover {
          color: #0A0F1E;
        }

        @media (max-width: 640px) {
          .contact-headline { font-size: 34px; }
          .contact-sub { font-size: 16px; margin-bottom: 40px; }
          .contact-card { padding: 24px; }
          .contact-wrapper { padding: 48px 20px 60px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="contact-nav">
        <Link
          href="/"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: "#0A0F1E", textDecoration: "none" }}
        >
          Vomni
        </Link>
      </nav>

      <div className="contact-wrapper">
        <div className="contact-inner">
          <h1 className="contact-headline">Get in touch</h1>
          <p className="contact-sub">
            We are a small team and we read every message. Expect a reply within a few hours.
          </p>

          {/* Support */}
          <div className="contact-card">
            <p className="contact-card-label">Support</p>
            <h2 className="contact-card-title">Questions or need help?</h2>
            <p className="contact-card-desc">
              Questions about your account, setup help, or anything technical — we have got you covered.
            </p>
            <a href="mailto:hello@vomni.io" className="contact-btn">
              Email us →
            </a>
          </div>

          {/* Demo */}
          <div className="contact-card">
            <p className="contact-card-label">Sales</p>
            <h2 className="contact-card-title">Want to see Vomni in action?</h2>
            <p className="contact-card-desc">
              Book a free 30 minute demo and we will show you exactly what it looks like for your business.
            </p>
            <a href="/#book-demo" className="contact-btn">
              Book a Free Demo →
            </a>
          </div>

          {/* Footer */}
          <div className="contact-footer">
            <p>
              <a href="/privacy">Privacy Policy</a>
              {" · "}
              <a href="/terms">Terms of Service</a>
              {" · "}
              <a href="/">Back to home</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
