"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Download, Check, Trash2, AlertCircle } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const G = "#00C896";
const N = "#0A0F1E";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  business: string | null;
  message: string;
  status: "new" | "read" | "replied";
  created_at: string;
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  new:     { label: "New",     bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
  read:    { label: "Read",    bg: "rgba(0,200,150,0.1)",   color: G },
  replied: { label: "Replied", bg: "#F3F4F6",               color: "#6B7280" },
};

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "read" | "replied">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSubmissions(data as ContactSubmission[]);
      setSelected(prev => {
        if (!prev) return null;
        return (data as ContactSubmission[]).find(s => s.id === prev.id) || prev;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  async function markStatus(id: string, status: ContactSubmission["status"]) {
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }

  async function handleDelete(id: string) {
    await supabase.from("contact_submissions").delete().eq("id", id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleteConfirm(null);
  }

  function exportCSV() {
    const rows = [
      ["Name", "Email", "Business", "Message", "Status", "Date"],
      ...submissions.map(s => [
        s.name, s.email, s.business || "", s.message, s.status, formatDate(s.created_at),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);
  const newCount = submissions.filter(s => s.status === "new").length;

  const FILTER_LABELS = { all: "All", new: "New", read: "Read", replied: "Replied" };

  return (
    <div className="flex h-screen flex-col" style={{ background: "#F7F8FA" }}>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Contact Submissions
            </h1>
            <p className="mt-1 text-sm text-gray-500">Messages submitted via the contact form</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="mt-0.5 text-xl font-bold" style={{ color: N }}>{submissions.length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">New</p>
              <p className="mt-0.5 text-xl font-bold" style={{ color: newCount > 0 ? "#EF4444" : N }}>{newCount}</p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">Supabase not configured — submissions will not load.</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* Left: list */}
        <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">
          {/* Filter tabs */}
          <div className="flex-shrink-0 flex gap-1 border-b border-gray-100 px-3 py-3">
            {(Object.keys(FILTER_LABELS) as (keyof typeof FILTER_LABELS)[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                style={filter === f ? { background: G, color: "white" } : { color: "#6B7280" }}
                onMouseEnter={e => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
                onMouseLeave={e => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {FILTER_LABELS[f]}
                {f === "new" && newCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-white" style={{ fontSize: 10 }}>
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">No submissions yet.</p>
            ) : (
              filtered.map(sub => {
                const isSelected = selected?.id === sub.id;
                const st = STATUS_STYLES[sub.status] || STATUS_STYLES.new;
                return (
                  <div key={sub.id}
                    className="w-full border-b border-gray-50 relative group"
                    style={{ borderLeft: isSelected ? `3px solid ${G}` : "3px solid transparent" }}
                  >
                    <button onClick={() => {
                      setSelected(sub);
                      if (sub.status === "new") markStatus(sub.id, "read");
                    }}
                      className="w-full p-4 text-left transition-colors"
                      style={{ background: isSelected ? "rgba(0,200,150,0.04)" : "transparent" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{sub.name}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0">{relativeTime(sub.created_at)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">{sub.email}</p>
                      <p className="mt-1 text-xs text-gray-400 truncate">{sub.message.slice(0, 55)}{sub.message.length > 55 ? "…" : ""}</p>
                      <div className="mt-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </button>

                    {/* Delete */}
                    {deleteConfirm === sub.id ? (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 py-1 shadow-sm z-10">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button onClick={e => { e.stopPropagation(); handleDelete(sub.id); }}
                          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5">Yes</button>
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                          className="text-xs text-gray-500 hover:text-gray-700">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(sub.id); }}
                        className="absolute top-2 right-2 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                        title="Delete submission"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Mail size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">Select a submission to view it</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
              {/* Detail header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  <a href={`mailto:${selected.email}`}
                    className="text-sm mt-0.5 hover:underline"
                    style={{ color: G }}>
                    {selected.email}
                  </a>
                  {selected.business && (
                    <p className="text-sm text-gray-500 mt-0.5">{selected.business}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(selected.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={e => markStatus(selected.id, e.target.value as ContactSubmission["status"])}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                  </select>
                  {deleteConfirm === selected.id ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1">
                      <span className="text-xs text-red-600 font-medium">Delete?</span>
                      <button onClick={() => handleDelete(selected.id)} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(selected.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Message</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Quick reply link */}
              <div className="mt-4">
                <a
                  href={`mailto:${selected.email}?subject=Re: Your message to Vomni`}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
                  style={{ background: G }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}
                  onClick={() => markStatus(selected.id, "replied")}
                >
                  <Mail size={14} />
                  Reply via email
                </a>
                {selected.status !== "replied" && (
                  <button
                    onClick={() => markStatus(selected.id, "replied")}
                    className="ml-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Check size={14} />
                    Mark as replied
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
