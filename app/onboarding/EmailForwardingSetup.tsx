"use client";

import { useState } from "react";
import { Check, Copy, AlertTriangle, Mail } from "lucide-react";

const G = "#00C896";
const N = "#0A0F1E";
const AMBER = "#F59E0B";
const FORWARDING_ADDRESS = "forwarding@vomni.io";

type Provider = "gmail" | "outlook" | "office365" | "exchange" | "apple" | "other";

// ── Address copy row ──────────────────────────────────────────────────────────

function AddressCopy({ small = false }: { small?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(FORWARDING_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <code
        className="flex-1 truncate font-mono"
        style={{ color: G, fontSize: small ? 12 : 13 }}
      >
        {FORWARDING_ADDRESS}
      </code>
      <button
        onClick={copy}
        className="flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-gray-200"
        title="Copy address"
      >
        {copied ? (
          <Check size={13} style={{ color: G }} />
        ) : (
          <Copy size={13} className="text-gray-400" />
        )}
      </button>
    </div>
  );
}

// ── SVG Diagrams ──────────────────────────────────────────────────────────────

function SvgHeaderGear({ brand, brandColor }: { brand: string; brandColor: string }) {
  return (
    <svg viewBox="0 0 320 60" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="320" height="60" fill="#F8F9FA" rx="8" />
      <rect x="12" y="16" width="72" height="28" rx="6" fill={brandColor} fillOpacity="0.12" />
      <text x="20" y="34" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="700" fill={brandColor}>{brand}</text>
      <rect x="96" y="16" width="140" height="28" rx="14" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <text x="116" y="34" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Search mail</text>
      <circle cx="287" cy="30" r="17" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="2" />
      <text x="277" y="36" fontFamily="system-ui,sans-serif" fontSize="17" fill={G}>⚙</text>
      <line x1="252" y1="30" x2="267" y2="30" stroke={G} strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon points="267,27 274,30 267,33" fill={G} />
      <text x="245" y="52" fontFamily="system-ui,sans-serif" fontSize="9" fill={G} fontWeight="600">Click here</text>
    </svg>
  );
}

function SvgDropdown({ highlighted }: { highlighted: string }) {
  return (
    <svg viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 220, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="220" height="110" fill="white" rx="8" />
      <rect x="0.5" y="0.5" width="219" height="109" rx="7.5" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="8" y="10" width="204" height="24" rx="5" fill="#F3F4F6" />
      <text x="16" y="26" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Quick settings</text>
      <rect x="8" y="40" width="204" height="28" rx="5" fill="rgba(0,200,150,0.08)" stroke={G} strokeWidth="1.5" />
      <text x="16" y="58" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill={N}>{highlighted}</text>
      <rect x="8" y="74" width="204" height="24" rx="5" fill="#F3F4F6" />
      <text x="16" y="90" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Themes</text>
    </svg>
  );
}

function SvgTabRow({ activeTab }: { activeTab: string }) {
  return (
    <svg viewBox="0 0 340 52" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 340, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="340" height="52" fill="white" rx="8" />
      <line x1="0" y1="51" x2="340" y2="51" stroke="#E5E7EB" strokeWidth="1" />
      <text x="12" y="30" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">General</text>
      <text x="66" y="30" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Labels</text>
      <text x="110" y="30" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Inbox</text>
      <text x="152" y="30" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill={G}>{activeTab}</text>
      <rect x="152" y="47" width="136" height="3" rx="1.5" fill={G} />
      <text x="296" y="30" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Meet</text>
    </svg>
  );
}

function SvgButtonHighlight({ section, btnLabel }: { section: string; btnLabel: string }) {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="80" fill="#F8F9FA" rx="8" />
      <text x="14" y="24" fontFamily="system-ui,sans-serif" fontSize="11" fill="#6B7280">{section}</text>
      <line x1="14" y1="30" x2="266" y2="30" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="14" y="40" width="200" height="28" rx="7" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5" />
      <text x="22" y="57" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G}>{btnLabel}</text>
    </svg>
  );
}

function SvgAddressInput() {
  return (
    <svg viewBox="0 0 280 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="64" fill="white" rx="8" />
      <text x="12" y="18" fontFamily="system-ui,sans-serif" fontSize="9" fill="#6B7280">Forwarding address</text>
      <rect x="12" y="24" width="256" height="28" rx="7" fill="white" stroke={G} strokeWidth="1.5" />
      <text x="20" y="42" fontFamily="system-ui,monospace,sans-serif" fontSize="11" fontWeight="600" fill={G}>{FORWARDING_ADDRESS}</text>
    </svg>
  );
}

function SvgEmailTick() {
  return (
    <svg viewBox="0 0 260 72" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 260, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="260" height="72" fill="white" rx="8" />
      <rect x="12" y="12" width="200" height="48" rx="7" fill="#F8F9FA" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="20" y="22" width="20" height="14" rx="2" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1" />
      <polyline points="20,22 30,30 40,22" fill="none" stroke={G} strokeWidth="1.2" />
      <rect x="48" y="24" width="80" height="8" rx="4" fill="#E5E7EB" />
      <rect x="48" y="36" width="140" height="6" rx="3" fill="#F3F4F6" />
      <circle cx="238" cy="36" r="14" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5" />
      <polyline points="231,36 235,40 245,30" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SvgRadioSelected() {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="80" fill="white" rx="8" />
      <circle cx="22" cy="26" r="8" fill="white" stroke={G} strokeWidth="2" />
      <circle cx="22" cy="26" r="4" fill={G} />
      <text x="36" y="30" fontFamily="system-ui,sans-serif" fontSize="10" fill={N}>Forward a copy to:</text>
      <rect x="36" y="35" width="208" height="16" rx="4" fill="rgba(0,200,150,0.06)" stroke={G} strokeWidth="1" />
      <text x="42" y="47" fontFamily="system-ui,monospace,sans-serif" fontSize="9" fill={G}>{FORWARDING_ADDRESS}</text>
      <circle cx="22" cy="62" r="8" fill="white" stroke="#D1D5DB" strokeWidth="1.5" />
      <text x="36" y="66" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">Keep in inbox only</text>
    </svg>
  );
}

function SvgToggleOn() {
  return (
    <svg viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 220, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="220" height="60" fill="white" rx="8" />
      <text x="12" y="22" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={N}>Enable forwarding</text>
      <rect x="12" y="32" width="48" height="22" rx="11" fill={G} />
      <circle cx="49" cy="43" r="9" fill="white" />
      <text x="68" y="47" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G}>On</text>
    </svg>
  );
}

function SvgCheckboxSave({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 280 76" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="76" fill="white" rx="8" />
      <rect x="12" y="14" width="18" height="18" rx="4" fill={G} />
      <polyline points="15,23 20,28 28,18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="38" y="26" fontFamily="system-ui,sans-serif" fontSize="11" fill={N}>{label}</text>
      <rect x="12" y="44" width="64" height="24" rx="7" fill={G} />
      <text x="22" y="59" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill="white">Save</text>
    </svg>
  );
}

function SvgAddressBar({ url }: { url: string }) {
  return (
    <svg viewBox="0 0 320 52" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="320" height="52" fill="#F3F4F6" rx="8" />
      <circle cx="14" cy="14" r="5" fill="#EF4444" fillOpacity="0.5" />
      <circle cx="28" cy="14" r="5" fill="#F59E0B" fillOpacity="0.5" />
      <circle cx="42" cy="14" r="5" fill="#22C55E" fillOpacity="0.5" />
      <rect x="10" y="24" width="300" height="22" rx="11" fill="white" stroke={G} strokeWidth="1.5" />
      <text x="20" y="39" fontFamily="system-ui,sans-serif" fontSize="10" fill={G}>🔒</text>
      <text x="36" y="39" fontFamily="system-ui,monospace,sans-serif" fontSize="11" fill={N}>{url}</text>
    </svg>
  );
}

function SvgSettingsSearch() {
  return (
    <svg viewBox="0 0 260 96" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 260, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="260" height="96" fill="white" rx="8" />
      <rect x="12" y="10" width="236" height="28" rx="8" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
      <text x="20" y="29" fontFamily="system-ui,sans-serif" fontSize="11" fill="#6B7280">🔍</text>
      <text x="38" y="29" fontFamily="system-ui,monospace,sans-serif" fontSize="11" fill={N}>forwarding</text>
      <rect x="12" y="50" width="236" height="30" rx="6" fill="rgba(0,200,150,0.08)" stroke={G} strokeWidth="1.5" />
      <text x="20" y="69" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill={G}>↳ Forwarding</text>
      <text x="136" y="69" fontFamily="system-ui,sans-serif" fontSize="9" fill="#9CA3AF">Mail settings</text>
    </svg>
  );
}

function SvgSettingsNav({ section, item }: { section: string; item: string }) {
  return (
    <svg viewBox="0 0 200 116" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 200, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="200" height="116" fill="white" rx="8" />
      <text x="14" y="26" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Calendar</text>
      <text x="14" y="50" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill={N}>{section}</text>
      <line x1="22" y1="56" x2="22" y2="108" stroke="#E5E7EB" strokeWidth="1.5" />
      <text x="34" y="72" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">Automatic replies</text>
      <rect x="26" y="78" width="162" height="24" rx="5" fill="rgba(0,200,150,0.08)" stroke={G} strokeWidth="1.5" />
      <text x="34" y="94" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G}>{item}</text>
      <text x="14" y="114" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">People</text>
    </svg>
  );
}

function SvgViewAllSettings() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 260, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="260" height="80" fill="white" rx="8" />
      <rect x="8" y="8" width="244" height="20" rx="4" fill="#F3F4F6" />
      <text x="16" y="22" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">Quick settings panel</text>
      <rect x="8" y="34" width="244" height="20" rx="4" fill="#F3F4F6" />
      <text x="16" y="48" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">Appearance options</text>
      <line x1="8" y1="60" x2="252" y2="60" stroke="#E5E7EB" strokeWidth="1" />
      <text x="80" y="73" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G} textDecoration="underline">View all Outlook settings →</text>
    </svg>
  );
}

function SvgInboxRules() {
  return (
    <svg viewBox="0 0 280 96" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="96" fill="white" rx="8" />
      <text x="14" y="22" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600" fill={N}>Inbox Rules</text>
      <line x1="14" y1="28" x2="266" y2="28" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="14" y="34" width="252" height="20" rx="4" fill="#F3F4F6" />
      <text x="22" y="48" fontFamily="system-ui,sans-serif" fontSize="9" fill="#9CA3AF">No rules — click + to create one</text>
      <circle cx="256" cy="18" r="14" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5" />
      <text x="249" y="23" fontFamily="system-ui,sans-serif" fontSize="18" fontWeight="700" fill={G}>+</text>
      <line x1="218" y1="18" x2="238" y2="18" stroke={G} strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon points="238,15 244,18 238,21" fill={G} />
      <text x="172" y="38" fontFamily="system-ui,sans-serif" fontSize="8" fill={G}>Click + to add rule</text>
    </svg>
  );
}

function SvgRuleConfig() {
  return (
    <svg viewBox="0 0 280 96" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="96" fill="white" rx="8" />
      <text x="14" y="18" fontFamily="system-ui,sans-serif" fontSize="9" fill="#6B7280">When:</text>
      <rect x="14" y="22" width="252" height="20" rx="4" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
      <text x="22" y="36" fontFamily="system-ui,sans-serif" fontSize="10" fill={N}>Apply to all messages</text>
      <text x="14" y="56" fontFamily="system-ui,sans-serif" fontSize="9" fill="#6B7280">Action:</text>
      <rect x="14" y="60" width="252" height="28" rx="4" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
      <text x="22" y="75" fontFamily="system-ui,sans-serif" fontSize="10" fill={N}>Forward to:</text>
      <rect x="88" y="63" width="170" height="16" rx="3" fill="rgba(0,200,150,0.08)" stroke={G} strokeWidth="1" />
      <text x="93" y="74" fontFamily="system-ui,monospace,sans-serif" fontSize="9" fill={G}>{FORWARDING_ADDRESS}</text>
    </svg>
  );
}

function SvgSuccessTick({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 200 76" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 200, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="200" height="76" fill="white" rx="8" />
      <circle cx="100" cy="36" r="22" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="2" />
      <polyline points="89,36 96,43 111,29" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="64" y="68" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="600" fill={G}>{label}</text>
    </svg>
  );
}

function SvgMacMenuBar() {
  return (
    <svg viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="320" height="80" fill="#EBEBEB" rx="8" />
      <rect x="0" y="0" width="320" height="22" fill="rgba(255,255,255,0.9)" />
      <text x="10" y="15" fontFamily="system-ui,sans-serif" fontSize="13">🍎</text>
      <rect x="30" y="2" width="38" height="18" rx="3" fill="rgba(0,200,150,0.12)" />
      <text x="34" y="15" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="700" fill={G}>Mail</text>
      <text x="74" y="15" fontFamily="system-ui,sans-serif" fontSize="12" fill="#333">File</text>
      <text x="100" y="15" fontFamily="system-ui,sans-serif" fontSize="12" fill="#333">Edit</text>
      <rect x="28" y="20" width="160" height="56" rx="5" fill="white" stroke="#D1D5DB" strokeWidth="1" />
      <text x="36" y="36" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">About Mail</text>
      <text x="36" y="52" fontFamily="system-ui,sans-serif" fontSize="11" fill="#9CA3AF">Check for Updates…</text>
      <rect x="28" y="56" width="160" height="20" rx="2" fill="rgba(0,200,150,0.1)" />
      <text x="36" y="70" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G}>Preferences…</text>
    </svg>
  );
}

function SvgPrefsAccounts() {
  return (
    <svg viewBox="0 0 280 116" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="116" fill="#F5F5F5" rx="8" />
      <rect x="0" y="0" width="280" height="24" fill="#E3E3E3" rx="8" />
      <rect x="0" y="16" width="280" height="8" fill="#E3E3E3" />
      <circle cx="14" cy="12" r="5" fill="#EF4444" fillOpacity="0.6" />
      <circle cx="28" cy="12" r="5" fill="#F59E0B" fillOpacity="0.6" />
      <circle cx="42" cy="12" r="5" fill="#22C55E" fillOpacity="0.6" />
      <text x="108" y="16" fontFamily="system-ui,sans-serif" fontSize="9" fill="#555">Mail Preferences</text>
      <text x="12" y="40" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">General</text>
      <rect x="60" y="29" width="64" height="18" rx="4" fill="white" stroke={G} strokeWidth="1.5" />
      <text x="68" y="41" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="700" fill={G}>Accounts</text>
      <text x="134" y="40" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">Rules</text>
      <rect x="12" y="52" width="76" height="52" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="12" y="52" width="76" height="22" rx="4" fill="rgba(0,200,150,0.08)" stroke={G} strokeWidth="1" />
      <text x="18" y="66" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="600" fill={G}>My Account</text>
      <text x="18" y="80" fontFamily="system-ui,sans-serif" fontSize="9" fill="#9CA3AF">iCloud</text>
      <rect x="100" y="52" width="168" height="52" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <text x="108" y="68" fontFamily="system-ui,sans-serif" fontSize="9" fill="#9CA3AF">Account type: iCloud</text>
      <text x="108" y="82" fontFamily="system-ui,sans-serif" fontSize="9" fill="#9CA3AF">Email: user@icloud.com</text>
    </svg>
  );
}

function SvgICloudRules() {
  return (
    <svg viewBox="0 0 280 96" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: "1px solid #F3F4F6", display: "block" }}>
      <rect width="280" height="96" fill="white" rx="8" />
      <text x="14" y="22" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600" fill={N}>Rules</text>
      <rect x="14" y="30" width="252" height="24" rx="5" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
      <text x="22" y="46" fontFamily="system-ui,sans-serif" fontSize="10" fill="#9CA3AF">No rules yet</text>
      <rect x="14" y="62" width="168" height="26" rx="7" fill="rgba(0,200,150,0.1)" stroke={G} strokeWidth="1.5" />
      <text x="22" y="78" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill={G}>+ Add a Rule</text>
    </svg>
  );
}

// ── Step Item ─────────────────────────────────────────────────────────────────

function StepItem({
  number,
  instruction,
  visual,
  isLast = false,
}: {
  number: number;
  instruction: string;
  visual?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-shrink-0 flex-col items-center">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: G }}
        >
          {number}
        </div>
        {!isLast && (
          <div className="mt-1 w-0.5 flex-1" style={{ background: "#E5E7EB", minHeight: 16 }} />
        )}
      </div>
      <div className="flex-1 pb-5">
        <p className="mb-3 text-sm leading-relaxed text-gray-700">{instruction}</p>
        {visual && <div className="overflow-hidden rounded-lg">{visual}</div>}
      </div>
    </div>
  );
}

// ── Instructions header ───────────────────────────────────────────────────────

function InstructionHeader({ title, time }: { title: string; time: string }) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <span className="ml-3 flex-shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        ⏱ {time}
      </span>
    </div>
  );
}

// ── Verification Section ──────────────────────────────────────────────────────

function VerificationSection({ onComplete }: { onComplete: () => void }) {
  return (
    <div
      className="mt-4 rounded-xl border p-5"
      style={{ borderColor: G, background: "rgba(0,200,150,0.04)" }}
    >
      <h4 className="mb-1 text-sm font-semibold text-gray-900">
        Verify your forwarding is working
      </h4>
      <p className="mb-4 text-sm text-gray-500">
        Once you have set up forwarding, send a test booking email to yourself. When you receive
        it, click the button below to confirm your forwarding is working.
      </p>
      <button
        onClick={onComplete}
        className="w-full rounded-full py-3 text-sm font-semibold text-white transition-colors"
        style={{ background: G }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#00A87D";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = G;
        }}
      >
        I&apos;ve set up email forwarding
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">
        Need help?{" "}
        <a href="mailto:support@vomni.app" className="text-gray-500 hover:underline">
          Email us at support@vomni.app
        </a>{" "}
        and we will walk you through it.
      </p>
    </div>
  );
}

// ── Gmail ─────────────────────────────────────────────────────────────────────

function GmailInstructions({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <InstructionHeader title="Setting up forwarding in Gmail" time="2 minutes" />
      <StepItem
        number={1}
        instruction="Open Gmail and click the Settings gear icon in the top right corner."
        visual={<SvgHeaderGear brand="Gmail" brandColor="#EA4335" />}
      />
      <StepItem
        number={2}
        instruction='Click "See all settings" from the dropdown menu.'
        visual={<SvgDropdown highlighted="See all settings" />}
      />
      <StepItem
        number={3}
        instruction='Click the "Forwarding and POP/IMAP" tab at the top of the settings page.'
        visual={<SvgTabRow activeTab="Forwarding and POP/IMAP" />}
      />
      <StepItem
        number={4}
        instruction='"Add a forwarding address" — click the button shown below.'
        visual={<SvgButtonHighlight section="Forwarding" btnLabel="Add a forwarding address" />}
      />
      <StepItem
        number={5}
        instruction="Enter your unique Vomni address below and click Next."
        visual={
          <div className="space-y-2">
            <SvgAddressInput />
            <AddressCopy small />
          </div>
        }
      />
      <StepItem
        number={6}
        instruction="Gmail will send a confirmation email to your Vomni inbox. We will confirm receipt automatically — you do not need to do anything."
        visual={<SvgEmailTick />}
      />
      <StepItem
        number={7}
        instruction={`Back in Gmail settings, select "Forward a copy of incoming mail to" your Vomni address and choose "Keep Gmail's copy in the inbox". Click Save Changes.`}
        visual={<SvgRadioSelected />}
        isLast
      />
      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Outlook ───────────────────────────────────────────────────────────────────

function OutlookInstructions({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <InstructionHeader title="Setting up forwarding in Outlook" time="2 minutes" />
      <StepItem
        number={1}
        instruction="Open Outlook and click the Settings gear icon in the top right."
        visual={<SvgHeaderGear brand="Outlook" brandColor="#0078D4" />}
      />
      <StepItem
        number={2}
        instruction='Type "forwarding" in the search bar at the top of the settings panel and click "Forwarding" from the results.'
        visual={<SvgSettingsSearch />}
      />
      <StepItem
        number={3}
        instruction='Toggle "Enable forwarding" to on.'
        visual={<SvgToggleOn />}
      />
      <StepItem
        number={4}
        instruction='Enter your Vomni forwarding address in the "Forward my email to" field.'
        visual={
          <div className="space-y-2">
            <SvgAddressInput />
            <AddressCopy small />
          </div>
        }
      />
      <StepItem
        number={5}
        instruction='Check "Keep a copy of forwarded messages" so you still receive your own emails. Click Save.'
        visual={<SvgCheckboxSave label="Keep a copy of forwarded messages" />}
        isLast
      />
      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Office 365 ────────────────────────────────────────────────────────────────

function Office365Instructions({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <InstructionHeader title="Setting up forwarding in Office 365" time="3 minutes" />
      <StepItem
        number={1}
        instruction="Sign in to your Microsoft 365 account at outlook.office.com"
        visual={<SvgAddressBar url="outlook.office.com" />}
      />
      <StepItem
        number={2}
        instruction="Click the Settings gear icon in the top right corner."
        visual={<SvgHeaderGear brand="Outlook" brandColor="#0078D4" />}
      />
      <StepItem
        number={3}
        instruction='Click "View all Outlook settings" at the bottom of the settings panel.'
        visual={<SvgViewAllSettings />}
      />
      <StepItem
        number={4}
        instruction='Go to Mail → Forwarding.'
        visual={<SvgSettingsNav section="Mail" item="Forwarding" />}
      />
      <StepItem
        number={5}
        instruction="Select Enable forwarding and enter your Vomni address."
        visual={
          <div className="space-y-2">
            <SvgAddressInput />
            <AddressCopy small />
          </div>
        }
      />
      <StepItem
        number={6}
        instruction='Check "Keep a copy of forwarded messages" and click Save.'
        visual={<SvgCheckboxSave label="Keep a copy of forwarded messages" />}
        isLast
      />
      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Microsoft Exchange ────────────────────────────────────────────────────────

function ExchangeInstructions({ onComplete }: { onComplete: () => void }) {
  const [copiedIT, setCopiedIT] = useState(false);
  const itText = `Hi — can you please set up email forwarding on my account so that all emails are forwarded to ${FORWARDING_ADDRESS} while keeping a copy in my inbox. This is for a review management service we are using. Thank you.`;

  function copyIT() {
    navigator.clipboard.writeText(itText).then(() => {
      setCopiedIT(true);
      setTimeout(() => setCopiedIT(false), 2500);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <InstructionHeader
        title="Setting up forwarding in Microsoft Exchange"
        time="5 minutes — you may need your IT admin"
      />

      {/* Warning banner */}
      <div
        className="mb-5 flex items-start gap-3 rounded-lg p-4"
        style={{
          background: "#FFFBEB",
          borderLeft: `4px solid ${AMBER}`,
        }}
      >
        <AlertTriangle size={16} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
        <p className="text-sm text-amber-800">
          Exchange forwarding is sometimes managed by your company IT administrator. If these
          steps do not work, forward this page to your IT team.
        </p>
      </div>

      <StepItem
        number={1}
        instruction="Log in to Outlook Web App — usually at mail.[yourcompany].com"
        visual={<SvgAddressBar url="mail.yourcompany.com" />}
      />
      <StepItem
        number={2}
        instruction='Click the Settings gear icon and select "Options".'
        visual={<SvgDropdown highlighted="Options" />}
      />
      <StepItem
        number={3}
        instruction='Under "Organise Email" select "Inbox Rules" then click the + icon to create a new rule.'
        visual={<SvgInboxRules />}
      />
      <StepItem
        number={4}
        instruction='Set the rule to "Apply to all messages" and the action to "Forward the message to" your Vomni address.'
        visual={
          <div className="space-y-2">
            <SvgRuleConfig />
            <AddressCopy small />
          </div>
        }
      />
      <StepItem
        number={5}
        instruction="Click Save. The rule is now active."
        visual={<SvgSuccessTick label="Rule saved!" />}
        isLast
      />

      {/* IT admin alternative */}
      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          Alternatively, send this instruction to your IT administrator:
        </p>
        <div className="relative rounded-lg border border-gray-200 bg-white p-3 pr-10">
          <p className="text-sm leading-relaxed text-gray-600">{itText}</p>
          <button
            onClick={copyIT}
            className="absolute right-2 top-2 rounded-md p-1.5 transition-colors hover:bg-gray-100"
            title="Copy to clipboard"
          >
            {copiedIT ? (
              <Check size={14} style={{ color: G }} />
            ) : (
              <Copy size={14} className="text-gray-400" />
            )}
          </button>
        </div>
        {copiedIT && (
          <p className="mt-1 text-xs font-medium" style={{ color: G }}>
            Copied to clipboard!
          </p>
        )}
      </div>

      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Apple Mail ────────────────────────────────────────────────────────────────

function AppleMailInstructions({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <InstructionHeader title="Setting up forwarding in Apple Mail" time="2 minutes" />
      <StepItem
        number={1}
        instruction="Open the Mail app on your Mac and click Mail in the top menu bar, then Preferences."
        visual={<SvgMacMenuBar />}
      />
      <StepItem
        number={2}
        instruction="Click the Accounts tab and select your email account on the left."
        visual={<SvgPrefsAccounts />}
      />
      <StepItem
        number={3}
        instruction="Note: Apple Mail forwarding depends on your email provider. Follow the step below for iCloud accounts. If your email ends in @gmail.com or @outlook.com, use the Gmail or Outlook instructions instead."
        visual={
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: "rgba(0,200,150,0.08)", color: "#065f46", borderLeft: `3px solid ${G}` }}
          >
            <strong>iCloud users:</strong> forwarding is set up at icloud.com/mail, not in the Mail
            app directly. Follow step 4 below.
          </div>
        }
      />
      <StepItem
        number={4}
        instruction="For iCloud: go to icloud.com/mail → Settings gear → Preferences → Rules → Add a Rule. Set condition to Every Message and action to Forward to your Vomni address."
        visual={
          <div className="space-y-2">
            <SvgICloudRules />
            <AddressCopy small />
          </div>
        }
        isLast
      />
      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Other / I don't know ──────────────────────────────────────────────────────

function OtherInstructions({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const helpers = [
    { q: "Does your email end in @gmail.com?", a: "Select Gmail above" },
    {
      q: "Does your email end in @outlook.com or @hotmail.com?",
      a: "Select Outlook above",
    },
    {
      q: "Does your email end in your company name like @yourbusiness.com?",
      a: "Probably Office 365 or Exchange — select one of those above",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <h3 className="text-base font-semibold text-gray-900">Not sure which email you use?</h3>
      <div className="space-y-2">
        {helpers.map((h, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-gray-50 p-3">
            <Mail size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">{h.q}</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: G }}>
                → {h.a}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-1 text-sm font-semibold text-gray-700">Still not sure?</p>
        <p className="mb-3 text-sm text-gray-500">
          Send us your email address and we will send you personalised setup instructions within 1
          hour.
        </p>
        {!sent ? (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = G;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
            />
            <button
              onClick={() => { if (email) setSent(true); }}
              disabled={!email}
              className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: G }}
            >
              Send
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 rounded-lg p-3"
            style={{ background: "rgba(0,200,150,0.08)" }}
          >
            <Check size={15} style={{ color: G }} />
            <p className="text-sm font-medium" style={{ color: G }}>
              Instructions sent to {email}!
            </p>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-400">
          Or email us at{" "}
          <a href="mailto:support@vomni.app" className="text-gray-500 hover:underline">
            support@vomni.app
          </a>
        </p>
      </div>

      {/* Still show verification */}
      <VerificationSection onComplete={onComplete} />
    </div>
  );
}

// ── Provider Button ───────────────────────────────────────────────────────────

const PROVIDERS: { id: Provider; label: string; bg: string; abbr: string }[] = [
  { id: "gmail", label: "Gmail", bg: "#EA4335", abbr: "G" },
  { id: "outlook", label: "Outlook", bg: "#0078D4", abbr: "O" },
  { id: "office365", label: "Office 365", bg: "#D83B01", abbr: "365" },
  { id: "exchange", label: "Microsoft Exchange", bg: "#0078D4", abbr: "Ex" },
  { id: "apple", label: "Apple Mail", bg: "#555555", abbr: "✦" },
  { id: "other", label: "Other / I don't know", bg: "#6B7280", abbr: "?" },
];

function ProviderButton({
  provider,
  selected,
  onClick,
}: {
  provider: (typeof PROVIDERS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? "rgba(0,200,150,0.06)" : "white",
        border: selected ? `2px solid ${G}` : "1.5px solid #E5E7EB",
        borderRadius: 12,
        padding: "16px 12px",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 600,
        color: N,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.borderColor = G;
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: provider.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: provider.abbr === "365" ? 11 : 18,
          flexShrink: 0,
        }}
      >
        {provider.abbr}
      </div>
      <span style={{ lineHeight: 1.3 }}>{provider.label}</span>
    </button>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function EmailForwardingSetup({ onComplete }: { onComplete: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  return (
    <>
      <style>{`
        @keyframes vomni-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vomni-fade-in { animation: vomni-fade-in 0.25s ease; }
      `}</style>

      <div className="mt-4 space-y-4">
        {/* Universal forwarding address */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Your Vomni forwarding address:
          </p>
          <AddressCopy />
          <p className="mt-2 text-xs text-gray-400">
            Forward all booking confirmation emails to this address.
          </p>
        </div>

        {/* Provider selector */}
        <p className="text-sm text-gray-500">
          Select your email provider for step-by-step instructions:
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <ProviderButton
              key={p.id}
              provider={p}
              selected={selectedProvider === p.id}
              onClick={() => setSelectedProvider(p.id)}
            />
          ))}
        </div>

        {/* Instructions panel */}
        {selectedProvider && (
          <div className="vomni-fade-in">
            {selectedProvider === "gmail" && (
              <GmailInstructions onComplete={onComplete} />
            )}
            {selectedProvider === "outlook" && (
              <OutlookInstructions onComplete={onComplete} />
            )}
            {selectedProvider === "office365" && (
              <Office365Instructions onComplete={onComplete} />
            )}
            {selectedProvider === "exchange" && (
              <ExchangeInstructions onComplete={onComplete} />
            )}
            {selectedProvider === "apple" && (
              <AppleMailInstructions onComplete={onComplete} />
            )}
            {selectedProvider === "other" && (
              <OtherInstructions onComplete={onComplete} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
