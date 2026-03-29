"use client";

import { useState, useEffect } from "react";

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

function getPasswordStrength(pw: string): { label: string; color: string; width: string } | null {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const hasSpec  = /[^A-Za-z0-9]/.test(pw);
  const variety  = [hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length;

  if (pw.length < 8)                       return { label: "Too short", color: "#EF4444", width: "20%" };
  if (pw.length >= 8 && variety <= 2)      return { label: "Weak",      color: "#F97316", width: "40%" };
  if (pw.length >= 10 && variety === 3)    return { label: "Medium",    color: "#F59E0B", width: "65%" };
  if (pw.length >= 12 && variety === 4)    return { label: "Strong",    color: G,         width: "100%" };
  if (pw.length >= 8 && variety >= 3)      return { label: "Medium",    color: "#F59E0B", width: "65%" };
  return { label: "Weak", color: "#F97316", width: "40%" };
}

export default function ResetPasswordPage() {
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);
  const [countdown,       setCountdown]       = useState(3);

  const strength = getPasswordStrength(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Countdown redirect after success
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      window.location.href = "/login";
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );

    // Supabase reads the session from the URL hash automatically
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

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

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, textAlign: "center", marginBottom: 12, marginTop: 0, lineHeight: 1.25 }}>
            Set a new password
          </h2>
          <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginBottom: 28, marginTop: 0 }}>
            Choose a strong password for your account.
          </p>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 8px" }}>
                Password updated!
              </p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: 0 }}>
                Redirecting to sign in in {countdown}s…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {error && (
                <div style={{ padding: "12px 16px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#DC2626" }}>
                  {error}
                </div>
              )}

              {/* New password */}
              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                  New password
                </label>
                <StyledInput
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password (min 8 chars)"
                  minLength={8}
                />
                {strength && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, background: "#F3F4F6", borderRadius: 9999, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: strength.width,
                          background: strength.color,
                          borderRadius: 9999,
                          transition: "width 0.3s, background 0.3s",
                        }}
                      />
                    </div>
                    <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: strength.color, fontWeight: 500 }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                  Confirm new password
                </label>
                <StyledInput
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
                {passwordMismatch && (
                  <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444" }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || passwordMismatch}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: submitting || passwordMismatch ? "#9CA3AF" : G,
                  color: "#fff",
                  border: "none",
                  borderRadius: 9999,
                  padding: 16,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: submitting || passwordMismatch ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!submitting && !passwordMismatch) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                onMouseLeave={e => { if (!submitting && !passwordMismatch) (e.currentTarget as HTMLElement).style.background = G; }}
              >
                {submitting ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
