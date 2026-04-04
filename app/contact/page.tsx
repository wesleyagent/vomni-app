"use client";

import { useState } from "react";
import Link from "next/link";

const G = "#00C896";
const N = "#0A0F1E";

export default function ContactPage() {
  const [form, setForm]       = useState({ name: "", email: "", business: "", message: "" });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim())    errs.name    = "Required";
    if (!form.email.trim())   errs.email   = "Required";
    if (!form.message.trim()) errs.message = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setDone(true);
      else setErrors({ message: "Something went wrong — please try again." });
    } catch {
      setErrors({ message: "Something went wrong — please try again." });
    }
    setSending(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@400;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; }
        .contact-nav {
          position: sticky; top: 0; z-index: 100; height: 64px;
          background: #fff; border-bottom: 1px solid #E5E7EB;
          display: flex; align-items: center; padding: 0 24px;
        }
        .cfield { margin-bottom: 20px; }
        label {
          display: block; font-family: Inter, sans-serif; font-size: 13px;
          font-weight: 600; color: #374151; margin-bottom: 6px;
        }
        input[type=text], input[type=email], textarea {
          width: 100%; font-family: Inter, sans-serif; font-size: 15px;
          color: ${N}; background: #fff; border: 1px solid #E5E7EB;
          border-radius: 10px; padding: 11px 14px; outline: none;
          transition: border-color 0.15s; box-sizing: border-box;
        }
        input[type=text]:focus, input[type=email]:focus, textarea:focus { border-color: ${G}; }
        textarea { resize: vertical; min-height: 120px; }
        .cerr { font-family: Inter, sans-serif; font-size: 12px; color: #EF4444; margin-top: 4px; display: block; }
        .cfooter { margin-top: 48px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center; }
        .cfooter p { font-family: Inter, sans-serif; font-size: 13px; color: #9CA3AF; margin: 0; }
        .cfooter a { color: #6B7280; text-decoration: none; }
        .cfooter a:hover { color: ${N}; }
        @media (max-width: 640px) {
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <nav className="contact-nav">
        <Link href="/" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: N, textDecoration: "none" }}>
          Vomni
        </Link>
      </nav>

      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px" }}>
        <div style={{ maxWidth: 580, width: "100%" }}>

          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 800, color: N, margin: "0 0 12px", lineHeight: 1.1 }}>
            Get in touch
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "#6B7280", margin: "0 0 40px", lineHeight: 1.6 }}>
            We are a small team and we read every message. Expect a reply within a few hours.
          </p>

          {done ? (
            <div style={{ border: `1px solid ${G}`, borderRadius: 16, padding: "40px 36px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: "0 0 8px" }}>Message sent</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#6B7280", margin: 0 }}>We will be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>

              <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <div className="cfield">
                  <label htmlFor="cname">Name</label>
                  <input id="cname" type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" />
                  {errors.name && <span className="cerr">{errors.name}</span>}
                </div>
                <div className="cfield">
                  <label htmlFor="cemail">Email</label>
                  <input id="cemail" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
                  {errors.email && <span className="cerr">{errors.email}</span>}
                </div>
              </div>

              <div className="cfield">
                <label htmlFor="cbusiness">
                  Business name{" "}
                  <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                </label>
                <input id="cbusiness" type="text" value={form.business} onChange={e => set("business", e.target.value)} placeholder="e.g. Nova Cuts" />
              </div>

              <div className="cfield">
                <label htmlFor="cmessage">Message</label>
                <textarea id="cmessage" value={form.message} onChange={e => set("message", e.target.value)} placeholder="What can we help with?" />
                {errors.message && <span className="cerr">{errors.message}</span>}
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{ width: "100%", background: sending ? "#9CA3AF" : G, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 0", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, cursor: sending ? "default" : "pointer", transition: "background 0.2s", marginBottom: 16 }}
              >
                {sending ? "Sending…" : "Send message →"}
              </button>

              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
                Want to see Vomni live first?{" "}
                <button
                  type="button"
                  onClick={() => { window.location.href = "/#book-demo"; }}
                  style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: G, fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                >
                  Book a free demo
                </button>
              </p>

            </form>
          )}

          <div className="cfooter">
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
