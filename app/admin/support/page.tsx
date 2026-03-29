"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Download, Check, Send, UserCheck, Circle, Trash2 } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const G = "#00C896";
const N = "#0A0F1E";
const AMBER = "#F59E0B";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbMessage {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: string;
  isAgent?: boolean;
}

interface Conversation {
  id: string;
  session_id: string;
  business_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  messages: DbMessage[];
  status: "active" | "needs_human" | "resolved";
  source: "landing_page" | "dashboard";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

type MainFilter = "all" | "needs_human" | "active" | "resolved";
type PageTab = "inbox" | "leads";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function lastMessage(conv: Conversation): string {
  if (!conv.messages || conv.messages.length === 0) return "No messages";
  const last = conv.messages[conv.messages.length - 1];
  return last.content.slice(0, 60) + (last.content.length > 60 ? "…" : "");
}

function visitorLabel(conv: Conversation): string {
  return conv.visitor_name || "Anonymous visitor";
}

function firstUserQuestion(conv: Conversation): string {
  const userMsg = conv.messages?.find((m) => m.role === "user");
  return userMsg?.content?.slice(0, 80) || "-";
}

const STATUS_STYLES: Record<string, { dot: string; label: string; bg: string; color: string }> = {
  needs_human: { dot: "#EF4444", label: "Needs Human", bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
  active: { dot: G, label: "Active", bg: "rgba(0,200,150,0.1)", color: G },
  resolved: { dot: "#9CA3AF", label: "Resolved", bg: "#F3F4F6", color: "#6B7280" },
};

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold" style={{ color: accent || N }}>{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<MainFilter>("all");
  const [pageTab, setPageTab] = useState<PageTab>("inbox");
  const [adminInput, setAdminInput] = useState("");
  const [sending, setSending] = useState(false);
  const [contactedIds,   setContactedIds]   = useState<Set<string>>(new Set());
  const [deleteConfirm,  setDeleteConfirm]  = useState<string | null>(null); // id of conv pending delete
  const [deletingAll,    setDeletingAll]    = useState(false);
  const [confirmBulk,    setConfirmBulk]    = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) {
      setConversations(data as Conversation[]);
      // Update selected if it's open
      setSelected((prev) => {
        if (!prev) return null;
        const updated = (data as Conversation[]).find((c) => c.id === prev.id);
        return updated || prev;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Realtime
  useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase
      .channel("support-inbox-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  // Scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  // ── Admin actions ───────────────────────────────────────────────────────────

  async function handleSendAsHuman() {
    if (!adminInput.trim() || !selected || sending) return;
    setSending(true);

    const agentMsg: DbMessage = {
      id: genId(),
      role: "agent",
      content: adminInput.trim(),
      timestamp: new Date().toISOString(),
      isAgent: true,
    };

    const updatedMsgs = [...(selected.messages || []), agentMsg];
    const { error } = await supabase
      .from("chat_conversations")
      .update({ messages: updatedMsgs, updated_at: new Date().toISOString() })
      .eq("id", selected.id);

    if (!error) {
      setSelected({ ...selected, messages: updatedMsgs });
      setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, messages: updatedMsgs } : c));
      setAdminInput("");
    }
    setSending(false);
  }

  async function handleStatusChange(status: "active" | "needs_human" | "resolved") {
    if (!selected) return;
    const updates: Partial<Conversation> = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString(), resolved_by: "admin" } : {}),
    };
    await supabase.from("chat_conversations").update(updates).eq("id", selected.id);
    const updated = { ...selected, ...updates };
    setSelected(updated);
    setConversations((prev) => prev.map((c) => c.id === selected.id ? updated : c));
  }

  async function handleMarkResolved() {
    await handleStatusChange("resolved");
  }

  function handleMarkContacted(id: string) {
    setContactedIds((prev) => new Set([...prev, id]));
  }

  async function handleDeleteOne(id: string) {
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleteConfirm(null);
  }

  async function handleDeleteAllResolved() {
    setDeletingAll(true);
    await supabase.from("chat_conversations").delete().eq("status", "resolved");
    setConversations((prev) => prev.filter((c) => c.status !== "resolved"));
    if (selected?.status === "resolved") setSelected(null);
    setDeletingAll(false);
    setConfirmBulk(false);
  }

  function exportLeadsCSV() {
    const leads = conversations.filter((c) => c.visitor_email);
    const rows = [
      ["Name", "Email", "Source", "First Question", "Date", "Status"],
      ...leads.map((c) => [
        c.visitor_name || "Anonymous",
        c.visitor_email || "",
        c.source === "landing_page" ? "Landing page" : "Dashboard",
        firstUserQuestion(c),
        formatDate(c.created_at),
        contactedIds.has(c.id) ? "Contacted" : "Not contacted",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vomni-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayConvs = conversations.filter((c) => new Date(c.created_at) >= todayStart);
  const needsHumanCount = conversations.filter((c) => c.status === "needs_human").length;
  const resolvedToday = conversations.filter((c) => c.status === "resolved" && c.resolved_at && new Date(c.resolved_at) >= todayStart).length;
  const leadsWithEmail = conversations.filter((c) => c.visitor_email).length;

  // ── Filtered conversations ──────────────────────────────────────────────────

  const filtered = filter === "all" ? conversations : conversations.filter((c) => c.status === filter);

  const FILTER_LABELS: Record<MainFilter, string> = { all: "All", needs_human: "Needs Human", active: "Active", resolved: "Resolved" };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col" style={{ background: "#F7F8FA" }}>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Support Inbox</h1>
            <p className="mt-1 text-sm text-gray-500">Live chat conversations from your website and dashboard</p>
          </div>
          <div className="flex items-start gap-3 flex-wrap">
            <StatPill label="Today" value={todayConvs.length} />
            <StatPill label="Needs Human" value={needsHumanCount} accent={needsHumanCount > 0 ? "#EF4444" : undefined} />
            <StatPill label="Leads captured" value={leadsWithEmail} accent={G} />
            <StatPill label="Resolved today" value={resolvedToday} />
            {conversations.filter((c) => c.status === "resolved").length > 0 && (
              confirmBulk ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700 font-medium">
                    Delete all {conversations.filter((c) => c.status === "resolved").length} resolved?
                  </p>
                  <button
                    onClick={handleDeleteAllResolved}
                    disabled={deletingAll}
                    className="rounded px-2 py-1 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deletingAll ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmBulk(false)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBulk(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm self-stretch"
                >
                  <Trash2 size={13} />
                  Delete resolved ({conversations.filter((c) => c.status === "resolved").length})
                </button>
              )
            )}
          </div>
        </div>

        {/* Page tabs */}
        <div className="mt-4 flex gap-1 border-b border-gray-100 pb-0">
          {(["inbox", "leads"] as PageTab[]).map((t) => (
            <button key={t} onClick={() => setPageTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize transition-colors"
              style={pageTab === t ? { color: G, borderBottom: `2px solid ${G}` } : { color: "#6B7280" }}
            >
              {t === "inbox" ? "Inbox" : `Leads (${leadsWithEmail})`}
            </button>
          ))}
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">Supabase not configured - conversations will not load. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.</p>
        </div>
      )}

      {/* ── INBOX TAB ────────────────────────────────────────────────────── */}
      {pageTab === "inbox" && (
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel */}
          <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">
            {/* Filter tabs */}
            <div className="flex-shrink-0 flex gap-1 border-b border-gray-100 px-3 py-3">
              {(Object.keys(FILTER_LABELS) as MainFilter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={filter === f ? { background: G, color: "white" } : { color: "#6B7280" }}
                  onMouseEnter={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
                  onMouseLeave={(e) => { if (filter !== f) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {FILTER_LABELS[f]}
                  {f === "needs_human" && needsHumanCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-white" style={{ fontSize: 10 }}>
                      {needsHumanCount}
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
                <p className="p-6 text-center text-sm text-gray-400">No conversations yet.</p>
              ) : (
                filtered.map((conv) => {
                  const isSelected = selected?.id === conv.id;
                  const st = STATUS_STYLES[conv.status] || STATUS_STYLES.active;
                  return (
                    <div key={conv.id}
                      className="w-full border-b border-gray-50 relative group"
                      style={{ borderLeft: isSelected ? `3px solid ${G}` : "3px solid transparent" }}
                    >
                      <button onClick={() => setSelected(conv)}
                        className="w-full p-4 text-left transition-colors"
                        style={{ background: isSelected ? "rgba(0,200,150,0.04)" : "transparent" }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{visitorLabel(conv)}</p>
                          <div className="flex-shrink-0 flex items-center gap-1.5">
                            <Circle size={8} fill={st.dot} style={{ color: st.dot }} />
                            <span className="text-xs text-gray-400">{relativeTime(conv.updated_at)}</span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 truncate">{lastMessage(conv)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: conv.source === "dashboard" ? "rgba(0,200,150,0.1)" : "#F3F4F6", color: conv.source === "dashboard" ? G : "#6B7280" }}>
                            {conv.source === "landing_page" ? "Landing page" : "Dashboard"}
                          </span>
                          {conv.visitor_email && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">Has email</span>
                          )}
                        </div>
                      </button>

                      {/* Delete button - shown on hover, or when confirm is active for this item */}
                      {conv.status === "resolved" && (
                        deleteConfirm === conv.id ? (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 py-1 shadow-sm z-10">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteOne(conv.id); }}
                              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5"
                            >Yes</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(conv.id); }}
                            className="absolute top-2 right-2 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} />
                          </button>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {!selected ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">Select a conversation to view it</p>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{visitorLabel(selected)}</h2>
                      {selected.visitor_email && (
                        <p className="text-sm text-gray-500">{selected.visitor_email}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: selected.source === "dashboard" ? "rgba(0,200,150,0.1)" : "#F3F4F6", color: selected.source === "dashboard" ? G : "#6B7280" }}>
                          {selected.source === "landing_page" ? "Landing page" : "Dashboard"}
                        </span>
                        <span className="text-xs text-gray-400">Started {formatDate(selected.created_at)}</span>
                      </div>
                    </div>
                    {/* Status dropdown + delete */}
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: STATUS_STYLES[selected.status]?.bg, color: STATUS_STYLES[selected.status]?.color }}>
                        {STATUS_STYLES[selected.status]?.label}
                      </span>
                      <select
                        value={selected.status}
                        onChange={(e) => handleStatusChange(e.target.value as "active" | "needs_human" | "resolved")}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none"
                        style={{ cursor: "pointer" }}
                      >
                        <option value="active">Active</option>
                        <option value="needs_human">Needs Human</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {selected.status === "resolved" && (
                        deleteConfirm === selected.id ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button onClick={() => handleDeleteOne(selected.id)} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(selected.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete this conversation"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Thread */}
                <div className="flex-1 overflow-y-auto px-6 py-5" style={{ background: "#F7F8FA" }}>
                  <div className="space-y-4">
                    {(selected.messages || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg) => {
                      const isUser = msg.role === "user";
                      const isAgent = msg.isAgent || msg.role === "agent";
                      return (
                        <div key={msg.id}>
                          {/* Label */}
                          <div className={`mb-1 text-xs font-medium text-gray-400 ${isUser ? "text-right" : "text-left"}`}>
                            {isUser ? "Visitor" : isAgent ? "Vomni Support (human)" : "Bot"}
                          </div>
                          <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                            <div style={{
                              maxWidth: "72%",
                              background: isUser ? G : isAgent ? "#374151" : "white",
                              color: isUser || isAgent ? "white" : N,
                              borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                              padding: "10px 14px",
                              fontSize: 14, lineHeight: 1.5,
                              boxShadow: isUser || isAgent ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                              whiteSpace: "pre-wrap", wordBreak: "break-word",
                            }}>
                              {msg.content}
                            </div>
                          </div>
                          <div className={`mt-1 text-xs text-gray-400 ${isUser ? "text-right" : "text-left"}`}>
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin reply */}
                <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4">
                  <textarea
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    placeholder="Reply as Vomni support..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none transition-colors"
                    onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendAsHuman(); }}
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={handleSendAsHuman}
                      disabled={!adminInput.trim() || sending}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: G }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                    >
                      <Send size={14} />
                      {sending ? "Sending…" : "Send as human"}
                    </button>
                    <button
                      onClick={handleMarkResolved}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      disabled={selected.status === "resolved"}
                    >
                      <Check size={14} />
                      Mark resolved
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">⌘+Enter or Ctrl+Enter to send</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LEADS TAB ────────────────────────────────────────────────────── */}
      {pageTab === "leads" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Captured Leads</h2>
              <p className="text-sm text-gray-500 mt-0.5">Visitors who shared their email through chat</p>
            </div>
            <button
              onClick={exportLeadsCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {conversations.filter((c) => c.visitor_email).length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-gray-400">No leads captured yet. They appear here when visitors share their email in the chat.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                    {["Name", "Email", "Source", "First question", "Date", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conversations
                    .filter((c) => c.visitor_email)
                    .map((conv, idx) => {
                      const isContacted = contactedIds.has(conv.id);
                      return (
                        <tr key={conv.id} style={{ borderBottom: idx < conversations.filter((c) => c.visitor_email).length - 1 ? "1px solid #F9FAFB" : "none" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{conv.visitor_name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{conv.visitor_email}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ background: conv.source === "dashboard" ? "rgba(0,200,150,0.1)" : "#F3F4F6", color: conv.source === "dashboard" ? G : "#6B7280" }}>
                              {conv.source === "landing_page" ? "Landing page" : "Dashboard"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{firstUserQuestion(conv)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(conv.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isContacted ? "text-green-700" : "text-gray-500"}`}
                              style={{ background: isContacted ? "rgba(0,200,150,0.1)" : "#F3F4F6" }}>
                              {isContacted ? "Contacted" : "Not contacted"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {!isContacted && (
                              <button
                                onClick={() => handleMarkContacted(conv.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <UserCheck size={12} />
                                Mark contacted
                              </button>
                            )}
                            {isContacted && <Check size={16} style={{ color: G }} />}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
