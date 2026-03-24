"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Link2,
  Clock,
  Bell,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { getBusiness, updateBusiness } from "@/lib/storage";
import type { Business } from "@/types";

const G = "#00C896";
const N = "#0A0F1E";

function Toast({ message }: { message: string }) {
  return (
    <div className="animate-fade-in mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
      <Check size={16} />
      {message}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 shadow-sm" style={{ borderRadius: 16, border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-3 mb-5">
        <div style={{ color: G }}>{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveButton({
  onClick,
  label = "Save",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      style={{ background: G }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#00A87D'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
    >
      {label}
    </button>
  );
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none";
const inputFocusStyle = { outline: 'none' };

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputClass} ${props.className ?? ""}`}
      style={inputFocusStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = G;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,200,150,0.12)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ${props.className ?? ""}`}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = G;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,200,150,0.12)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

export default function SettingsPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  const [reviewRequestDelay, setReviewRequestDelay] = useState(24);
  const [quietHoursStart, setQuietHoursStart] = useState(22);
  const [quietHoursEnd, setQuietHoursEnd] = useState(8);
  const [notifyOnNegative, setNotifyOnNegative] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    const biz = getBusiness();
    if (!biz) {
      router.push("/signup");
      return;
    }
    setBusiness(biz);
    setName(biz.name);
    setOwnerName(biz.ownerName);
    setPhone(biz.phone);
    setAddress(biz.address);
    setGoogleReviewLink(biz.googleReviewLink);
    setReviewRequestDelay(biz.reviewRequestDelay);
    setQuietHoursStart(biz.quietHoursStart);
    setQuietHoursEnd(biz.quietHoursEnd);
    setNotifyOnNegative(biz.notifyOnNegative);
    setNotifyEmail(biz.notifyEmail);
    setMounted(true);
  }, [router]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const save = useCallback(
    (updates: Partial<Business>) => {
      updateBusiness(updates);
      setBusiness((prev) => (prev ? { ...prev, ...updates } : prev));
      showToast("Settings saved successfully");
    },
    [showToast]
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N }}>
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your business and review request preferences
        </p>
      </div>

      {/* Global toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast} />
        </div>
      )}

      <div className="space-y-6 max-w-3xl">
        {/* Business Details */}
        <SectionCard
          icon={<Building2 size={20} />}
          title="Business Details"
          description="Your business contact information"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
              <StyledInput type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner Name</label>
              <StyledInput type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <StyledInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <StyledInput type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <SaveButton onClick={() => save({ name, ownerName, phone, address })} />
          </div>
        </SectionCard>

        {/* Google Review Link */}
        <SectionCard
          icon={<Link2 size={20} />}
          title="Google Review Link"
          description="This is where happy customers will be directed"
        >
          <StyledInput
            type="url"
            value={googleReviewLink}
            onChange={(e) => setGoogleReviewLink(e.target.value)}
            placeholder="https://g.page/r/your-business/review"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Paste your Google Business review link here. Customers who rate you 4-5 stars will be redirected to leave a public review.
          </p>
          <div className="mt-4 flex justify-end">
            <SaveButton onClick={() => save({ googleReviewLink })} />
          </div>
        </SectionCard>

        {/* Review Request Timing */}
        <SectionCard
          icon={<Clock size={20} />}
          title="Review Request Timing"
          description="When to send review requests after appointments"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Delay after appointment (hours)
              </label>
              <StyledInput
                type="number"
                min={1}
                max={72}
                value={reviewRequestDelay}
                onChange={(e) =>
                  setReviewRequestDelay(
                    Math.min(72, Math.max(1, parseInt(e.target.value) || 1))
                  )
                }
                className="w-32"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Default: 24 hours. For barbers and salons, 2-4 hours works best.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quiet hours start</label>
                <StyledSelect
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(parseInt(e.target.value))}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </StyledSelect>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quiet hours end</label>
                <StyledSelect
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(parseInt(e.target.value))}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </StyledSelect>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              No messages will be sent during quiet hours. They&apos;ll be queued and sent when quiet hours end.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <SaveButton
              onClick={() => save({ reviewRequestDelay, quietHoursStart, quietHoursEnd })}
            />
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={<Bell size={20} />}
          title="Notifications"
          description="Get alerted about negative feedback"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Notify on negative feedback</p>
                <p className="text-xs text-gray-400">Get an email when a customer leaves a low rating</p>
              </div>
              <button
                role="switch"
                aria-checked={notifyOnNegative}
                onClick={() => setNotifyOnNegative(!notifyOnNegative)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
                style={{ background: notifyOnNegative ? G : '#D1D5DB' }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                  style={{ transform: notifyOnNegative ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notification email</label>
              <StyledInput
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <SaveButton onClick={() => save({ notifyOnNegative, notifyEmail })} />
          </div>
        </SectionCard>

        {/* Email Forwarding */}
        <SectionCard
          icon={<Mail size={20} />}
          title="Email Forwarding"
          description="Auto-import customers from booking confirmations"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Your forwarding email address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 font-mono select-all">
                {business.forwardingEmail}
              </div>
              <button
                onClick={() => copyToClipboard(business.forwardingEmail)}
                className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check size={18} style={{ color: G }} />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs font-medium text-blue-800 mb-2">Setup instructions</p>
            <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
              <li>Open your booking platform email settings</li>
              <li>Add the address above as a forwarding email or BCC recipient</li>
              <li>Vomni will automatically parse booking details and create customer records</li>
              <li>Review requests will be scheduled based on your timing settings</li>
            </ol>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
