"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Copy, Check, ChevronRight } from "lucide-react";

const G    = "#00C896";
const N    = "#0A0F1E";
const BD   = "#E5E7EB";
const FWD  = "forwarding@vomni.io";

type EmailProvider = "gmail" | "outlook" | "office365" | "exchange" | "apple" | "other";

const BIZ_TYPES = [
  "Barbershop", "Hair Salon", "Beauty Salon", "Restaurant",
  "Dentist", "Tattoo Studio", "Nail Salon", "Other",
];

// ── Shared UI ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${BD}`, borderRadius: 10,
  padding: "13px 16px", fontFamily: "Inter, sans-serif", fontSize: 14,
  color: N, outline: "none", boxSizing: "border-box", background: "#fff",
};

function SI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function Btn({ children, onClick, disabled, secondary }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; secondary?: boolean }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "14px 28px", borderRadius: 9999, border: "none",
    fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.15s",
    opacity: disabled ? 0.5 : 1,
  };
  const style = secondary
    ? { ...base, background: "#F3F4F6", color: "#374151" }
    : { ...base, background: G, color: "#fff" };
  return (
    <button style={style} onClick={disabled ? undefined : onClick}
      onMouseEnter={e => { if (!disabled && !secondary) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
      onMouseLeave={e => { if (!disabled && !secondary) (e.currentTarget as HTMLElement).style.background = G; }}
    >{children}</button>
  );
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${BD}`, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: copied ? G : "#374151", cursor: "pointer", transition: "all 0.15s" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

function FwdBox() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12, border: `2px solid ${G}`, background: "rgba(0,200,150,0.05)", margin: "16px 0" }}>
      <span style={{ flex: 1, fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: N, letterSpacing: "-0.3px" }}>{FWD}</span>
      <CopyBtn text={FWD} />
    </div>
  );
}

function StepCircle({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  const bg = done ? G : active ? N : "#E5E7EB";
  const col = done || active ? "#fff" : "#9CA3AF";
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {done ? <Check size={14} /> : n}
    </div>
  );
}

// ── SVG Diagrams ──────────────────────────────────────────────────────────

function SvgGmailGear() {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="100" rx="8" fill="white" stroke={BD}/>
      <rect width="360" height="44" rx="8 8 0 0" fill="#F1F3F4"/>
      <text x="14" y="27" fontSize="12" fontWeight="bold" fontFamily="sans-serif" fill="#4285F4">M</text>
      <text x="24" y="27" fontSize="11" fontFamily="sans-serif" fill="#5F6368">Gmail</text>
      <rect x="72" y="12" width="180" height="20" rx="10" fill="#E8F0FE"/>
      <text x="162" y="25" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill="#9AA0A6">Search mail</text>
      <circle cx="334" cy="22" r="16" fill="rgba(0,200,150,0.15)" stroke={G} strokeWidth="2"/>
      <circle cx="334" cy="22" r="6" fill="none" stroke={G} strokeWidth="1.5"/>
      <circle cx="334" cy="22" r="2.5" fill={G}/>
      <text x="280" y="18" fontSize="9" fontFamily="sans-serif" fill={G} fontWeight="600">click here →</text>
      <rect x="14" y="56" width="44" height="8" rx="3" fill="#F1F3F4"/>
      <rect x="66" y="56" width="200" height="8" rx="3" fill="#F1F3F4"/>
      <rect x="14" y="74" width="44" height="8" rx="3" fill="#F1F3F4"/>
      <rect x="66" y="74" width="160" height="8" rx="3" fill="#F1F3F4"/>
    </svg>
  );
}

function SvgGmailTab() {
  return (
    <svg viewBox="0 0 360 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="90" rx="8" fill="white" stroke={BD}/>
      <text x="14" y="28" fontSize="14" fontWeight="bold" fontFamily="sans-serif" fill={N}>Settings</text>
      <line x1="0" y1="38" x2="360" y2="38" stroke={BD}/>
      <text x="10" y="56" fontSize="9" fontFamily="sans-serif" fill="#5F6368">General</text>
      <text x="60" y="56" fontSize="9" fontFamily="sans-serif" fill="#5F6368">Labels</text>
      <text x="100" y="56" fontSize="9" fontFamily="sans-serif" fill="#5F6368">Inbox</text>
      <rect x="140" y="40" width="118" height="22" rx="4" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5"/>
      <text x="199" y="55" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fill={G} fontWeight="700">Forwarding &amp; POP/IMAP</text>
      <text x="270" y="56" fontSize="9" fontFamily="sans-serif" fill="#5F6368">Add-ons</text>
      <line x1="0" y1="64" x2="360" y2="64" stroke={BD}/>
      <rect x="14" y="72" width="200" height="8" rx="3" fill="#F1F3F4"/>
    </svg>
  );
}

function SvgGmailAddBtn() {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="100" rx="8" fill="white" stroke={BD}/>
      <text x="14" y="26" fontSize="11" fontFamily="sans-serif" fill="#5F6368">Forwarding</text>
      <rect x="14" y="36" width="320" height="1" fill={BD}/>
      <text x="14" y="56" fontSize="10" fontFamily="sans-serif" fill="#5F6368">Add a forwarding address to automatically forward</text>
      <text x="14" y="69" fontSize="10" fontFamily="sans-serif" fill="#5F6368">your mail to another email account.</text>
      <rect x="14" y="78" width="160" height="16" rx="8" fill={G}/>
      <text x="94" y="89" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill="white" fontWeight="600">Add a forwarding address</text>
    </svg>
  );
}

function SvgGmailRadio() {
  return (
    <svg viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="110" rx="8" fill="white" stroke={BD}/>
      <circle cx="20" cy="28" r="6" fill="none" stroke={G} strokeWidth="2"/>
      <circle cx="20" cy="28" r="3" fill={G}/>
      <text x="32" y="32" fontSize="10" fontFamily="sans-serif" fill={N}>Forward a copy of incoming mail to</text>
      <rect x="14" y="42" width="200" height="20" rx="4" fill={`rgba(0,200,150,0.08)`} stroke={G} strokeWidth="1.5"/>
      <text x="114" y="55" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill={G} fontWeight="600">{FWD}</text>
      <circle cx="20" cy="80" r="6" fill="none" stroke={BD} strokeWidth="2"/>
      <text x="32" y="84" fontSize="10" fontFamily="sans-serif" fill="#9CA3AF">Keep Gmail&apos;s copy in the Inbox</text>
      <rect x="14" y="95" width="80" height="12" rx="6" fill={G}/>
      <text x="54" y="104" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fill="white" fontWeight="600">Save Changes</text>
    </svg>
  );
}

function SvgOutlookGear() {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="100" rx="8" fill="white" stroke={BD}/>
      <rect width="360" height="44" rx="8 8 0 0" fill="#0072C6"/>
      <text x="14" y="27" fontSize="13" fontWeight="bold" fontFamily="sans-serif" fill="white">Outlook</text>
      <rect x="100" y="12" width="200" height="20" rx="10" fill="rgba(255,255,255,0.2)"/>
      <text x="200" y="25" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill="rgba(255,255,255,0.7)">Search</text>
      <circle cx="334" cy="22" r="16" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
      <circle cx="334" cy="22" r="6" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="334" cy="22" r="2.5" fill="white"/>
      <text x="276" y="18" fontSize="9" fontFamily="sans-serif" fill="rgba(255,255,255,0.9)" fontWeight="600">Settings →</text>
      <rect x="14" y="56" width="44" height="8" rx="3" fill="#F1F3F4"/>
      <rect x="66" y="56" width="200" height="8" rx="3" fill="#F1F3F4"/>
      <rect x="14" y="74" width="44" height="8" rx="3" fill="#F1F3F4"/>
    </svg>
  );
}

function SvgOutlookToggle() {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="100" rx="8" fill="white" stroke={BD}/>
      <text x="14" y="26" fontSize="13" fontWeight="600" fontFamily="sans-serif" fill={N}>Forwarding</text>
      <line x1="14" y1="34" x2="346" y2="34" stroke={BD}/>
      <text x="14" y="54" fontSize="11" fontFamily="sans-serif" fill="#374151">Enable forwarding</text>
      <rect x="280" y="42" width="48" height="24" rx="12" fill={G}/>
      <circle cx="316" cy="54" r="9" fill="white"/>
      <text x="14" y="74" fontSize="10" fontFamily="sans-serif" fill="#5F6368">Forward to:</text>
      <rect x="14" y="80" width="220" height="16" rx="4" fill={`rgba(0,200,150,0.08)`} stroke={G} strokeWidth="1.5"/>
      <text x="124" y="91" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill={G} fontWeight="600">{FWD}</text>
    </svg>
  );
}

function SvgAppleMail() {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, display: "block" }}>
      <rect width="360" height="100" rx="8" fill="white" stroke={BD}/>
      <rect width="360" height="28" rx="8 8 0 0" fill="#F7F7F7" stroke={BD}/>
      <text x="40" y="18" fontSize="11" fontFamily="sans-serif" fill="#374151">Mail</text>
      <text x="90" y="18" fontSize="11" fontFamily="sans-serif" fill="#374151">File</text>
      <text x="134" y="18" fontSize="11" fontFamily="sans-serif" fill="#374151">Edit</text>
      <rect x="26" y="7" width="36" height="16" rx="4" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5"/>
      <text x="44" y="18" textAnchor="middle" fontSize="11" fontFamily="sans-serif" fill={G} fontWeight="700">Mail</text>
      <line x1="0" y1="28" x2="360" y2="28" stroke={BD}/>
      <rect x="60" y="38" width="240" height="52" rx="6" fill="white" stroke={BD}/>
      <text x="180" y="56" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill="#5F6368">Preferences</text>
      <rect x="80" y="62" width="200" height="1" fill={BD}/>
      <text x="180" y="78" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill={G} fontWeight="600">Accounts</text>
    </svg>
  );
}

// ── Provider Instructions ─────────────────────────────────────────────────

function InstructionStep({ n, text, diagram }: { n: number; text: string; diagram?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{n}</div>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.6, paddingTop: 4 }} dangerouslySetInnerHTML={{ __html: text }} />
      </div>
      {diagram && <div style={{ marginTop: 12, marginLeft: 40, borderRadius: 10, overflow: "hidden", border: `1px solid ${BD}` }}>{diagram}</div>}
    </div>
  );
}

function GmailInstructions() {
  return (
    <div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Important:</strong> Only forward your booking confirmation emails — not all your emails. Use a Gmail filter (steps 1–4 below) so only booking emails reach Vomni.
        </p>
      </div>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: N, margin: "0 0 12px" }}>Part A — Add Vomni as a forwarding address</p>
      <InstructionStep n={1} text="Open Gmail and click the <strong>Settings gear icon</strong> in the top right corner." diagram={<SvgGmailGear />} />
      <InstructionStep n={2} text='Click <strong>"See all settings"</strong> in the dropdown that appears.' />
      <InstructionStep n={3} text='Click the <strong>"Forwarding and POP/IMAP"</strong> tab.' diagram={<SvgGmailTab />} />
      <InstructionStep n={4} text='Click <strong>"Add a forwarding address"</strong>.' diagram={<SvgGmailAddBtn />} />
      <InstructionStep n={5} text={`Enter <strong>${FWD}</strong> and click <strong>Next</strong>. Gmail will send a confirmation email.`} />
      <div style={{ margin: "4px 0 16px 40px" }}><FwdBox /></div>
      <InstructionStep n={6} text='Check your inbox for a confirmation email from Gmail and click the <strong>Confirm</strong> link. Then click <strong>Save Changes</strong>.' diagram={<SvgGmailRadio />} />

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: N, margin: "28px 0 12px" }}>Part B — Create a filter for booking emails only</p>
      <InstructionStep n={7} text='In Gmail, click the <strong>search bar</strong> at the top and then click the <strong>filter icon</strong> (the small triangle on the right of the search bar) to open advanced search.' />
      <InstructionStep n={8} text='In the <strong>"From"</strong> field, enter the email address or domain your booking system sends from — for example <strong>fresha.com</strong>, <strong>treatwell.co.uk</strong>, or <strong>booksy.com</strong>. Or use the <strong>"Subject"</strong> field and enter: <em>booking OR appointment OR confirmation OR reservation</em>' />
      <InstructionStep n={9} text='Click <strong>"Create filter"</strong> at the bottom right of the search panel.' />
      <InstructionStep n={10} text={`Check <strong>"Forward it to"</strong> and select <strong>${FWD}</strong> from the dropdown. Then click <strong>"Create filter"</strong>.`} />
      <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "#F9FAFB", border: `1px solid ${BD}` }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          <strong>Not sure which address to filter by?</strong> Open a recent booking confirmation email, click the sender name to see the full address, and use that email address or its domain in the "From" field.
        </p>
      </div>
    </div>
  );
}

function OutlookInstructions() {
  return (
    <div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Important:</strong> Only forward your booking confirmation emails — not all your emails. Use an Outlook rule with conditions (steps below) so only booking emails reach Vomni.
        </p>
      </div>
      <InstructionStep n={1} text="Open Outlook and click the <strong>Settings gear icon</strong> in the top right." diagram={<SvgOutlookGear />} />
      <InstructionStep n={2} text='Click <strong>"View all Outlook settings"</strong> at the bottom of the panel.' />
      <InstructionStep n={3} text='Go to <strong>Mail → Rules</strong> and click <strong>"Add new rule"</strong>.' />
      <InstructionStep n={4} text='Give the rule a name like <strong>"Forward booking emails to Vomni"</strong>.' />
      <InstructionStep n={5} text='Under <strong>"Add a condition"</strong>, select <strong>"From"</strong> and enter the email address or domain your booking system sends from — for example <em>fresha.com</em>, <em>treatwell.co.uk</em>, or <em>booksy.com</em>. Alternatively select <strong>"Subject includes"</strong> and enter: <em>booking, appointment, confirmation</em>' />
      <InstructionStep n={6} text='Under <strong>"Add an action"</strong>, select <strong>"Forward to"</strong> and enter the address below.' diagram={<SvgOutlookToggle />} />
      <div style={{ margin: "4px 0 16px 40px" }}><FwdBox /></div>
      <InstructionStep n={7} text='Click <strong>Save</strong>.' />
      <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "#F9FAFB", border: `1px solid ${BD}` }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          <strong>Tip:</strong> Open a recent booking confirmation email in Outlook, hover over the sender name to see the full email address, and use that or its domain as your filter condition.
        </p>
      </div>
    </div>
  );
}

function Office365Instructions() {
  return (
    <div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Important:</strong> Only forward your booking confirmation emails — not all your emails. Use a rule with conditions so only booking emails reach Vomni.
        </p>
      </div>
      <InstructionStep n={1} text='Sign in at <strong>outlook.office.com</strong>' />
      <InstructionStep n={2} text="Click the <strong>Settings gear icon</strong> in the top right." />
      <InstructionStep n={3} text='Click <strong>"View all Outlook settings"</strong> at the bottom of the panel.' />
      <InstructionStep n={4} text='Go to <strong>Mail → Rules</strong> and click <strong>"Add new rule"</strong>.' />
      <InstructionStep n={5} text='Name it <strong>"Forward booking emails to Vomni"</strong>.' />
      <InstructionStep n={6} text='Under <strong>"Add a condition"</strong>, choose <strong>"From"</strong> and enter your booking system&apos;s sender domain (e.g. <em>fresha.com</em>, <em>treatwell.co.uk</em>, <em>booksy.com</em>). Or choose <strong>"Subject includes"</strong> and enter: <em>booking, appointment, confirmation</em>' />
      <InstructionStep n={7} text='Under <strong>"Add an action"</strong>, choose <strong>"Forward to"</strong> and enter the address below.' />
      <div style={{ margin: "4px 0 16px 40px" }}><FwdBox /></div>
      <InstructionStep n={8} text='Click <strong>Save</strong>.' />
      <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "#F9FAFB", border: `1px solid ${BD}` }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          <strong>Tip:</strong> Open a recent booking confirmation email, hover the sender name to reveal the full address, and use that as your "From" condition.
        </p>
      </div>
    </div>
  );
}

function ExchangeInstructions() {
  return (
    <div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 12 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Important:</strong> Only forward your booking confirmation emails — not all your emails. Use an inbox rule with a specific condition so only booking emails reach Vomni.
        </p>
      </div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#FFF7ED", border: "1px solid #FED7AA", marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#92400E" }}>
          <strong>Note:</strong> Exchange forwarding is sometimes managed by your IT administrator. If these steps don&apos;t work, forward this page to your IT team using the message below.
        </p>
      </div>
      <InstructionStep n={1} text="Log in to <strong>Outlook Web App</strong>." />
      <InstructionStep n={2} text='Click the <strong>Settings gear</strong> and select <strong>"Options"</strong>.' />
      <InstructionStep n={3} text='Go to <strong>Organise Email → Inbox Rules</strong>.' />
      <InstructionStep n={4} text='Click the <strong>+ icon</strong> to create a new rule.' />
      <InstructionStep n={5} text='Set the condition to <strong>"It was received from"</strong> and enter your booking system&apos;s sender domain (e.g. <em>fresha.com</em>, <em>treatwell.co.uk</em>). Or use <strong>"Subject contains"</strong> and enter: <em>booking, appointment, confirmation</em>. <em>Avoid "Apply to all messages" — only forward booking emails.</em>' />
      <InstructionStep n={6} text='Set the action to <strong>"Forward to"</strong> and enter the address below.' />
      <div style={{ margin: "4px 0 16px 40px" }}><FwdBox /></div>
      <InstructionStep n={7} text='Click <strong>Save</strong>.' />
      <div style={{ marginTop: 24 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>IT team message (tap to copy):</p>
        <div style={{ position: "relative", padding: "14px 48px 14px 16px", borderRadius: 10, border: `1px solid ${BD}`, background: "#F9FAFB", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          Hi - please set up an inbox rule on my account to forward emails from our booking system (e.g. fresha.com / treatwell.co.uk) to <strong>{FWD}</strong> while keeping a copy in my inbox. This is for a review management service — only booking confirmation emails should be forwarded, not all mail. Thank you.
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <CopyBtn text={`Hi - please set up an inbox rule on my account to forward emails from our booking system to ${FWD} while keeping a copy in my inbox. This is for a review management service — only booking confirmation emails should be forwarded, not all mail. Thank you.`} />
          </span>
        </div>
      </div>
    </div>
  );
}

function AppleMailInstructions() {
  return (
    <div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 12 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Important:</strong> Only forward your booking confirmation emails — not all your emails. Use a rule with a specific sender or subject condition so only booking emails reach Vomni.
        </p>
      </div>
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1E40AF" }}>
          <strong>Using iCloud email?</strong> Skip to the iCloud section below — iCloud uses a web-based rule system instead.
        </p>
      </div>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: N, margin: "0 0 12px" }}>Mac Mail app (non-iCloud accounts):</p>
      <InstructionStep n={1} text='Open the <strong>Mail app</strong> on your Mac. Click <strong>Mail</strong> in the top menu bar, then <strong>Preferences</strong>.' diagram={<SvgAppleMail />} />
      <InstructionStep n={2} text='Click the <strong>Rules</strong> tab, then click <strong>"Add Rule"</strong>.' />
      <InstructionStep n={3} text='Give the rule a name like <strong>"Forward booking emails to Vomni"</strong>.' />
      <InstructionStep n={4} text='Set the condition to <strong>"From"</strong> and enter your booking system&apos;s sender domain (e.g. <em>fresha.com</em>, <em>treatwell.co.uk</em>). Or set condition to <strong>"Subject"</strong> <strong>"Contains"</strong> and enter: <em>booking</em>' />
      <InstructionStep n={5} text={`Set the action to <strong>"Forward Message"</strong> and enter <strong>${FWD}</strong>.`} />
      <div style={{ margin: "4px 0 16px 40px" }}><FwdBox /></div>
      <InstructionStep n={6} text='Click <strong>OK</strong> and then <strong>"Apply"</strong> when prompted.' />

      <div style={{ margin: "24px 0 16px 0", padding: "16px", borderRadius: 10, border: `1px solid ${BD}`, background: "#F9FAFB" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 12 }}>For iCloud email (@icloud.com):</p>
        <InstructionStep n={7} text='Go to <strong>icloud.com/mail</strong> → click the <strong>Settings gear icon</strong> → <strong>Rules</strong> → <strong>Add a Rule</strong>.' />
        <InstructionStep n={8} text='Set condition to <strong>"From"</strong> and enter your booking system&apos;s sender domain (e.g. <em>fresha.com</em>). Or set <strong>"Subject"</strong> and enter <em>booking</em>. <em>Avoid "Every Message" — only forward booking emails.</em>' />
        <InstructionStep n={9} text='Set action to <strong>"Forward to"</strong> the address below.' />
        <div style={{ marginLeft: 40 }}><FwdBox /></div>
        <InstructionStep n={10} text='Click <strong>Done</strong>.' />
      </div>
    </div>
  );
}

function OtherInstructions() {
  return (
    <div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", marginBottom: 20, lineHeight: 1.6 }}>
        Not sure which email provider you use? Answer these questions:
      </p>
      {[
        ["Does your email end in @gmail.com?", "Select Gmail above"],
        ["Does your email end in @outlook.com or @hotmail.com?", "Select Outlook above"],
        ["Does your email end in your company name?", "Probably Office 365 or Exchange - try Office 365 above"],
      ].map(([q, a], i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16, padding: "14px 16px", borderRadius: 10, border: `1px solid ${BD}`, background: "#F9FAFB" }}>
          <ChevronRight size={16} style={{ color: G, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, fontWeight: 500 }}>{q}</p>
            <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: G, fontWeight: 600 }}>→ {a}</p>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, border: `1px solid ${BD}`, background: "#fff" }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          <strong>Still not sure?</strong><br/>
          Email us at <a href="mailto:support@vomni.io" style={{ color: G, fontWeight: 600 }}>support@vomni.io</a> and we&apos;ll send you personalised setup instructions within 1 hour.
        </p>
      </div>
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────

function Step1Welcome({ firstName, onNext, saving }: { firstName: string; onNext: () => void; saving: boolean }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto", paddingTop: 40 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(0,200,150,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
        <span style={{ fontSize: 32 }}>👋</span>
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 34, fontWeight: 800, color: N, margin: "0 0 16px", lineHeight: 1.2, letterSpacing: "-0.5px" }}>
        Welcome to Vomni, {firstName}
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "#6B7280", margin: "0 0 48px", lineHeight: 1.6 }}>
        Let&apos;s get you set up in 5 minutes.<br />You&apos;ll never need to touch this again.
      </p>
      <Btn onClick={onNext} disabled={saving}>
        {saving ? "Loading…" : "Let's go →"}
      </Btn>
    </div>
  );
}

function Step2Business({
  bizName, setBizName,
  bizType, setBizType,
  googleLink, setGoogleLink,
  notifEmail, setNotifEmail,
  googleError,
  initialRating, setInitialRating,
  reviewCount, setReviewCount,
  onNext, saving,
}: {
  bizName: string; setBizName: (v: string) => void;
  bizType: string; setBizType: (v: string) => void;
  googleLink: string; setGoogleLink: (v: string) => void;
  notifEmail: string; setNotifEmail: (v: string) => void;
  googleError: string;
  initialRating: string; setInitialRating: (v: string) => void;
  reviewCount: string; setReviewCount: (v: string) => void;
  onNext: () => void; saving: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <StepCircle n={2} active={true} done={false} />
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: 0 }}>Your business details</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Step 2 of 7</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>Business name</label>
          <SI type="text" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="King's Cuts" />
        </div>

        <div>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>Type of business</label>
          <select
            value={bizType}
            onChange={e => setBizType(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
            onFocus={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,200,150,0.15)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = "none"; }}
          >
            <option value="">Select your business type</option>
            {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>Google review link</label>
          <SI
            type="url"
            value={googleLink}
            onChange={e => setGoogleLink(e.target.value)}
            placeholder="https://g.page/r/..."
          />
          <div style={{ marginTop: 10, borderRadius: 12, border: `1px solid ${BD}`, overflow: "hidden" }}>
            {/* Method 1 — recommended */}
            <div style={{ padding: "14px 16px", background: "rgba(0,200,150,0.05)", borderBottom: `1px solid ${BD}` }}>
              <p style={{ margin: "0 0 10px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: N }}>
                ✅ Easiest way — Google Business Profile
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                <li>Go to <a href="https://business.google.com" target="_blank" rel="noreferrer" style={{ color: G, fontWeight: 600 }}>business.google.com</a> and sign in</li>
                <li>Select your business (if you manage more than one)</li>
                <li>On the Home tab, find the <strong>&ldquo;Get more reviews&rdquo;</strong> card</li>
                <li>Click <strong>&ldquo;Share review form&rdquo;</strong> or <strong>&ldquo;Ask for reviews&rdquo;</strong></li>
                <li>Copy the short link that appears and paste it above</li>
              </ol>
            </div>
            {/* Method 2 — via Google Search */}
            <div style={{ padding: "14px 16px", background: "#F9FAFB" }}>
              <p style={{ margin: "0 0 10px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: N }}>
                🔍 Alternative — Google Search
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                <li>Search for your exact business name on Google</li>
                <li>Find your business panel on the right (or top on mobile)</li>
                <li>Click the <strong>star rating</strong> or <strong>&ldquo;reviews&rdquo;</strong> link in the panel</li>
                <li>Copy the URL from your browser&apos;s address bar and paste it above</li>
              </ol>
            </div>
          </div>
          <p style={{ margin: "8px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF" }}>
            Still can&apos;t find it? Email us at <a href="mailto:support@vomni.io" style={{ color: G }}>support@vomni.io</a> and we&apos;ll find it for you.
          </p>
          {googleError && <p style={{ margin: "8px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#EF4444" }}>{googleError}</p>}
        </div>

        <div>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>Notification email</label>
          <SI type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="you@example.com" />
          <p style={{ margin: "6px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF" }}>
            We&apos;ll send an alert here whenever a customer leaves negative feedback.
          </p>
        </div>

        {/* Google Rating fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
              Current Google star rating <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <SI
              type="number"
              min="1" max="5" step="0.1"
              value={initialRating}
              onChange={e => setInitialRating(e.target.value)}
              placeholder="4.3"
            />
            <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF" }}>1.0 – 5.0</p>
          </div>
          <div>
            <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, marginBottom: 8 }}>
              Total Google reviews
            </label>
            <SI
              type="number"
              min="0" step="1"
              value={reviewCount}
              onChange={e => setReviewCount(e.target.value)}
              placeholder="47"
            />
            <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF" }}>How many you have now</p>
          </div>
        </div>

        <Btn onClick={onNext} disabled={saving || !bizName || !googleLink || !initialRating}>
          {saving ? "Saving…" : "Continue →"}
        </Btn>
      </div>
    </div>
  );
}

const PROVIDERS: { id: EmailProvider; label: string; icon: string }[] = [
  { id: "gmail",    label: "Gmail",          icon: "📧" },
  { id: "outlook",  label: "Outlook",        icon: "🔵" },
  { id: "office365",label: "Office 365",     icon: "🏢" },
  { id: "exchange", label: "Exchange",       icon: "🖥" },
  { id: "apple",    label: "Apple Mail",     icon: "🍎" },
  { id: "other",    label: "Other / Not sure", icon: "❓" },
];

function Step3GDPR({ onNext, saving }: { onNext: () => void; saving: boolean }) {
  const [ticked, setTicked] = useState([false, false, false]);
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltip, setTooltip] = useState<number | null>(null);

  const allTicked = ticked.every(Boolean);

  function toggle(i: number) {
    setTicked(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  function handleContinue() {
    if (!allTicked) { setAttempted(true); return; }
    onNext();
  }

  const suggestedWording = "After your visit you may receive a short text message asking for feedback on your experience. Reply STOP at any time to opt out.";

  const items = [
    {
      label: "I'll add a note to my booking confirmations",
      desc: "Let your customers know they might receive a text from us after their appointment asking how it went.",
      tooltip: "This just means your customers won't be surprised when they hear from us. It keeps everything transparent and builds trust.",
      hasCopyBox: true,
    },
    {
      label: "I'll let Vomni know if a customer asks to be removed",
      desc: "If a customer ever asks you to delete their details, just forward their request to hello@vomni.io and we'll handle it within 24 hours.",
      tooltip: "Occasionally a customer might ask a business to delete their personal information. If that happens just email us and we take care of everything. You never need to worry about the technical side.",
      hasCopyBox: false,
    },
    {
      label: "I've read and agree to Vomni's terms and privacy policy",
      desc: null,
      tooltip: "Standard stuff. We've tried to write them like humans, not lawyers.",
      hasCopyBox: false,
    },
  ];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: N, marginBottom: 8 }}>
        A couple of quick things before we set up
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
        Just three simple steps that help everything run smoothly. Takes 30 seconds.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${ticked[i] ? G : BD}`, borderRadius: 16, padding: "20px 24px", transition: "border-color 0.2s", boxShadow: ticked[i] ? `0 0 0 3px rgba(0,200,150,0.12)` : "none" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <button
                onClick={() => toggle(i)}
                style={{
                  width: 22, height: 22, borderRadius: 6, border: `2px solid ${ticked[i] ? G : BD}`,
                  background: ticked[i] ? G : "#fff", flexShrink: 0, marginTop: 1,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {ticked[i] && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: N, cursor: "pointer" }} onClick={() => toggle(i)}>
                    {item.label}
                  </span>
                  <div style={{ position: "relative" }}>
                    <button
                      onMouseEnter={() => setTooltip(i)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#9CA3AF" strokeWidth="1.5"/>
                        <text x="8" y="12" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#9CA3AF" fontFamily="Inter, sans-serif">?</text>
                      </svg>
                    </button>
                    {tooltip === i && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                        background: "#fff", borderRadius: 10, padding: "10px 14px", width: 240,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100,
                        fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.5,
                        border: "1px solid #E5E7EB", transform: "translateX(-50%)",
                      }}>
                        {item.tooltip}
                        <div style={{ position: "absolute", bottom: -5, left: "50%", width: 10, height: 10, background: "#fff", border: "1px solid #E5E7EB", borderTop: "none", borderLeft: "none", transform: "translateX(-50%) rotate(45deg)" }} />
                      </div>
                    )}
                  </div>
                </div>
                {item.desc && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                )}
                {i === 2 && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>
                    You can read them here anytime - they&apos;re written in plain English, no jargon.{" "}
                    <a href="/terms" target="_blank" style={{ color: G, textDecoration: "none", fontWeight: 500 }}>Read our terms</a>
                    {" · "}
                    <a href="/privacy" target="_blank" style={{ color: G, textDecoration: "none", fontWeight: 500 }}>Privacy policy</a>
                    {" · "}
                    <a href="/dpa" target="_blank" style={{ color: G, textDecoration: "none", fontWeight: 500 }}>DPA</a>
                    {" · "}
                    <a href="/acceptable-use" target="_blank" style={{ color: G, textDecoration: "none", fontWeight: 500 }}>Acceptable use</a>
                  </p>
                )}
                {item.hasCopyBox && (
                  <div style={{ marginTop: 12, background: "#F7F8FA", borderRadius: 10, padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {suggestedWording}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(suggestedWording);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 6, border: `1px solid ${BD}`,
                        background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12,
                        fontWeight: 500, color: copied ? G : "#374151", cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {copied ? (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="4" width="8" height="8" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/><path d="M2 9V2h7" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      )}
                      {copied ? "Copied!" : "Copy suggested wording"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {attempted && !allTicked && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#F59E0B", marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#F59E0B" strokeWidth="1.5"/><path d="M8 5v3" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.75" fill="#F59E0B"/></svg>
          Just tick all three and you&apos;re good to go - it only takes a second
        </p>
      )}

      <div style={{ marginTop: 28 }}>
        <Btn onClick={handleContinue} disabled={saving}>
          {allTicked ? "All done - let's set up your account" : "Continue"} <ChevronRight size={16} />
        </Btn>
      </div>
    </div>
  );
}

// ── Step 4: Booking Setup (replaces email forwarding) ────────────────────────

function Step4BookingSetup({
  bizId, onComplete, saving,
}: {
  bizId: string; onComplete: (slug: string) => void; saving: boolean;
}) {
  const [hours, setHours] = useState([
    { day: 0, open: true,  from: "09:00", to: "18:00" },
    { day: 1, open: true,  from: "09:00", to: "18:00" },
    { day: 2, open: true,  from: "09:00", to: "18:00" },
    { day: 3, open: true,  from: "09:00", to: "18:00" },
    { day: 4, open: true,  from: "09:00", to: "18:00" },
    { day: 5, open: true,  from: "09:00", to: "14:00" },
    { day: 6, open: false, from: "09:00", to: "18:00" },
  ]);
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState("");
  const [slug, setSlug] = useState("");
  const [localSaving, setLocalSaving] = useState(false);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  async function handleComplete() {
    if (!svcName || !slug) return;
    setLocalSaving(true);

    const supabase = (await import("@/lib/db")).db;

    // Resolve slug — check for collisions, append -2, -3 etc. if taken
    const baseSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    let finalSlug = baseSlug;
    let attempt = 1;
    while (true) {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("booking_slug", finalSlug)
        .neq("id", bizId)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      finalSlug = `${baseSlug}-${attempt}`;
    }

    // Save business hours
    await supabase.from("business_hours").delete().eq("business_id", bizId);
    await supabase.from("business_hours").insert(
      hours.map(h => ({ business_id: bizId, day_of_week: h.day, is_open: h.open, open_time: h.from, close_time: h.to }))
    );

    // Create first service
    await supabase.from("services").insert({
      business_id: bizId, name: svcName, duration_minutes: svcDuration,
      price: svcPrice ? parseFloat(svcPrice) : null, is_active: true, display_order: 0,
    });

    // Set slug and enable booking
    await supabase.from("businesses").update({
      booking_slug: finalSlug,
      booking_enabled: true,
    }).eq("id", bizId);

    setLocalSaving(false);
    onComplete(finalSlug);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <StepCircle n={4} active={true} done={false} />
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: 0 }}>Set up your booking page</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Step 4 of 7 — customers can start booking directly</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 32 }}>
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(0,200,150,0.06)", border: `1px solid rgba(0,200,150,0.2)`, marginBottom: 24 }}>
          <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: N, lineHeight: 1.6 }}>
            <strong>You&apos;re almost live!</strong> Set up your booking page and customers can start booking appointments directly — no more phone calls. Review requests will be sent automatically after each appointment.
          </p>
        </div>

        {/* Business Hours */}
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 12px" }}>Business Hours</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {hours.map((h, i) => (
            <div key={h.day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, width: 110, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: N }}>
                <input type="checkbox" checked={h.open} onChange={e => { const next = [...hours]; next[i].open = e.target.checked; setHours(next); }} style={{ accentColor: G }} />
                {dayNames[h.day]}
              </label>
              {h.open ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="time" value={h.from} onChange={e => { const next = [...hours]; next[i].from = e.target.value; setHours(next); }} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${BD}`, fontSize: 13 }} />
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>to</span>
                  <input type="time" value={h.to} onChange={e => { const next = [...hours]; next[i].to = e.target.value; setHours(next); }} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${BD}`, fontSize: 13 }} />
                </div>
              ) : <span style={{ fontSize: 13, color: "#9CA3AF" }}>Closed</span>}
            </div>
          ))}
        </div>

        {/* First Service */}
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 12px" }}>Your First Service</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="e.g. Haircut" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BD}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
          <select value={svcDuration} onChange={e => setSvcDuration(Number(e.target.value))} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BD}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}>
            {[15, 20, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
          </select>
          <input value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="Price (optional)" type="number" style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BD}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }} />
        </div>

        {/* Booking URL */}
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, margin: "0 0 12px" }}>Booking Page URL</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF" }}>vomni.io/book/</span>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="your-business"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${BD}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}
          />
        </div>

        <button
          onClick={handleComplete}
          disabled={!svcName || !slug || localSaving || saving}
          style={{
            width: "100%", padding: "16px 24px", borderRadius: 9999,
            background: (!svcName || !slug) ? "#D1D5DB" : G,
            color: "#fff", border: "none",
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700,
            cursor: (!svcName || !slug) ? "default" : "pointer",
          }}
        >
          {localSaving ? "Setting up..." : "Enable Booking Page & Continue"}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 Legacy: Email Forwarding (kept for reference) ──────────────────────

function Step4Forwarding({
  selectedProvider, setSelectedProvider,
  onComplete, saving,
}: {
  selectedProvider: EmailProvider | null;
  setSelectedProvider: (p: EmailProvider) => void;
  onComplete: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <StepCircle n={4} active={true} done={false} />
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: 0 }}>Set up email forwarding</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Step 4 of 7 - This is the most important step</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 32 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#374151", marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
          Forward your <strong>booking confirmation emails</strong> to Vomni so we can automatically send review requests to your customers. We only need booking emails — not all your mail.
        </p>
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 16 }}>
          <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
            <strong>Only forward booking emails.</strong> The instructions below show you how to set up a filter so only your booking system's confirmation emails are forwarded — not everything in your inbox.
          </p>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", marginBottom: 12, lineHeight: 1.5 }}>Your Vomni forwarding address:</p>
        <FwdBox />

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N, margin: "28px 0 16px" }}>
          Which email app do you use?
        </p>

        {/* Provider grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id as EmailProvider)}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: selectedProvider === p.id ? `2px solid ${G}` : `1px solid ${BD}`,
                background: selectedProvider === p.id ? `rgba(0,200,150,0.05)` : "#fff",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", transition: "all 0.15s",
                fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: N,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              {p.label}
              {selectedProvider === p.id && <Check size={15} style={{ color: G, marginLeft: "auto" }} />}
            </button>
          ))}
        </div>

        {/* Provider instructions */}
        {selectedProvider && (
          <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 28 }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginTop: 0, marginBottom: 24 }}>
              {PROVIDERS.find(p => p.id === selectedProvider)?.label} - Step by step
            </h3>
            {selectedProvider === "gmail"     && <GmailInstructions />}
            {selectedProvider === "outlook"   && <OutlookInstructions />}
            {selectedProvider === "office365" && <Office365Instructions />}
            {selectedProvider === "exchange"  && <ExchangeInstructions />}
            {selectedProvider === "apple"     && <AppleMailInstructions />}
            {selectedProvider === "other"     && <OtherInstructions />}
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${BD}` }}>
          <Btn onClick={onComplete} disabled={saving}>
            {saving ? "Saving…" : "I have set up email forwarding ✓"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Step5Booking({
  businessId,
  bookingReceived,
  timedOut,
  onSkip,
  saving,
}: {
  businessId: string;
  bookingReceived: boolean;
  timedOut: boolean;
  onSkip: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <StepCircle n={5} active={true} done={bookingReceived} />
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: 0 }}>Send a test booking</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Step 5 of 7</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 32 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#374151", marginTop: 0, lineHeight: 1.6 }}>
          Forward one of your recent booking confirmation emails to:
        </p>
        <FwdBox />
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", marginBottom: 28, lineHeight: 1.6 }}>
          We&apos;ll confirm when we receive it. This verifies your forwarding is working correctly.
        </p>

        {!bookingReceived && !timedOut && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 12, border: `1px solid ${BD}`, background: "#F9FAFB" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FCD34D", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
            <style>{`@keyframes pulse { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.5; transform:scale(1.3); } }`}</style>
            <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", fontWeight: 500 }}>
              Waiting for your first booking email…
            </p>
          </div>
        )}

        {bookingReceived && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 12, border: `1px solid rgba(0,200,150,0.3)`, background: "rgba(0,200,150,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: G }}>Booking received! Vomni is working.</p>
              <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>Your first review request will go out 24 hours after the appointment.</p>
            </div>
          </div>
        )}

        {timedOut && !bookingReceived && (
          <div style={{ padding: "16px 20px", borderRadius: 12, border: "1px solid #FED7AA", background: "#FFF7ED", marginBottom: 16 }}>
            <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#92400E", lineHeight: 1.6 }}>
              No email received yet - make sure you forwarded a booking confirmation email to <strong>{FWD}</strong>. Need help? Email <a href="mailto:support@vomni.io" style={{ color: "#B45309" }}>support@vomni.io</a>
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          {bookingReceived && <Btn onClick={onSkip} disabled={saving}>{saving ? "Saving…" : "Continue →"}</Btn>}
          {!bookingReceived && <Btn onClick={onSkip} disabled={saving} secondary>{saving ? "Saving…" : "Skip for now"}</Btn>}
        </div>
      </div>
    </div>
  );
}

function Step6Done({ onDashboard }: { onDashboard: () => void }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto", paddingTop: 40 }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: `rgba(0,200,150,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", animation: "popIn 0.5s ease" }}>
        <style>{`@keyframes popIn { from{ transform:scale(0.6); opacity:0; } to{ transform:scale(1); opacity:1; } }`}</style>
        <Check size={36} style={{ color: G }} />
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 34, fontWeight: 800, color: N, margin: "0 0 16px", letterSpacing: "-0.5px" }}>
        You&apos;re all set.
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "#6B7280", margin: "0 0 48px", lineHeight: 1.6 }}>
        Your first review request will be sent 24 hours after your next appointment. We&apos;ll notify you when reviews start coming in.
      </p>
      <Btn onClick={onDashboard}>
        Go to my dashboard →
      </Btn>
    </div>
  );
}

function Step6Logo({
  bizId, logoFile, setLogoFile, logoPreview, setLogoPreview,
  logoUploading, setLogoUploading, saving, onNext, onSkip
}: {
  bizId: string;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
  logoPreview: string | null;
  setLogoPreview: (s: string | null) => void;
  logoUploading: boolean;
  setLogoUploading: (b: boolean) => void;
  saving: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const G = "#00C896";
  const N = "#0A0F1E";
  const BD = "#E5E7EB";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("File must be under 2MB"); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!logoFile || !bizId) { onNext(); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", logoFile);
      fd.append("business_id", bizId);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        console.error("[onboarding] Logo upload failed:", json.error);
        alert(`Logo upload failed: ${json.error}\n\nYou can add your logo later from Settings.`);
      }
    } catch (err) {
      console.error("[onboarding] Logo upload failed:", err);
      alert("Logo upload failed. You can add your logo later from Settings.");
    }
    setLogoUploading(false);
    onNext();
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>🖼️</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: N, margin: "0 0 12px" }}>Add your logo</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.6 }}>
        Your customers will see this when they rate their experience.<br />It makes the whole thing feel personal.
      </p>

      {/* Upload area */}
      <label htmlFor="logo-upload" style={{ display: "block", cursor: "pointer" }}>
        <div style={{
          border: `2px dashed ${logoPreview ? G : BD}`,
          borderRadius: 16,
          padding: "32px 24px",
          background: logoPreview ? "rgba(0,200,150,0.04)" : "#fff",
          transition: "all 0.2s",
          marginBottom: 24,
        }}>
          {logoPreview ? (
            <div>
              <img src={logoPreview} alt="Logo preview" style={{ maxHeight: 80, maxWidth: 200, objectFit: "contain", borderRadius: 8, margin: "0 auto", display: "block" }} />
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: G, marginTop: 12, fontWeight: 600 }}>✓ Logo ready to save</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>Tap to change</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#374151", fontWeight: 600, margin: "0 0 4px" }}>Drop your logo here or tap to upload</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>PNG, JPG or SVG · Max 2MB</p>
            </div>
          )}
        </div>
        <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" onChange={handleFileChange} style={{ display: "none" }} />
      </label>

      {/* Buttons */}
      <button
        onClick={handleSave}
        disabled={logoUploading || saving}
        style={{ width: "100%", padding: "16px", borderRadius: 9999, background: logoUploading ? "#9CA3AF" : G, color: "#fff", border: "none", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600, cursor: logoUploading ? "not-allowed" : "pointer", marginBottom: 16 }}
      >
        {logoUploading ? "Uploading…" : logoFile ? "Save logo and finish →" : "Continue →"}
      </button>
      <button
        onClick={onSkip}
        style={{ background: "none", border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF", cursor: "pointer", textDecoration: "underline" }}
      >
        Skip for now →
      </button>
    </div>
  );
}

// Step8Done is the same component, renamed for the new 8-step flow
const Step8Done = Step6Done;

// ── Step 5: Get More Bookings (Google Maps + Instagram) ───────────────────

function Step5Discover({
  googleMapsUrl, setGoogleMapsUrl,
  instagramHandle, setInstagramHandle,
  bookingSlug,
  onNext, onSkip, saving,
}: {
  googleMapsUrl: string; setGoogleMapsUrl: (v: string) => void;
  instagramHandle: string; setInstagramHandle: (v: string) => void;
  bookingSlug: string;
  onNext: () => void; onSkip: () => void; saving: boolean;
}) {
  const bookingUrl = bookingSlug ? `https://vomni.io/book/${bookingSlug}` : "";
  const waText = encodeURIComponent(`Book an appointment here: ${bookingUrl}`);
  const igCaption = encodeURIComponent(`📅 Book your next appointment online!\n${bookingUrl}`);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <StepCircle n={5} active={true} done={false} />
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: N, margin: 0 }}>Get more bookings</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>Step 5 of 8 — share your booking link everywhere</p>
        </div>
      </div>

      {bookingUrl && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BD}`, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Your booking link</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: N }}>{bookingUrl}</div>
          </div>
          <CopyBtn text={bookingUrl} label="Copy link" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Google Maps */}
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <svg viewBox="0 0 48 48" width={40} height={40}>
              <circle cx="24" cy="20" r="14" fill="#4285F4" />
              <circle cx="24" cy="20" r="6" fill="#fff" />
              <path d="M24 34 L24 48" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
              <path d="M16 28 Q24 40 24 48 Q24 40 32 28" fill="#EA4335" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 6px" }}>Google Business Profile</h3>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "0 0 12px", lineHeight: 1.5 }}>
            Add your booking link so customers can book directly from Google Maps & Search.
          </p>
          <input
            value={googleMapsUrl}
            onChange={e => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            style={{ ...inputStyle, fontSize: 13, marginBottom: 10 }}
          />
          <div style={{ background: "#F8FAFF", borderRadius: 10, padding: "12px 14px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: N }}>How to add your booking link:</div>
            {[
              "Go to business.google.com and sign in",
              "Click your business → Edit profile",
              'Under "Contact", find the "Website" field',
              "Paste your Vomni booking link and save",
              'Your profile will show a "Book" button within 24 hours',
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ minWidth: 18, height: 18, borderRadius: "50%", background: G, color: "#fff", fontWeight: 700, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E5E7EB", color: "#6B7280", fontSize: 11 }}>
              ℹ️ You don&apos;t need to be a Google partner — anyone can add a booking URL to their profile.
            </div>
          </div>
        </div>

        {/* Instagram */}
        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BD}`, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <svg viewBox="0 0 48 48" width={40} height={40}>
              <defs>
                <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="25%" stopColor="#e6683c" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="75%" stopColor="#cc2366" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="12" fill="url(#ig)" />
              <rect x="12" y="12" width="24" height="24" rx="7" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="24" cy="24" r="6.5" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="33" cy="15" r="2" fill="white" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 6px" }}>Instagram</h3>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "0 0 14px", lineHeight: 1.5 }}>
            Add your booking link to your Instagram bio and share a post to let followers book instantly.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF" }}>@</span>
            <input
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ""))}
              placeholder="yourbusiness"
              style={{ ...inputStyle, fontSize: 13 }}
            />
          </div>
          {bookingUrl && instagramHandle && (
            <a
              href={`https://www.instagram.com/?caption=${igCaption}`}
              target="_blank"
              style={{
                display: "block", marginTop: 10, padding: "10px 14px", borderRadius: 8,
                background: "linear-gradient(135deg, #f09433, #dc2743, #bc1888)",
                fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                color: "#fff", textDecoration: "none", textAlign: "center",
              }}
            >Share post with booking link ↗</a>
          )}
        </div>
      </div>

      {/* WhatsApp share */}
      {bookingUrl && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BD}`, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width={20} height={20} fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: N }}>Share via WhatsApp</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>Send your booking link to existing customers</div>
            </div>
          </div>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            style={{
              padding: "9px 18px", borderRadius: 9999,
              background: "#25D366", color: "#fff",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >Share ↗</a>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Btn onClick={onNext} disabled={saving}>
          Save & Continue <ChevronRight size={16} />
        </Btn>
        <button
          onClick={onSkip}
          style={{ background: "none", border: "none", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#9CA3AF", cursor: "pointer", textDecoration: "underline" }}
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [loading,  setLoading]  = useState(true);
  const [bizId,    setBizId]    = useState("");
  const [step,     setStep]     = useState(1);
  const [saving,   setSaving]   = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("there");

  // Step 2
  const [bizName,    setBizName]    = useState("");
  const [bizType,    setBizType]    = useState("");
  const [googleLink, setGoogleLink] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [initialRating, setInitialRating] = useState("");
  const [reviewCount,   setReviewCount]   = useState("");

  // Step 3
  const [provider, setProvider] = useState<EmailProvider | null>(null);

  // Step 4
  const [bookingReceived, setBookingReceived] = useState(false);
  const [bookingTimedOut, setBookingTimedOut] = useState(false);

  // Step 5 — get more bookings
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [bookingSlug, setBookingSlug] = useState("");

  // Step 7 — logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: biz } = await db
        .from("businesses")
        .select("*")
        .eq("owner_email", user.email)
        .single();

      if (!biz) { router.replace("/signup"); return; }

      setBizId(biz.id);
      setBizName(biz.name ?? "");
      setBizType(biz.business_type ?? "");
      setGoogleLink(biz.google_review_link ?? "");
      setNotifEmail(biz.notification_email ?? user.email ?? "");
      setInitialRating(biz.initial_google_rating != null ? String(biz.initial_google_rating) : "");
      setReviewCount(biz.initial_review_count != null ? String(biz.initial_review_count) : "");
      setFirstName((biz.owner_name ?? "").split(" ")[0] || "there");
      setGoogleMapsUrl(biz.google_maps_url ?? "");
      setInstagramHandle(biz.instagram_handle ?? "");
      setBookingSlug(biz.booking_slug ?? "");

      const savedStep: number = biz.onboarding_step ?? 1;
      if (savedStep >= 8) { router.replace("/dashboard"); return; }
      setStep(savedStep < 1 ? 1 : savedStep);
      setLoading(false);
    })();
  }, [router]);

  // Step 6: poll for first booking
  useEffect(() => {
    if (step !== 6 || !bizId) return;
    const poll = setInterval(async () => {
      const { data } = await db.from("bookings").select("id").eq("business_id", bizId).limit(1);
      if (data && data.length > 0) { setBookingReceived(true); clearInterval(poll); }
    }, 5000);
    const to = setTimeout(() => setBookingTimedOut(true), 5 * 60 * 1000);
    return () => { clearInterval(poll); clearTimeout(to); };
  }, [step, bizId]);

  async function advance(nextStep: number, patch: Record<string, unknown> = {}) {
    setSaving(true);
    let currentPatch: Record<string, unknown> = { ...patch, onboarding_step: nextStep };
    let lastError: string | null = null;

    // Retry up to 5 times, stripping missing columns each time
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await db
        .from("businesses")
        .update(currentPatch)
        .eq("id", bizId);
      if (!error) {
        setStep(nextStep);
        setSaving(false);
        return;
      }
      const colMatch = error.message.match(/Could not find the '(\w+)' column/);
      if (colMatch) {
        console.warn(`[onboarding] Column '${colMatch[1]}' missing, retrying without it`);
        delete currentPatch[colMatch[1]];
        continue;
      }
      lastError = error.message;
      break;
    }

    console.error("[onboarding] advance() failed:", lastError);
    setSaving(false);
    alert(`Sorry, something went wrong saving your details. Please try again.\n\nError: ${lastError}`);
  }

  async function completeStep2() {
    if (!googleLink.trim()) {
      setGoogleError("Please enter your Google review link");
      return;
    }
    if (!googleLink.toLowerCase().includes("google")) {
      setGoogleError("Please enter a valid Google review link (must contain google.com)");
      return;
    }
    setGoogleError("");
    const ratingVal = parseFloat(initialRating);
    const countVal  = parseInt(reviewCount, 10);
    const ratingPatch: Record<string, unknown> = {
      name: bizName,
      business_type: bizType,
      google_review_link: googleLink.trim(),
      notification_email: notifEmail,
    };
    if (!isNaN(ratingVal) && ratingVal >= 1 && ratingVal <= 5) {
      ratingPatch.initial_google_rating  = ratingVal;
      ratingPatch.current_google_rating  = ratingVal;
      ratingPatch.rating_captured_at     = new Date().toISOString();
    }
    if (!isNaN(countVal) && countVal >= 0) {
      ratingPatch.initial_review_count = countVal;
    }
    await advance(3, ratingPatch);
  }

  async function completeStep3() {
    setSaving(true);
    await db.from("businesses").update({
      onboarding_gdpr_accepted: true,
      onboarding_gdpr_accepted_at: new Date().toISOString(),
      onboarding_step: 4,
    }).eq("id", bizId);
    setStep(4);
    setSaving(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BD}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: N, margin: 0 }}>Vomni</h1>
        {step > 1 && step < 8 && (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>Step {step} of 8</span>
        )}
      </div>

      {/* Progress bar */}
      {step > 1 && step < 8 && (
        <div style={{ height: 3, background: "#E5E7EB" }}>
          <div style={{ height: "100%", width: `${((step - 1) / 7) * 100}%`, background: G, transition: "width 0.4s ease" }} />
        </div>
      )}

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 20px" }}>
        {step === 1 && (
          <Step1Welcome firstName={firstName} saving={saving} onNext={() => advance(2)} />
        )}
        {step === 2 && (
          <Step2Business
            bizName={bizName} setBizName={setBizName}
            bizType={bizType} setBizType={setBizType}
            googleLink={googleLink} setGoogleLink={setGoogleLink}
            notifEmail={notifEmail} setNotifEmail={setNotifEmail}
            googleError={googleError}
            initialRating={initialRating} setInitialRating={setInitialRating}
            reviewCount={reviewCount} setReviewCount={setReviewCount}
            onNext={completeStep2}
            saving={saving}
          />
        )}
        {step === 3 && (
          <Step3GDPR onNext={completeStep3} saving={saving} />
        )}
        {step === 4 && (
          <Step4BookingSetup
            bizId={bizId}
            onComplete={(slug) => { setBookingSlug(slug); advance(5); }}
            saving={saving}
          />
        )}
        {step === 5 && (
          <Step5Discover
            googleMapsUrl={googleMapsUrl}
            setGoogleMapsUrl={setGoogleMapsUrl}
            instagramHandle={instagramHandle}
            setInstagramHandle={setInstagramHandle}
            bookingSlug={bookingSlug}
            onNext={() => advance(6, {
              google_maps_url: googleMapsUrl || null,
              instagram_handle: instagramHandle || null,
            })}
            onSkip={() => advance(6)}
            saving={saving}
          />
        )}
        {step === 6 && (
          <Step5Booking
            businessId={bizId}
            bookingReceived={bookingReceived}
            timedOut={bookingTimedOut}
            onSkip={() => advance(7)}
            saving={saving}
          />
        )}
        {step === 7 && (
          <Step6Logo
            bizId={bizId}
            logoFile={logoFile}
            setLogoFile={setLogoFile}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            logoUploading={logoUploading}
            setLogoUploading={setLogoUploading}
            saving={saving}
            onNext={() => advance(8)}
            onSkip={() => advance(8)}
          />
        )}
        {step === 8 && (
          <Step8Done onDashboard={() => router.replace("/dashboard")} />
        )}
      </div>
    </div>
  );
}
