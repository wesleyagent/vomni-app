"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveBusiness, generateId, generateForwardingEmail, saveAdminSignup } from "@/lib/storage";
import type { Business } from "@/types";
import type { Plan } from "@/types";

const G = "#00C896";
const N = "#0A0F1E";
const OW = "#F7F8FA";
const BD = "#E5E7EB";

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
      onFocus={(e) => {
        e.currentTarget.style.borderColor = G;
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)";
      }}
      onBlur={(e) => {
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

// ── Payment gate ─────────────────────────────────────────────────────────────
// Shown when the user visits /signup without a completed Lemon Squeezy payment.

function PaymentGate() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F8FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 24,
          padding: 48,
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: "#0A0F1E", margin: "0 0 12px" }}>
          Vomni
        </h1>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0F1E", margin: "0 0 12px" }}>
          Choose your plan first
        </h2>
        <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.6 }}>
          Select a plan on our pricing page to unlock account setup. It only takes 2 minutes.
        </p>
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            background: "#00C896",
            color: "#fff",
            borderRadius: 9999,
            padding: "16px 40px",
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          View Plans →
        </Link>
        <p style={{ marginTop: 24, fontSize: 13, color: "#9CA3AF" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#00C896", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  // ── Read payment proof + plan from URL (set by Lemon Squeezy redirect) ─────
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null); // null = checking
  const [businessName,     setBusinessName]     = useState("");
  const [ownerName,        setOwnerName]        = useState("");
  const [email,            setEmail]            = useState("");
  const [phone,            setPhone]            = useState("");
  const [password,         setPassword]         = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [plan,             setPlan]             = useState<Plan>("growth");
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid   = params.get("payment") === "success";
    setPaymentVerified(paid);
    // Pre-select the plan the user chose on the pricing page
    const urlPlan = params.get("plan") as Plan | null;
    if (urlPlan && ["starter", "growth", "pro"].includes(urlPlan)) {
      setPlan(urlPlan);
    }
  }, []);

  // ── Gate: block access until payment is confirmed ────────────────────────
  if (paymentVerified === null) {
    // Still reading URL params — show a brief spinner to avoid flash
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#00C896", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!paymentVerified) {
    return <PaymentGate />;
  }

  const strength = getPasswordStrength(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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

    const { db: supabase } = await import("@/lib/db");
    const trimmedEmail    = email.trim().toLowerCase();
    const trimmedBizName  = businessName.trim();
    const trimmedOwner    = ownerName.trim();

    // 1. Create Supabase Auth user - embed metadata so the DB trigger can
    //    create a businesses row even if step 2 fails for any reason.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          business_name: trimmedBizName,
          owner_name:    trimmedOwner,
          plan,
        },
      },
    });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    const userId = authData.user?.id;

    // 2. Insert into businesses table - use the Auth UUID as the row id so
    //    the dashboard can always look up the record with a single equality check.
    const { error: bizError } = await supabase.from("businesses").insert({
      id:               userId,
      name:             trimmedBizName,
      owner_name:       trimmedOwner,
      owner_email:      trimmedEmail,
      plan,
      status:           "active",
      onboarding_step:  1,
      notification_email: trimmedEmail,
      created_at:       new Date().toISOString(),
    });

    if (bizError && bizError.code !== "23505") {
      // 23505 = unique-violation (row already created by trigger) - safe to ignore.
      // Any other error: warn but don't block the user from reaching the dashboard.
      console.warn("[signup] businesses insert:", bizError.message);
    }

    // 3. Legacy localStorage + admin tracking (keep for backward compat)
    const business: Business = {
      id: authData.user?.id ?? generateId(),
      name: businessName.trim(),
      ownerName: ownerName.trim(),
      email: trimmedEmail,
      phone,
      address: "",
      googleReviewLink: "",
      brandColor: "#0EA5E9",
      plan,
      forwardingEmail: generateForwardingEmail(businessName),
      smsTemplate:
        "Hi {name}, thanks for visiting {business}! We'd love your feedback. Tap here to leave a quick review: {link}",
      reviewRequestDelay: 24,
      quietHoursStart: 22,
      quietHoursEnd: 8,
      notifyOnNegative: true,
      notifyEmail: trimmedEmail,
      onboardingComplete: false,
      onboardingSteps: [false, false, false, false, false],
      createdAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    saveBusiness(business);
    saveAdminSignup({ businessName, ownerName, email: trimmedEmail, phone, plan, signupTimestamp: new Date().toISOString(), onboardingComplete: false });

    try {
      fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, ownerName, email: trimmedEmail, phone, plan }),
      }).catch(() => {});
    } catch { /* ignore */ }

    router.push("/onboarding");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: OW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 48,
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: N,
                letterSpacing: "-0.5px",
                margin: 0,
              }}
            >
              Vomni
            </h1>
          </div>

          {/* Headline */}
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: N,
              textAlign: "center",
              marginBottom: 12,
              marginTop: 0,
              lineHeight: 1.25,
            }}
          >
            Start Getting More Google Reviews
          </h2>

          {/* Payment confirmed badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,200,150,0.1)", color: "#00A87D", borderRadius: 9999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>
              ✓ Payment confirmed — set up your account below
            </span>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "#DC2626",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Business name */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Business name
              </label>
              <StyledInput
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="King's Cuts Barbershop"
              />
            </div>

            {/* Owner name */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Owner name
              </label>
              <StyledInput
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Marcus Johnson"
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Email
              </label>
              <StyledInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcus@kingcuts.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Phone
              </label>
              <StyledInput
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900123"
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Password
              </label>
              <StyledInput
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 8 chars)"
                minLength={8}
              />
              {/* Strength bar */}
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

            {/* Confirm Password */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Confirm password
              </label>
              <StyledInput
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
              {passwordMismatch && (
                <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444" }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Plan selector */}
            <div style={{ paddingTop: 4 }}>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 12 }}>
                Choose your plan
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Starter */}
                <button type="button" onClick={() => setPlan("starter")} style={{ borderRadius: 12, border: plan === "starter" ? `2px solid ${G}` : `1px solid ${BD}`, background: plan === "starter" ? "rgba(0,200,150,0.05)" : "#fff", padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Starter</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Up to 100 review requests/month</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>£35</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>/mo</span>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>or £299/yr</div>
                    </div>
                  </div>
                </button>

                {/* Growth */}
                <button type="button" onClick={() => setPlan("growth")} style={{ borderRadius: 12, border: plan === "growth" ? `2px solid ${G}` : `1px solid ${BD}`, background: plan === "growth" ? "rgba(0,200,150,0.05)" : "#fff", padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "all 0.15s", position: "relative" }}>
                  <span style={{ position: "absolute", top: -10, right: 10, background: G, color: "#fff", borderRadius: 99, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, padding: "2px 10px" }}>
                    MOST POPULAR
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Growth</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Up to 300 review requests/month, AI insights</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>£79</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>/mo</span>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>or £699/yr</div>
                    </div>
                  </div>
                </button>

                {/* Pro */}
                <button type="button" onClick={() => setPlan("pro")} style={{ borderRadius: 12, border: plan === "pro" ? `2px solid #F5A623` : `1px solid ${BD}`, background: plan === "pro" ? "rgba(245,166,35,0.05)" : "#fff", padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Pro ★</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Up to 3 locations, dedicated SMS number</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>£149</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>/mo</span>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>or £1,499/yr</div>
                    </div>
                  </div>
                </button>

              </div>
            </div>

            {/* Submit */}
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
              onMouseEnter={(e) => {
                if (!submitting && !passwordMismatch) (e.currentTarget as HTMLElement).style.background = "#00A87D";
              }}
              onMouseLeave={(e) => {
                if (!submitting && !passwordMismatch) (e.currentTarget as HTMLElement).style.background = G;
              }}
            >
              {submitting ? "Creating…" : "Create Your Account"}
            </button>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 12 }}>
              By creating an account you agree to our{" "}
              <a href="/terms" style={{ color: G, textDecoration: "none" }}>Terms of Service</a>,{" "}
              <a href="/privacy" style={{ color: G, textDecoration: "none" }}>Privacy Policy</a>{" "}
              and{" "}
              <a href="/acceptable-use" style={{ color: G, textDecoration: "none" }}>Acceptable Use Policy</a>.
            </p>
          </form>

          {/* Sign in link */}
          <p
            style={{
              textAlign: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              color: "#6B7280",
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{ color: G, fontWeight: 600, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#00A87D"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = G; }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
