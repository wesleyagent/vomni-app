"use client";

import { useState, useEffect } from "react";
import { Search, Plus, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { supabase, supabaseConfigured, type Lead, type LeadStatus, type BusinessType, type OutreachChannel } from "@/lib/supabase";

const G = "#00C896";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  contacted: "Contacted",
  replied: "Replied",
  demo_booked: "Demo Booked",
  customer: "Customer",
};

const STATUS_COLORS: Record<LeadStatus, { bg: string; color: string }> = {
  new: { bg: "#F3F4F6", color: "#6B7280" },
  approved: { bg: "rgba(0,200,150,0.1)", color: G },
  rejected: { bg: "#FEF2F2", color: "#EF4444" },
  contacted: { bg: "#EFF6FF", color: "#3B82F6" },
  replied: { bg: "#FFF7ED", color: "#F59E0B" },
  demo_booked: { bg: "rgba(0,200,150,0.15)", color: "#059669" },
  customer: { bg: "rgba(0,200,150,0.2)", color: "#047857" },
};

const BUSINESS_TYPES: BusinessType[] = ["barber", "salon", "restaurant", "dentist", "tattoo", "other"];

const emptyForm = {
  business_name: "",
  business_type: "barber" as BusinessType,
  location: "",
  city: "",
  country: "UK",
  google_rating: "",
  review_count: "",
  competitor_name: "",
  competitor_rating: "",
  instagram_handle: "",
  email: "",
  outreach_channel: "instagram" as OutreachChannel,
  score: "5",
  notes: "",
};

export default function LeadPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    if (!supabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: LeadStatus) {
    if (!supabaseConfigured) return;
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
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
      review_count: parseInt(form.review_count) || 0,
      competitor_name: form.competitor_name,
      competitor_rating: parseFloat(form.competitor_rating) || 0,
      instagram_handle: form.instagram_handle,
      email: form.email,
      outreach_channel: form.outreach_channel,
      score: parseInt(form.score) || 5,
      status: "new" as LeadStatus,
      notes: form.notes,
    };
    if (supabaseConfigured) {
      const { data } = await supabase.from("leads").insert(payload).select().single();
      if (data) setLeads((prev) => [data as Lead, ...prev]);
    } else {
      const mock = { ...payload, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setLeads((prev) => [mock as Lead, ...prev]);
    }
    setForm(emptyForm);
    setShowAddModal(false);
    setSaving(false);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const total = leads.length;
  const approved = leads.filter((l) => ["approved", "contacted", "replied", "demo_booked", "customer"].includes(l.status)).length;
  const contacted = leads.filter((l) => ["contacted", "replied", "demo_booked", "customer"].includes(l.status)).length;
  const replied = leads.filter((l) => ["replied", "demo_booked", "customer"].includes(l.status)).length;
  const demos = leads.filter((l) => l.status === "demo_booked" || l.status === "customer").length;
  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

  // ── Filters ──────────────────────────────────────────────────────────────
  const cities = [...new Set(leads.map((l) => l.city).filter(Boolean))].sort();

  const filtered = leads.filter((l) => {
    if (search && !l.business_name.toLowerCase().includes(search.toLowerCase()) && !l.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && l.business_type !== filterType) return false;
    if (filterCity !== "all" && l.city !== filterCity) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterScore !== "all") {
      if (filterScore === "tier1" && l.score < 7) return false;
      if (filterScore === "tier2" && (l.score < 4 || l.score > 6)) return false;
    }
    return true;
  });

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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: G }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
          >
            <Plus size={16} /> Add lead manually
          </button>
        </div>

        {/* Stats bar */}
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
              placeholder="Search by name or city..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            />
          </div>
          {[
            { label: "Type", value: filterType, setter: setFilterType, options: [["all", "All types"], ...BUSINESS_TYPES.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])] },
            { label: "City", value: filterCity, setter: setFilterCity, options: [["all", "All cities"], ...cities.map((c) => [c, c])] },
            { label: "Status", value: filterStatus, setter: setFilterStatus, options: [["all", "All statuses"], ...Object.entries(STATUS_LABELS)] },
            { label: "Score", value: filterScore, setter: setFilterScore, options: [["all", "All scores"], ["tier1", "Tier 1 (7-10)"], ["tier2", "Tier 2 (4-6)"]] },
          ].map(({ value, setter, options }) => (
            <select
              key={value + options.length}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
        </div>

        {/* Supabase not configured banner */}
        {!supabaseConfigured && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">Supabase not configured. Add <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment variables.</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">
                {leads.length === 0 ? "No leads yet. Add one manually or activate the Prospector agent." : "No leads match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Business", "Type", "Location", "Rating", "Reviews", "Competitor", "Channel", "Score", "Status", "Added", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <>
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.business_name}</td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{lead.business_type}</td>
                        <td className="px-4 py-3 text-gray-600">{lead.city || lead.location}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.google_rating}★</td>
                        <td className="px-4 py-3 text-gray-600">{lead.review_count}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.competitor_name ? (
                            <span>{lead.competitor_name} <span className="text-gray-400">({lead.competitor_rating}★)</span></span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: lead.outreach_channel === "instagram" ? "#EEF2FF" : "#F0FDF4", color: lead.outreach_channel === "instagram" ? "#6366F1" : "#16A34A" }}>
                            {lead.outreach_channel === "instagram" ? "Instagram" : "Email"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: lead.score >= 7 ? "rgba(0,200,150,0.12)" : "#F3F4F6", color: lead.score >= 7 ? G : "#6B7280" }}>
                            {lead.score}
                          </span>
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
                              <button
                                onClick={() => updateStatus(lead.id, "approved")}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
                                style={{ background: G }}
                                title="Approve"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                            )}
                            {lead.status !== "rejected" && lead.status !== "customer" && (
                              <button
                                onClick={() => updateStatus(lead.id, "rejected")}
                                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                title="Reject"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                              className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              {expandedRow === lead.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} View
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === lead.id && (
                        <tr key={`${lead.id}-detail`} className="border-b border-gray-100 bg-gray-50/30">
                          <td colSpan={11} className="px-4 py-4">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Instagram</p><p className="mt-1 text-gray-700">{lead.instagram_handle || "—"}</p></div>
                              <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p><p className="mt-1 text-gray-700">{lead.email || "—"}</p></div>
                              <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Country</p><p className="mt-1 text-gray-700">{lead.country}</p></div>
                              <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</p><p className="mt-1 text-gray-700">{lead.notes || "—"}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Lead Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Add lead manually</h2>
                <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6">
                {[
                  { label: "Business name *", key: "business_name", placeholder: "Elite Barbers" },
                  { label: "City", key: "city", placeholder: "London" },
                  { label: "Location / area", key: "location", placeholder: "Shoreditch, London" },
                  { label: "Country", key: "country", placeholder: "UK" },
                  { label: "Google rating", key: "google_rating", placeholder: "3.9" },
                  { label: "Review count", key: "review_count", placeholder: "34" },
                  { label: "Competitor name", key: "competitor_name", placeholder: "Kings Cuts" },
                  { label: "Competitor rating", key: "competitor_rating", placeholder: "4.6" },
                  { label: "Instagram handle", key: "instagram_handle", placeholder: "@elitebarbers" },
                  { label: "Email", key: "email", placeholder: "hello@elitebarbers.co.uk" },
                  { label: "Lead score (1-10)", key: "score", placeholder: "7" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                      onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Business type</label>
                  <select value={form.business_type} onChange={(e) => setForm((f) => ({ ...f, business_type: e.target.value as BusinessType }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Outreach channel</label>
                  <select value={form.outreach_channel} onChange={(e) => setForm((f) => ({ ...f, outreach_channel: e.target.value as OutreachChannel }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                    <option value="instagram">Instagram DM</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Why this lead, any context..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
                    onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={addLead}
                  disabled={saving || !form.business_name.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: G }}
                >
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
