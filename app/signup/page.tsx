"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<Plan>("monthly");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const business: Business = {
      id: generateId(),
      name: businessName,
      ownerName,
      email,
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
      notifyEmail: email,
      onboardingComplete: false,
      onboardingSteps: [false, false, false, false, false],
      createdAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    saveBusiness(business);

    saveAdminSignup({
      businessName,
      ownerName,
      email,
      phone,
      plan,
      signupTimestamp: new Date().toISOString(),
      onboardingComplete: false,
    });

    try {
      fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, ownerName, email, phone, plan }),
      }).catch(() => {});
    } catch {
      // ignore
    }

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
              marginBottom: 32,
              marginTop: 0,
              lineHeight: 1.25,
            }}
          >
            Start Getting More Google Reviews
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Business name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 8,
                }}
              >
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
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 8,
                }}
              >
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
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 8,
                }}
              >
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
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 8,
                }}
              >
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
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <StyledInput
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                minLength={8}
              />
            </div>

            {/* Plan selector */}
            <div style={{ paddingTop: 4 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: N,
                  marginBottom: 12,
                }}
              >
                Choose your plan
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Monthly */}
                <button
                  type="button"
                  onClick={() => setPlan("monthly")}
                  style={{
                    borderRadius: 12,
                    border: plan === "monthly" ? `2px solid ${G}` : `1px solid ${BD}`,
                    background: plan === "monthly" ? "rgba(0,200,150,0.05)" : "#fff",
                    padding: 16,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: N,
                    }}
                  >
                    Monthly
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: N,
                      marginTop: 4,
                    }}
                  >
                    £70
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 400,
                        color: "#6B7280",
                      }}
                    >
                      /mo
                    </span>
                  </div>
                </button>

                {/* Annual */}
                <button
                  type="button"
                  onClick={() => setPlan("annual")}
                  style={{
                    borderRadius: 12,
                    border: plan === "annual" ? `2px solid ${G}` : `1px solid ${BD}`,
                    background: plan === "annual" ? "rgba(0,200,150,0.05)" : "#fff",
                    padding: 16,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: -11,
                      right: 10,
                      background: G,
                      color: "#fff",
                      borderRadius: 99,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 10px",
                    }}
                  >
                    Save £240
                  </span>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: N,
                    }}
                  >
                    Annual
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: N,
                      marginTop: 4,
                    }}
                  >
                    £600
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 400,
                        color: "#6B7280",
                      }}
                    >
                      /yr
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                marginTop: 8,
                background: submitting ? "#9CA3AF" : G,
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: 16,
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!submitting) (e.currentTarget as HTMLElement).style.background = "#00A87D";
              }}
              onMouseLeave={(e) => {
                if (!submitting) (e.currentTarget as HTMLElement).style.background = G;
              }}
            >
              {submitting ? "Creating..." : "Create Your Account"}
            </button>
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
              href="/dashboard"
              style={{
                color: G,
                fontWeight: 600,
                textDecoration: "none",
              }}
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
