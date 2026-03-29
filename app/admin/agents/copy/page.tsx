"use client";

import { useState, useEffect } from "react";
import { Check, Pencil, X, Send, Copy } from "lucide-react";
import { type CopyQueueItem, type Lead } from "@/lib/supabase";

const G = "#00C896";

type Filter = "all" | "pending" | "approved" | "sent" | "replied";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending approval",
  approved: "Approved",
  sent: "Sent",
  replied: "Replied",
};

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function CopyQueuePage() {
  const [items, setItems] = useState<CopyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CopyQueueItem | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingVariant, setEditingVariant] = useState<"a" | "b" | "c" | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const res = await fetch('/api/admin/db/copy_queue?select=*,lead:leads(*)&order=created_at.desc');
    const data = await res.json();
    if (Array.isArray(data)) {
      setItems(data as CopyQueueItem[]);
      if (data.length > 0 && !selected) setSelected(data[0] as CopyQueueItem);
    }
    setLoading(false);
  }

  async function approveVariant(variant: "a" | "b" | "c") {
    if (!selected) return;
    const update = { approved_variant: variant, status: "approved" as const };
    await fetch(`/api/admin/db/copy_queue?id=${selected.id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(update),
    });
    const updated = { ...selected, ...update };
    setItems((prev) => prev.map((i) => i.id === selected.id ? updated : i));
    setSelected(updated);
  }

  async function markSent() {
    if (!selected) return;
    const update = { status: "sent" as const, sent_at: new Date().toISOString() };
    await fetch(`/api/admin/db/copy_queue?id=${selected.id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(update),
    });
    if (selected.lead_id) {
      await fetch(`/api/admin/db/leads?id=${selected.lead_id}`, {
        method: 'PATCH', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: "contacted", updated_at: new Date().toISOString() }),
      });
    }
    const updated = { ...selected, ...update };
    setItems((prev) => prev.map((i) => i.id === selected.id ? updated : i));
    setSelected(updated);
  }

  async function rejectAll() {
    if (!selected) return;
    const update = { status: "pending" as const, approved_variant: null };
    await fetch(`/api/admin/db/copy_queue?id=${selected.id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(update),
    });
    const updated = { ...selected, ...update };
    setItems((prev) => prev.map((i) => i.id === selected.id ? updated : i));
    setSelected(updated);
  }

  function saveEdit() {
    if (!selected || !editingVariant) return;
    const key = `variant_${editingVariant}` as "variant_a" | "variant_b" | "variant_c";
    fetch(`/api/admin/db/copy_queue?id=${selected.id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ [key]: editText }),
    });
    const updated = { ...selected, [key]: editText };
    setItems((prev) => prev.map((i) => i.id === selected.id ? updated : i));
    setSelected(updated);
    setEditingVariant(null);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const total = items.length;
  const approved = items.filter((i) => i.status === "approved" || i.status === "sent" || i.status === "replied").length;
  const sent = items.filter((i) => i.status === "sent" || i.status === "replied").length;
  const replied = items.filter((i) => i.status === "replied").length;
  const replyRate = sent > 0 ? `${Math.round((replied / sent) * 100)}%` : "-";

  const selectedLead = selected?.lead as Lead | undefined;

  return (
    <div className="flex h-screen flex-col" style={{ background: "#F7F8FA" }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Copy Queue</h1>
            <p className="mt-1 text-sm text-gray-500">Messages written by the Outreach Writer - approve before sending</p>
          </div>
          <div className="flex gap-3">
            <StatPill label="Written" value={total} />
            <StatPill label="Approved" value={approved} />
            <StatPill label="Sent" value={sent} />
            <StatPill label="Reply rate" value={replyRate} />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex gap-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={filter === f ? { background: G, color: "#fff" } : { color: "#6B7280" }}
              onMouseEnter={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>


      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left - queue list */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No messages{filter !== "all" ? ` with status "${FILTER_LABELS[filter]}"` : ""} yet.</p>
          ) : (
            filtered.map((item) => {
              const lead = item.lead as Lead | undefined;
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="w-full border-b border-gray-50 p-4 text-left transition-colors"
                  style={{ background: isSelected ? "rgba(0,200,150,0.05)" : "transparent", borderLeft: isSelected ? `3px solid ${G}` : "3px solid transparent" }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <p className="text-sm font-medium text-gray-900">{lead?.business_name ?? "Unknown business"}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{lead?.city ?? ""} · {lead?.google_rating ?? "?"}★</p>
                  <span className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: item.status === "pending" ? "#F3F4F6" : item.status === "approved" ? "rgba(0,200,150,0.1)" : item.status === "sent" ? "#EFF6FF" : "#F0FDF4",
                      color: item.status === "pending" ? "#6B7280" : item.status === "approved" ? G : item.status === "sent" ? "#3B82F6" : "#16A34A",
                    }}>
                    {FILTER_LABELS[item.status as Filter] ?? item.status}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Centre - variants */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">Select a lead from the queue to see its messages</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(["a", "b", "c"] as const).map((v) => {
                const bodyKey = `variant_${v}` as "variant_a" | "variant_b" | "variant_c";
                const subjectKey = `subject_${v}` as "subject_a" | "subject_b" | "subject_c";
                const bodyText = selected[bodyKey];
                const subjectText = selected[subjectKey];
                const isApproved = selected.approved_variant === v;
                const isEditing = editingVariant === v;
                const variantLabels = { a: "Variant A - Pain angle", b: "Variant B - Revenue angle", c: "Variant C - Empathy angle" };
                const fullText = subjectText ? `Subject: ${subjectText}\n\n${bodyText}` : bodyText;
                return (
                  <div key={v} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                    style={isApproved ? { borderColor: G, borderWidth: 2 } : {}}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">{variantLabels[v]}</span>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(0,200,150,0.1)", color: G }}>
                            <Check size={10} /> Approved
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(fullText, v)} className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          <Copy size={11} /> {copied === v ? "Copied!" : "Copy all"}
                        </button>
                        <button onClick={() => { setEditingVariant(v); setEditText(bodyText); }} className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          <Pencil size={11} /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Subject line */}
                    {subjectText ? (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2">Subject:</span>
                        <span className="text-sm font-medium text-gray-800">{subjectText}</span>
                      </div>
                    ) : (
                      <div className="mb-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
                        <span className="text-xs text-gray-400 italic">No subject line written</span>
                      </div>
                    )}

                    {/* Body */}
                    {isEditing ? (
                      <div>
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6}
                          className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none resize-none"
                          style={{ borderColor: G }}
                        />
                        <div className="mt-2 flex gap-2">
                          <button onClick={saveEdit} className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ background: G }}>Save</button>
                          <button onClick={() => setEditingVariant(null)} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bodyText || <span className="text-gray-400 italic">No message body written yet</span>}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right - actions */}
        <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-gray-100 bg-white p-4">
          {!selected ? (
            <p className="text-xs text-gray-400 text-center mt-8">Select a lead to see actions</p>
          ) : (
            <div>
              {/* Lead details */}
              {selectedLead && (
                <div className="mb-5 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{selectedLead.business_name}</p>
                  <p className="text-xs text-gray-500">{selectedLead.city}</p>
                  <p className="mt-1 text-xs text-gray-600">{selectedLead.google_rating}★ · {selectedLead.review_count} reviews</p>
                  {selectedLead.competitor_name && (
                    <p className="mt-0.5 text-xs text-gray-500">{selectedLead.competitor_name} has {selectedLead.competitor_rating}★</p>
                  )}
                </div>
              )}

              <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>
              <div className="space-y-2">
                {(["a", "b", "c"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => approveVariant(v)}
                    className="w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors"
                    style={selected.approved_variant === v
                      ? { borderColor: G, background: "rgba(0,200,150,0.05)", color: "#059669" }
                      : { borderColor: "#E5E7EB", color: "#374151" }}
                    onMouseEnter={(e) => { if (selected.approved_variant !== v) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { if (selected.approved_variant !== v) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Check size={14} style={{ color: selected.approved_variant === v ? G : "#9CA3AF" }} />
                    Approve Variant {v.toUpperCase()}
                  </button>
                ))}

                {selected.approved_variant && selected.status !== "sent" && (
                  <button
                    onClick={markSent}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white"
                    style={{ background: G }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                  >
                    <Send size={14} /> Mark as sent
                  </button>
                )}

                <button
                  onClick={rejectAll}
                  className="w-full flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <X size={14} /> Reject all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
