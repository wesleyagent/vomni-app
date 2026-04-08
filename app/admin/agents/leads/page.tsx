"use client";

import { useState, useEffect } from "react";
import { Search, Plus, CircleCheck, CircleX, ChevronDown, ChevronUp, Pencil, Trash2, Phone, Mail, Star } from "lucide-react";
import { type Lead, type LeadStatus, type BusinessType, type OutreachChannel } from "@/lib/supabase";

const G = "#00C896";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  outreach_written: "Copy Written",
  contacted: "Contacted",
  replied: "Replied",
  demo_booked: "Demo Booked",
  customer: "Customer",
};

const STATUS_COLORS: Record<LeadStatus, { bg: string; color: string }> = {
  new: { bg: "#F3F4F6", color: "#6B7280" },
  approved: { bg: "rgba(0,200,150,0.1)", color: G },
  rejected: { bg: "#FEF2F2", color: "#EF4444" },
  outreach_written: { bg: "#EFF6FF", color: "#6366F1" },
  contacted: { bg: "#EFF6FF", color: "#3B82F6" },
  replied: { bg: "#FFF7ED", color: "#F59E0B" },
  demo_booked: { bg: "rgba(0,200,150,0.15)", color: "#059669" },
  customer: { bg: "rgba(0,200,150,0.2)", color: "#047857" },
};

const BUSINESS_TYPES: BusinessType[] = ["barber", "salon", "nail_salon", "aesthetic_clinic", "lash_brow", "massage_spa", "dentist", "tattoo", "tattoo_laser", "other"];

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  barber: "Barber",
  salon: "Hair Salon",
  nail_salon: "Nail Salon",
  aesthetic_clinic: "Aesthetic Clinic",
  lash_brow: "Lash / Brow",
  massage_spa: "Massage / Spa",
  dentist: "Dentist",
  tattoo: "Tattoo Studio",
  tattoo_laser: "Tattoo Laser",
  other: "Other",
};

const TIER_CONFIG: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Tier 1 — Hot", bg: "#FEF2F2", color: "#EF4444" },
  2: { label: "Tier 2 — Warm", bg: "#FFF7ED", color: "#F59E0B" },
  3: { label: "Tier 3 — Cool", bg: "#EFF6FF", color: "#3B82F6" },
  4: { label: "Tier 4 — Cold", bg: "#F3F4F6", color: "#9CA3AF" },
};

const emptyForm = {
  business_name: "",
  business_type: "barber" as BusinessType,
  location: "",
  city: "",
  country: "UK",
  google_rating: "",
  review_count: "",
  phone: "",
  worst_review_name: "",
  worst_review_rating: "",
  worst_review_text: "",
  worst_review_date: "",
  last_bad_review_name: "",
  last_bad_review_rating: "",
  last_bad_review_text: "",
  last_bad_review_date: "",
  instagram_handle: "",
  email: "",
  outreach_channel: "email" as OutreachChannel,
  score: "5",
  tier: "",
  booking_platform: "",
  notes: "",
  has_online_booking: false,
  booking_system: "",
  has_website: false,
  icp_notes: "",
};

function calcIcpScore(form: { has_website: boolean; has_online_booking: boolean; google_rating: string; booking_system: string }): number {
  let score = 0;
  if (form.has_website) score += 2;
  if (form.has_online_booking) score += 3;
  const rating = parseFloat(form.google_rating);
  if (!isNaN(rating) && rating < 4.2) score += 3;
  if (form.has_online_booking && form.booking_system.trim()) score += 1;
  return score;
}

function IcpBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const color = score >= 7 ? "#059669" : score >= 4 ? "#D97706" : "#6B7280";
  const bg = score >= 7 ? "rgba(5,150,105,0.1)" : score >= 4 ? "rgba(217,119,6,0.1)" : "#F3F4F6";
  const label = score >= 7 ? "Strong ICP" : score >= 4 ? "Moderate ICP" : "Weak ICP";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: bg, color }}>
      {score}/9 {label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Star size={12} fill="#F59E0B" className="text-amber-400" />
      <span className="font-medium text-gray-900">{rating}</span>
    </span>
  );
}

function ReviewCard({ title, name, rating, date, text, color = "#EF4444" }: {
  title: string; name: string; rating: number; date: string; text: string; color?: string;
}) {
  if (!name && !text) return null;
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `${color}30`, background: `${color}08` }}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color }}>{title}</p>
      <div className="flex items-center gap-2 mb-1">
        {name && <span className="text-sm font-medium text-gray-800">{name}</span>}
        {rating > 0 && <span className="text-xs text-red-500 font-medium">{"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating}/5)</span>}
        {date && <span className="text-xs text-gray-400">{date}</span>}
      </div>
      {text && <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{text}&rdquo;</p>}
    </div>
  );
}

export default function LeadPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    setLoading(true);
    const res = await fetch("/api/admin/db/leads?order=created_at.desc");
    if (res.status === 401) { setSessionExpired(true); setLoading(false); return; }
    const data = await res.json();
    if (Array.isArray(data)) setLeads(data as Lead[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: LeadStatus) {
    await fetch(`/api/admin/db/leads?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  }

  async function addLead() {
    if (!form.business_name.trim()) return;
    setSaving(true);
    const payload = {
      business_name: form.business_name,
      business_type: form.business_type,
      location: form.location,
      city: form.city,
      country: form.country,
      google_rating: parseFloat(form.google_rating) || 0,
      overall_rating: parseFloat(form.google_rating) || 0,
      review_count: parseInt(form.review_count) || 0,
      total_reviews: parseInt(form.review_count) || 0,
      phone: form.phone,
      email: form.email,
      outreach_channel: form.outreach_channel,
      score: parseInt(form.score) || 5,
      tier: parseInt(form.tier) || undefined,
      booking_platform: form.booking_platform || undefined,
      status: "new" as LeadStatus,
      notes: form.notes,
      instagram_handle: form.instagram_handle,
      has_online_booking: form.has_online_booking,
      booking_system: form.booking_system || null,
      has_website: form.has_website,
      icp_score: calcIcpScore(form),
      icp_notes: form.icp_notes || null,
      worst_review_name: form.worst_review_name,
      worst_review_rating: parseInt(form.worst_review_rating) || 0,
      worst_review_text: form.worst_review_text,
      worst_review_date: form.worst_review_date,
      last_bad_review_name: form.last_bad_review_name,
      last_bad_review_rating: parseInt(form.last_bad_review_rating) || 0,
      last_bad_review_text: form.last_bad_review_text,
      last_bad_review_date: form.last_bad_review_date,
    };
    const res = await fetch("/api/admin/db/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.id) setLeads((prev) => [data as Lead, ...prev]);
    setForm(emptyForm);
    setShowAddModal(false);
    setSaving(false);
  }

  async function deleteLead(id: string) {
    await fetch(`/api/admin/db/leads?id=${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
    if (expandedRow === id) setExpandedRow(null);
  }

  function openEdit(lead: Lead) {
    setEditForm({
      business_name: lead.business_name,
      business_type: lead.business_type,
      location: lead.location || "",
      city: lead.city || "",
      country: lead.country || "UK",
      google_rating: String(lead.overall_rating ?? lead.google_rating ?? ""),
      review_count: String(lead.total_reviews ?? lead.review_count ?? ""),
      phone: lead.phone || "",
      worst_review_name: lead.worst_review_name || "",
      worst_review_rating: String(lead.worst_review_rating ?? ""),
      worst_review_text: lead.worst_review_text || "",
      worst_review_date: lead.worst_review_date || "",
      last_bad_review_name: lead.last_bad_review_name || "",
      last_bad_review_rating: String(lead.last_bad_review_rating ?? ""),
      last_bad_review_text: lead.last_bad_review_text || "",
      last_bad_review_date: lead.last_bad_review_date || "",
      instagram_handle: lead.instagram_handle || "",
      email: lead.email || "",
      outreach_channel: lead.outreach_channel,
      score: String(lead.score ?? "5"),
      tier: String(lead.tier ?? ""),
      booking_platform: lead.booking_platform || "",
      notes: lead.notes || "",
      has_online_booking: (lead as any).has_online_booking ?? false,
      booking_system: (lead as any).booking_system || "",
      has_website: (lead as any).has_website ?? false,
      icp_notes: (lead as any).icp_notes || "",
    });
    setEditingLead(lead);
  }

  async function saveEdit() {
    if (!editingLead || !editForm.business_name.trim()) return;
    setSaving(true);
    const payload = {
      business_name: editForm.business_name,
      business_type: editForm.business_type,
      location: editForm.location,
      city: editForm.city,
      country: editForm.country,
      google_rating: parseFloat(editForm.google_rating) || 0,
      overall_rating: parseFloat(editForm.google_rating) || 0,
      review_count: parseInt(editForm.review_count) || 0,
      total_reviews: parseInt(editForm.review_count) || 0,
      phone: editForm.phone,
      email: editForm.email,
      outreach_channel: editForm.outreach_channel,
      score: parseInt(editForm.score) || 5,
      tier: parseInt(editForm.tier) || undefined,
      booking_platform: editForm.booking_platform || undefined,
      notes: editForm.notes,
      instagram_handle: editForm.instagram_handle,
      has_online_booking: editForm.has_online_booking,
      booking_system: editForm.booking_system || null,
      has_website: editForm.has_website,
      icp_score: calcIcpScore(editForm),
      icp_notes: editForm.icp_notes || null,
      worst_review_name: editForm.worst_review_name,
      worst_review_rating: parseInt(editForm.worst_review_rating) || 0,
      worst_review_text: editForm.worst_review_text,
      worst_review_date: editForm.worst_review_date,
      last_bad_review_name: editForm.last_bad_review_name,
      last_bad_review_rating: parseInt(editForm.last_bad_review_rating) || 0,
      last_bad_review_text: editForm.last_bad_review_text,
      last_bad_review_date: editForm.last_bad_review_date,
      updated_at: new Date().toISOString(),
    };
    await fetch(`/api/admin/db/leads?id=${editingLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLeads((prev) => prev.map((l) => l.id === editingLead.id ? { ...l, ...payload } : l));
    setEditingLead(null);
    setSaving(false);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total = leads.length;
  const approved = leads.filter((l) => ["approved", "contacted", "replied", "demo_booked", "customer"].includes(l.status)).length;
  const contacted = leads.filter((l) => ["contacted", "replied", "demo_booked", "customer"].includes(l.status)).length;
  const replied = leads.filter((l) => ["replied", "demo_booked", "customer"].includes(l.status)).length;
  const demos = leads.filter((l) => l.status === "demo_booked" || l.status === "customer").length;
  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

  // ── Filters ───────────────────────────────────────────────────────────────
  const cities = [...new Set(leads.map((l) => l.city).filter(Boolean))].sort();

  const filtered = leads.filter((l) => {
    const rating = l.overall_rating || l.google_rating || 0;
    if (search) {
      const q = search.toLowerCase();
      if (!l.business_name.toLowerCase().includes(q) &&
          !(l.city || "").toLowerCase().includes(q) &&
          !(l.email || "").toLowerCase().includes(q)) return false;
    }
    if (filterType !== "all" && l.business_type !== filterType) return false;
    if (filterCity !== "all" && l.city !== filterCity) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterRating !== "all") {
      if (filterRating === "critical" && rating >= 4.0) return false;
      if (filterRating === "poor" && (rating < 4.0 || rating >= 4.3)) return false;
      if (filterRating === "ok" && rating < 4.3) return false;
    }
    return true;
  });

  const FormField = ({ label, fieldKey, placeholder, formState, setFormState }: {
    label: string; fieldKey: string; placeholder: string;
    formState: typeof emptyForm; setFormState: (f: typeof emptyForm) => void;
  }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        value={String(formState[fieldKey as keyof typeof emptyForm] ?? "")}
        onChange={(e) => setFormState({ ...formState, [fieldKey]: e.target.value })}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
      />
    </div>
  );

  const LeadFormFields = ({ formState, setFormState }: { formState: typeof emptyForm; setFormState: (f: typeof emptyForm) => void }) => (
    <div className="grid grid-cols-2 gap-4 p-6">
      <FormField label="Business name *" fieldKey="business_name" placeholder="Elite Barbers" formState={formState} setFormState={setFormState} />
      <FormField label="City" fieldKey="city" placeholder="London" formState={formState} setFormState={setFormState} />
      <FormField label="Full address" fieldKey="location" placeholder="123 High St, Shoreditch, London" formState={formState} setFormState={setFormState} />
      <FormField label="Country" fieldKey="country" placeholder="UK" formState={formState} setFormState={setFormState} />
      <FormField label="Phone" fieldKey="phone" placeholder="+44 20 7946 0958" formState={formState} setFormState={setFormState} />
      <FormField label="Email *" fieldKey="email" placeholder="hello@elitebarbers.co.uk" formState={formState} setFormState={setFormState} />
      <FormField label="Google rating" fieldKey="google_rating" placeholder="3.9" formState={formState} setFormState={setFormState} />
      <FormField label="Total reviews" fieldKey="review_count" placeholder="34" formState={formState} setFormState={setFormState} />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Business type</label>
        <select value={formState.business_type} onChange={(e) => setFormState({ ...formState, business_type: e.target.value as BusinessType })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
          {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{BUSINESS_TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Outreach channel</label>
        <select value={formState.outreach_channel} onChange={(e) => setFormState({ ...formState, outreach_channel: e.target.value as OutreachChannel })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
          <option value="email">Email</option>
          <option value="instagram">Instagram DM</option>
        </select>
      </div>
      <FormField label="Lead score (0-100)" fieldKey="score" placeholder="75" formState={formState} setFormState={setFormState} />
      <FormField label="Tier (1=Hot, 2=Warm, 3=Cool, 4=Cold)" fieldKey="tier" placeholder="1" formState={formState} setFormState={setFormState} />
      <FormField label="Booking platform" fieldKey="booking_platform" placeholder="Fresha" formState={formState} setFormState={setFormState} />
      <FormField label="Instagram handle" fieldKey="instagram_handle" placeholder="@elitebarbers" formState={formState} setFormState={setFormState} />

      <div className="col-span-2 border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Last Bad Review (most recent ≤ 3 stars)</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Reviewer first name" fieldKey="last_bad_review_name" placeholder="John" formState={formState} setFormState={setFormState} />
          <FormField label="Rating (1-3)" fieldKey="last_bad_review_rating" placeholder="2" formState={formState} setFormState={setFormState} />
          <FormField label="Date" fieldKey="last_bad_review_date" placeholder="2 weeks ago" formState={formState} setFormState={setFormState} />
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Review text</label>
            <textarea value={formState.last_bad_review_text}
              onChange={(e) => setFormState({ ...formState, last_bad_review_text: e.target.value })}
              placeholder="The review text..." rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
          </div>
        </div>
      </div>

      <div className="col-span-2 border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Worst Review (lowest rated overall)</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Reviewer first name" fieldKey="worst_review_name" placeholder="Sarah" formState={formState} setFormState={setFormState} />
          <FormField label="Rating (1-3)" fieldKey="worst_review_rating" placeholder="1" formState={formState} setFormState={setFormState} />
          <FormField label="Date" fieldKey="worst_review_date" placeholder="a month ago" formState={formState} setFormState={setFormState} />
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Review text</label>
            <textarea value={formState.worst_review_text}
              onChange={(e) => setFormState({ ...formState, worst_review_text: e.target.value })}
              placeholder="The worst review text..." rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
        <textarea value={formState.notes}
          onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
          placeholder="Any context..." rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
          onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
      </div>

      {/* ICP Fields */}
      <div className="col-span-2 border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">ICP Qualification</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="has_website" checked={formState.has_website}
              onChange={(e) => setFormState({ ...formState, has_website: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300" style={{ accentColor: G }} />
            <label htmlFor="has_website" className="text-sm text-gray-700 cursor-pointer">Has a website <span className="text-xs text-gray-400">(+2 ICP)</span></label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="has_online_booking" checked={formState.has_online_booking}
              onChange={(e) => setFormState({ ...formState, has_online_booking: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300" style={{ accentColor: G }} />
            <label htmlFor="has_online_booking" className="text-sm text-gray-700 cursor-pointer">Has online booking <span className="text-xs text-gray-400">(+3 ICP)</span></label>
          </div>
          {formState.has_online_booking && (
            <FormField label="Booking system (e.g. Fresha, Treatwell) (+1 ICP)" fieldKey="booking_system" placeholder="Fresha" formState={formState} setFormState={setFormState} />
          )}
          <div className="col-span-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              ICP Score: <strong style={{ color: G }}>{calcIcpScore(formState)}/9</strong>
              <span className="ml-2 text-xs text-gray-400">(rating &lt;4.2 = +3, website = +2, booking = +3, booking system = +1)</span>
            </div>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">ICP notes</label>
            <input value={formState.icp_notes}
              onChange={(e) => setFormState({ ...formState, icp_notes: e.target.value })}
              placeholder="e.g. Uses Fresha, 4.1 star rating, good fit"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (sessionExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F7F8FA" }}>
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm max-w-sm">
          <p className="text-sm font-semibold text-red-600 mb-2">Session expired</p>
          <p className="text-sm text-gray-500 mb-4">Your admin session has expired (8h limit). Please reload and log in again.</p>
          <button onClick={() => { sessionStorage.removeItem("vomni_admin_authed"); window.location.reload(); }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: "#00C896" }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      <div className="mx-auto max-w-full px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Lead Pipeline
            </h1>
            <p className="mt-1 text-sm text-gray-500">All leads found by the Prospector agent</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchLeads} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: G }}
            >
              <Plus size={16} /> Add lead manually
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-5 gap-3">
          {[
            { label: "Total leads", value: total },
            { label: "Approved", value: approved },
            { label: "Contacted", value: contacted },
            { label: "Reply rate", value: `${replyRate}%`, color: replyRate >= 15 ? G : replyRate > 0 ? "#F59E0B" : undefined },
            { label: "Demos booked", value: demos, color: demos > 0 ? G : undefined },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: color ?? "#111827" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city or email..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            />
          </div>
          {[
            { value: filterType, setter: setFilterType, options: [["all", "All types"], ...BUSINESS_TYPES.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])] },
            { value: filterCity, setter: setFilterCity, options: [["all", "All cities"], ...cities.map((c) => [c, c])] },
            { value: filterStatus, setter: setFilterStatus, options: [["all", "All statuses"], ...Object.entries(STATUS_LABELS)] },
            { value: filterRating, setter: setFilterRating, options: [["all", "All ratings"], ["critical", "Critical (< 4.0★)"], ["poor", "Poor (4.0-4.2★)"], ["ok", "OK (4.3+★)"]] },
          ].map(({ value, setter, options }, i) => (
            <select key={i} value={value} onChange={(e) => setter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none">
              {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
        </div>


        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">
                {leads.length === 0 ? "No leads yet - the Prospector agent will populate this automatically." : "No leads match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Business", "Location", "Contact", "Rating", "Tier / Booking", "Last Bad Review", "Status", "Added", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const rating = lead.overall_rating || lead.google_rating || 0;
                    const reviews = lead.total_reviews || lead.review_count || 0;
                    const ratingColor = rating < 4.0 ? "#EF4444" : rating < 4.3 ? "#F59E0B" : "#6B7280";
                    const badReviewName = lead.last_bad_review_name || lead.worst_review_name;
                    const badReviewRating = lead.last_bad_review_rating || lead.worst_review_rating;
                    const badReviewText = lead.last_bad_review_text || lead.worst_review_text;

                    return (
                      <>
                        <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{lead.business_name}</div>
                            <div className="text-xs text-gray-400">{BUSINESS_TYPE_LABELS[lead.business_type] ?? lead.business_type}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700">{lead.city || "-"}</div>
                            {lead.location && <div className="text-xs text-gray-400 max-w-[160px] truncate" title={lead.location}>{lead.location}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <Mail size={11} />{lead.email}
                                </a>
                              )}
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                                  <Phone size={11} />{lead.phone}
                                </a>
                              )}
                              {!lead.email && !lead.phone && <span className="text-xs text-gray-300">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Star size={13} fill={ratingColor} style={{ color: ratingColor }} />
                              <span className="font-semibold" style={{ color: ratingColor }}>{rating}</span>
                            </div>
                            <div className="text-xs text-gray-400">{reviews} reviews</div>
                          </td>
                          <td className="px-4 py-3">
                            {lead.tier != null && TIER_CONFIG[lead.tier] && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{ background: TIER_CONFIG[lead.tier].bg, color: TIER_CONFIG[lead.tier].color }}>
                                {TIER_CONFIG[lead.tier].label}
                              </span>
                            )}
                            {lead.booking_platform && (
                              <div className="text-xs mt-0.5" style={{ color: ["fresha", "booksy"].includes((lead.booking_platform || "").toLowerCase()) ? "#F59E0B" : "#6B7280" }}>
                                {lead.booking_platform}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {badReviewName ? (
                              <div className="max-w-[200px]">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-xs font-medium text-gray-700">{badReviewName}</span>
                                  {badReviewRating && <span className="text-xs text-red-500">{"★".repeat(badReviewRating)}</span>}
                                </div>
                                {badReviewText && (
                                  <p className="text-xs text-gray-500 italic truncate" title={badReviewText}>&ldquo;{badReviewText.slice(0, 80)}{badReviewText.length > 80 ? "…" : ""}&rdquo;</p>
                                )}
                              </div>
                            ) : <span className="text-gray-300 text-xs">-</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={STATUS_COLORS[lead.status]}>
                              {STATUS_LABELS[lead.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {lead.status === "new" && (
                                <button onClick={() => updateStatus(lead.id, "approved")}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
                                  style={{ background: G }}>
                                  <CircleCheck size={12} /> Approve
                                </button>
                              )}
                              {lead.status === "approved" && (
                                <button onClick={() => updateStatus(lead.id, "new")}
                                  className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                                  Unapprove
                                </button>
                              )}
                              {lead.status !== "rejected" && lead.status !== "customer" && lead.status !== "approved" && (
                                <button onClick={() => updateStatus(lead.id, "rejected")}
                                  className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200">
                                  <CircleX size={12} /> Reject
                                </button>
                              )}
                              <button onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                                {expandedRow === lead.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              <button onClick={() => openEdit(lead)}
                                className="flex items-center rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                                <Pencil size={12} />
                              </button>
                              {deletingId === lead.id ? (
                                <span className="flex items-center gap-1">
                                  <button onClick={() => deleteLead(lead.id)}
                                    className="rounded-md px-2 py-1 text-xs font-medium text-white"
                                    style={{ background: "#EF4444" }}>Confirm</button>
                                  <button onClick={() => setDeletingId(null)}
                                    className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600">Cancel</button>
                                </span>
                              ) : (
                                <button onClick={() => setDeletingId(lead.id)}
                                  className="flex items-center rounded-md border border-gray-200 p-1.5 text-red-400 hover:bg-red-50 hover:border-red-200">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expandedRow === lead.id && (
                          <tr key={`${lead.id}-detail`} className="border-b border-gray-100 bg-slate-50/50">
                            <td colSpan={9} className="px-4 py-5">
                              <div className="grid grid-cols-3 gap-4">
                                {/* Contact details */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact Details</p>
                                  <div className="text-sm space-y-1">
                                    {lead.email && <div className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" /><a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a></div>}
                                    {lead.phone && <div className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /><span className="text-gray-700">{lead.phone}</span></div>}
                                    {lead.instagram_handle && <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs">@</span><span className="text-gray-700">{lead.instagram_handle}</span></div>}
                                    <div className="text-xs text-gray-400">{lead.location}</div>
                                  </div>
                                  {lead.score && (
                                    <div className="flex items-center gap-2 pt-1">
                                      <span className="text-xs text-gray-500">Score:</span>
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                                        style={{ background: lead.score >= 70 ? "rgba(0,200,150,0.12)" : "#F3F4F6", color: lead.score >= 70 ? G : "#6B7280" }}>
                                        {lead.score}
                                      </span>
                                      {lead.tier != null && TIER_CONFIG[lead.tier] && (
                                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                          style={{ background: TIER_CONFIG[lead.tier].bg, color: TIER_CONFIG[lead.tier].color }}>
                                          {TIER_CONFIG[lead.tier].label}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {lead.booking_platform && (
                                    <div className="text-xs text-gray-500 pt-1">
                                      Booking: <span className="font-medium" style={{ color: ["fresha", "booksy"].includes((lead.booking_platform || "").toLowerCase()) ? "#F59E0B" : "#374151" }}>{lead.booking_platform}</span>
                                    </div>
                                  )}
                                  {lead.notes && <p className="text-xs text-gray-500 pt-1">{lead.notes}</p>}
                                  {((lead as any).icp_score != null) && (
                                    <div className="pt-2 space-y-1">
                                      <IcpBadge score={(lead as any).icp_score} />
                                      <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
                                        {(lead as any).has_website && <span>✓ Website</span>}
                                        {(lead as any).has_online_booking && <span>✓ Online booking{(lead as any).booking_system ? ` (${(lead as any).booking_system})` : ""}</span>}
                                      </div>
                                      {(lead as any).icp_notes && <p className="text-xs text-gray-500 italic">{(lead as any).icp_notes}</p>}
                                    </div>
                                  )}
                                </div>

                                {/* Last bad review */}
                                <div>
                                  <ReviewCard
                                    title="Last Bad Review"
                                    name={lead.last_bad_review_name || ""}
                                    rating={lead.last_bad_review_rating || 0}
                                    date={lead.last_bad_review_date || ""}
                                    text={lead.last_bad_review_text || ""}
                                    color="#F59E0B"
                                  />
                                </div>

                                {/* Worst review */}
                                <div>
                                  <ReviewCard
                                    title="Worst Review"
                                    name={lead.worst_review_name || ""}
                                    rating={lead.worst_review_rating || 0}
                                    date={lead.worst_review_date || ""}
                                    text={lead.worst_review_text || ""}
                                    color="#EF4444"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">Showing {filtered.length} of {total} leads</p>

        {/* Edit Modal */}
        {editingLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setEditingLead(null); }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit lead - {editingLead.business_name}</h2>
                <button onClick={() => setEditingLead(null)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><CircleX size={20} /></button>
              </div>
              <LeadFormFields formState={editForm} setFormState={setEditForm} />
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setEditingLead(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={saveEdit} disabled={saving || !editForm.business_name.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: G }}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Add lead manually</h2>
                <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><CircleX size={20} /></button>
              </div>
              <LeadFormFields formState={form} setFormState={setForm} />
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={addLead} disabled={saving || !form.business_name.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: G }}>
                  {saving ? "Adding..." : "Add lead"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
