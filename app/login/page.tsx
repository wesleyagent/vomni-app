"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

const G  = "#00C896";
const N  = "#0A0F1E";
const BD = "#E5E7EB";
const OW = "#F7F8FA";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BD}`,
  borderRadius: 10,
  padding: "14px 16px",
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  color: N,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={e => {
        e.currentTarget.style.borderColor = G;
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)";
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = BD;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forgot password state
  const [showForgot,   setShowForgot]   = useState(false);
  const [resetEmail,   setResetEmail]   = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent,    setResetSent]    = useState(false);
  const [resetError,   setResetError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: authError } = await db.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetSending(true);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim().toLowerCase(),
      { redirectTo: "https://vomni.io/reset-password" }
    );

    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
    setResetSending(false);
  }

  // ── Forgot password panel ──────────────────────────────────────────
  if (showForgot) {
    return (
      <div style={{ minHeight: "100vh", background: OW, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 48, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N, letterSpacing: "-0.5px", margin: 0 }}>
                Vomni
              </h1>
            </div>

            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", marginBottom: 12, marginTop: 0, lineHeight: 1.25 }}>
              Reset your password
            </h2>
            <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginBottom: 28, marginTop: 0 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {resetSent ? (
              <div style={{ padding: "20px 24px", background: "rgba(0,200,150,0.08)", border: `1px solid rgba(0,200,150,0.3)`, borderRadius: 12, textAlign: "center" }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: G, margin: "0 0 6px" }}>
                  Check your inbox
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", margin: 0 }}>
                  If an account exists for <strong>{resetEmail}</strong>, you&apos;ll receive a password reset link shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {resetError && (
                  <div style={{ padding: "12px 16px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#DC2626" }}>
                    {resetError}
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                    Email
                  </label>
                  <StyledInput
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="marcus@kingcuts.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetSending}
                  style={{ width: "100%", background: resetSending ? "#9CA3AF" : G, color: "#fff", border: "none", borderRadius: 9999, padding: 16, fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, cursor: resetSending ? "not-allowed" : "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!resetSending) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                  onMouseLeave={e => { if (!resetSending) (e.currentTarget as HTMLElement).style.background = G; }}
                >
                  {resetSending ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            )}

            <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginTop: 24, marginBottom: 0 }}>
              <button
                onClick={() => { setShowForgot(false); setResetSent(false); setResetError(""); setResetEmail(""); }}
                style={{ background: "none", border: "none", color: G, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}
              >
                ← Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login panel ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: OW, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 48, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N, letterSpacing: "-0.5px", margin: 0 }}>
              Vomni
            </h1>
          </div>

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", marginBottom: 32, marginTop: 0, lineHeight: 1.25 }}>
            Sign in to your dashboard
          </h2>

          {error && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#DC2626" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Email
              </label>
              <StyledInput
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="marcus@kingcuts.com"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{ background: "none", border: "none", color: G, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <StyledInput
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: "100%", marginTop: 8, background: submitting ? "#9CA3AF" : G, color: "#fff", border: "none", borderRadius: 9999, padding: 16, fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = G; }}
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginTop: 24, marginBottom: 0 }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: G, fontWeight: 600, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
