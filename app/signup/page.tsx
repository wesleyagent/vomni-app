"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveBusiness, generateId, generateForwardingEmail, saveAdminSignup } from "@/lib/storage";
import { localeFromCountry } from "@/lib/localeFromCountry";
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

// ── Countries list (ISO 3166-1 alpha-2, alphabetical by name) ────────────────
const COUNTRIES: { code: string; name: string }[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

// ── Searchable country dropdown ───────────────────────────────────────────────
function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const wrapperRef            = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);
  const filtered = query
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          color: selected ? N : "#9CA3AF",
          borderColor: open ? G : BD,
          boxShadow: open ? "0 0 0 3px rgba(0,200,150,0.15)" : "none",
        }}
      >
        <span>{selected ? selected.name : "Search for your country…"}</span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: `1px solid ${BD}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                ...inputStyle,
                padding: "10px 12px",
                fontSize: 13,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = G;
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BD;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          {/* Options list */}
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: "4px 0 8px",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 ? (
              <li
                style={{
                  padding: "10px 16px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#9CA3AF",
                }}
              >
                No countries found
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "9px 16px",
                      textAlign: "left",
                      background: c.code === value ? "rgba(0,200,150,0.08)" : "transparent",
                      border: "none",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: c.code === value ? G : N,
                      fontWeight: c.code === value ? 600 : 400,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (c.code !== value)
                        (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      if (c.code !== value)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
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
  const [isTrial,         setIsTrial]         = useState(false);
  const [businessName,     setBusinessName]     = useState("");
  const [ownerName,        setOwnerName]        = useState("");
  const [email,            setEmail]            = useState("");
  const [phone,            setPhone]            = useState("");
  const [country,          setCountry]          = useState("");
  const [password,         setPassword]         = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [plan,             setPlan]             = useState<Plan>("growth");
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");
  const [waConsent,        setWaConsent]        = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid   = params.get("payment") === "success";
    const trial  = params.get("trial") === "privatetrialisrael";
    setPaymentVerified(paid || trial);
    setIsTrial(trial);
    if (trial) {
      setPlan("pro"); // Trial users get pro access
      setCountry("IL"); // Trial link is Israel-specific
    } else {
      // Pre-select the plan the user chose on the pricing page
      const urlPlan = params.get("plan") as Plan | null;
      if (urlPlan && ["starter", "growth", "pro"].includes(urlPlan)) {
        setPlan(urlPlan);
      }
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

    if (!country) {
      setError("Please select your country.");
      return;
    }
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

    // Resolve locale + currency from selected country
    const { locale, currency } = localeFromCountry(country);

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
    const bizRow: Record<string, unknown> = {
      id:               userId,
      name:             trimmedBizName,
      owner_name:       trimmedOwner,
      owner_email:      trimmedEmail,
      plan,
      status:           "active",
      onboarding_step:  1,
      notification_email: trimmedEmail,
      created_at:       new Date().toISOString(),
      country,
      locale,
      currency,
      whatsapp_marketing_consent: waConsent,
    };
    if (isTrial) {
      bizRow.trial_start_date = new Date().toISOString();
    }
    const { error: bizError } = await supabase.from("businesses").insert(bizRow);

    if (bizError && bizError.code !== "23505") {
      // 23505 = unique-violation (row already created by trigger) - safe to ignore.
      // Any other error: warn but don't block the user from reaching the dashboard.
      console.warn("[signup] businesses insert:", bizError.message);
    }

    // If trial signup, always do a follow-up UPDATE to guarantee trial_start_date is set
    // even if a DB trigger created the row first (causing the insert above to 23505).
    if (isTrial && userId) {
      await supabase
        .from("businesses")
        .update({ trial_start_date: new Date().toISOString(), plan: "pro", country, locale, currency })
        .eq("id", userId);
    }

    // 3. Set the locale cookie so the app immediately renders in the correct locale
    document.cookie = `vomni_locale=${locale}; path=/; max-age=31536000; samesite=lax`;

    // 4. Legacy localStorage + admin tracking (keep for backward compat)
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
        body: JSON.stringify({ businessName, ownerName, email: trimmedEmail, phone, plan, country, locale, currency }),
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

          {/* Payment confirmed / Trial badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,200,150,0.1)", color: "#00A87D", borderRadius: 9999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>
              {isTrial
                ? "✓ 14-day free trial — set up your account below"
                : "✓ Payment confirmed — set up your account below"}
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

            {/* Country — new field */}
            <div>
              <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
                Country
              </label>
              <CountrySelect value={country} onChange={setCountry} />
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

            {/* Plan selector — hidden for trial users (auto-pro) */}
            {isTrial ? (
              <div style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${G}`, background: "rgba(0,200,150,0.05)" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N }}>Pro Plan — 14-day free trial</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Full access to all features. No payment required.</div>
              </div>
            ) : (
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
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>WhatsApp review requests after every visit</div>
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
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Follow-ups, lapsed customer re-engagement, full analytics</div>
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
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 2 }}>Dedicated WhatsApp number, same-day support</div>
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
            )}

            {/* WhatsApp marketing consent — shown only when NEXT_PUBLIC_SHOW_META_LEGAL=true */}
            {process.env.NEXT_PUBLIC_SHOW_META_LEGAL === "true" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="wa-consent"
                  checked={waConsent}
                  onChange={(e) => setWaConsent(e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: G, width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="wa-consent" style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", lineHeight: 1.5, cursor: "pointer" }}>
                  I agree to receive automated notifications and updates via WhatsApp from Vomni. I can opt-out at any time.<br />
                  <span style={{ direction: "rtl", display: "block", marginTop: 2 }}>אני מסכים/ה לקבל עדכונים והתראות אוטומטיות דרך WhatsApp מ-Vomni. ניתן לבטל בכל עת.</span>
                </label>
              </div>
            )}

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
