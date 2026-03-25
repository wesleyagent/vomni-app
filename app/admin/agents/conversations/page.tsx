"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Copy, Check, Calendar, X, AlertCircle, Send } from "lucide-react";
import { supabase, supabaseConfigured, type Conversation, type ConversationStatus, type Lead } from "@/lib/supabase";

const G = "#00C896";
const N = "#0A0F1E";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  new_reply: "New Reply",
  awaiting_response: "Awaiting Response",
  warm: "Warm",
  demo_booked: "Demo Booked",
  dead: "Dead",
};

const STATUS_COLORS: Record<ConversationStatus, { bg: string; color: string }> = {
  new_reply: { bg: "#FEF2F2", color: "#EF4444" },
  awaiting_response: { bg: "#FFF7ED", color: "#F59E0B" },
  warm: { bg: "rgba(0,200,150,0.1)", color: G },
  demo_booked: { bg: "rgba(0,200,150,0.15)", color: "#059669" },
  dead: { bg: "#F3F4F6", color: "#9CA3AF" },
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReplyText, setNewReplyText] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingResponse, setEditingResponse] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
  const [copied, setCopied] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected]);

  async function fetchData() {
    setLoading(true);
    if (supabaseConfigured) {
      const [convRes, leadsRes] = await Promise.all([
        supabase.from("conversations").select("*, lead:leads(*)").order("updated_at", { ascending: false }),
        supabase.from("leads").select("id, business_name, city, google_rating, review_count").eq("status", "contacted").order("business_name"),
      ]);
      if (convRes.data) { setConversations(convRes.data as Conversation[]); if (convRes.data.length > 0) setSelected(convRes.data[0] as Conversation); }
      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    }
    setLoading(false);
  }

  async function generateSuggestedResponse(thread: Conversation["thread"], businessName: string) {
    const lastReceived = [...thread].reverse().find((m) => m.role === "received");
    if (!lastReceived) return "";
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: `You are the Objection Handler for Vomni, a review management platform for UK service businesses (£70/month). When prospects reply to outreach, you move them toward a demo booking.

OBJECTION PLAYBOOK:
"Not interested" → "No problem at all — out of curiosity, is it that reviews aren't a priority right now, or that you haven't found the right way to collect them?"
"Too expensive" → "Totally fair to ask. One bad review costs the average barber around £12,000 in lost lifetime customer value. Vomni is £70/month. Most customers recover that in the first week — worth showing you how before you decide. When's 15 minutes free this week?"
"I already get reviews" → "That's great — how many are you getting per month? Most businesses we talk to are getting 2-3 naturally. Our customers average 15-20. The difference is just having it automated."
"I don't have time" → "That's exactly why we built it this way. Setup takes 20 minutes. After that you never touch it — it runs automatically after every appointment."
"How does it work?" → BUYING SIGNAL. Respond: "Happy to show you — much easier to see than explain. Takes about 15 minutes. When works best for you this week?"
"Let me think about it" → "Of course — is there anything specific you're weighing up? Happy to answer before you decide."

RULES: Never offer discounts. Max 4 lines. Always move toward a demo. Match their tone.

The business you are responding to: ${businessName}

Write ONLY the response message. No preamble, no explanation. Just the message itself.`,
          messages: [{ role: "user", content: `The prospect just replied: "${lastReceived.content}"\n\nWrite the best response to move them toward a demo.` }],
        }),
      });
      const data = await res.json();
      return data.content ?? "";
    } catch {
      return "";
    }
  }

  async function createConversation() {
    if (!newReplyText.trim()) return;
    setGenerating(true);
    const thread: Conversation["thread"] = [{ role: "received", content: newReplyText.trim(), timestamp: new Date().toISOString() }];
    const lead = leads.find((l) => l.id === newLeadId);
    const suggestedResponse = await generateSuggestedResponse(thread, lead?.business_name ?? "this business");

    const payload = {
      lead_id: newLeadId || null,
      thread,
      suggested_response: suggestedResponse,
      status: "new_reply" as ConversationStatus,
    };

    if (supabaseConfigured) {
      const { data } = await supabase.from("conversations").insert(payload).select("*, lead:leads(*)").single();
      if (data) {
        setConversations((prev) => [data as Conversation, ...prev]);
        setSelected(data as Conversation);
      }
    } else {
      const mock = { ...payload, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lead } as Conversation;
      setConversations((prev) => [mock, ...prev]);
      setSelected(mock);
    }
    setNewReplyText("");
    setNewLeadId("");
    setShowNewModal(false);
    setGenerating(false);
  }

  async function updateStatus(status: ConversationStatus) {
    if (!selected) return;
    if (supabaseConfigured) {
      await supabase.from("conversations").update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id);
      if (status === "demo_booked") {
        await supabase.from("leads").update({ status: "demo_booked", updated_at: new Date().toISOString() }).eq("id", selected.lead_id);
      }
    }
    const updated = { ...selected, status };
    setConversations((prev) => prev.map((c) => c.id === selected.id ? updated : c));
    setSelected(updated);
  }

  function copyResponse() {
    const text = editingResponse ? editedResponse : selected?.suggested_response ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const selectedLead = selected?.lead as Lead | undefined;

  return (
    <div className="flex h-screen flex-col" style={{ background: "#F7F8FA" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Active Conversations</h1>
          <p className="mt-0.5 text-sm text-gray-500">Replies from prospects — managed by the Objection Handler</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: G }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
        >
          <Plus size={16} /> New conversation
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <AlertCircle size={15} className="text-amber-600" />
          <p className="text-sm text-amber-700">Supabase not configured — conversations will not persist across page refreshes.</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — conversation list */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">No conversations yet.</p>
              <p className="mt-1 text-xs text-gray-400">Paste a reply you received to get started.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const lead = conv.lead as Lead | undefined;
              const isSelected = selected?.id === conv.id;
              const lastMsg = conv.thread[conv.thread.length - 1];
              return (
                <button
                  key={conv.id}
                  onClick={() => { setSelected(conv); setEditingResponse(false); }}
                  className="w-full border-b border-gray-50 p-4 text-left transition-colors"
                  style={{ background: isSelected ? "rgba(0,200,150,0.05)" : "transparent", borderLeft: isSelected ? `3px solid ${G}` : "3px solid transparent" }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead?.business_name ?? "Unknown"}</p>
                    <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={STATUS_COLORS[conv.status]}>
                      {STATUS_LABELS[conv.status]}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="mt-1 text-xs text-gray-500 truncate">{lastMsg.content}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(conv.updated_at)}</p>
                </button>
              );
            })
          )}
        </div>

        {/* Right panel — thread + response */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-400">Select a conversation from the list</p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedLead?.business_name ?? "Unknown business"}</h2>
                    {selectedLead && (
                      <p className="text-xs text-gray-500">{selectedLead.city} · {selectedLead.google_rating}★ · {selectedLead.review_count} reviews</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={STATUS_COLORS[selected.status]}>
                      {STATUS_LABELS[selected.status]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {selected.thread.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "sent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-sm rounded-2xl px-4 py-3 text-sm"
                      style={msg.role === "sent"
                        ? { background: N, color: "#fff", borderBottomRightRadius: 4 }
                        : { background: "#fff", color: "#111827", border: "1px solid #E5E7EB", borderBottomLeftRadius: 4 }}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="mt-1 text-xs opacity-50">{timeAgo(msg.timestamp)}</p>
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              {/* Suggested response */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objection Handler suggested response</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingResponse(!editingResponse); setEditedResponse(selected.suggested_response); }}
                      className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                      {editingResponse ? <X size={11} /> : null} {editingResponse ? "Cancel edit" : "Edit"}
                    </button>
                    <button onClick={copyResponse}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
                      style={{ background: G }}>
                      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied!" : "Copy to send"}
                    </button>
                  </div>
                </div>

                {editingResponse ? (
                  <textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                    style={{ borderColor: G }}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.suggested_response || <span className="text-gray-400 italic">No suggested response yet</span>}</p>
                  </div>
                )}

                {/* Status actions */}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => updateStatus("demo_booked")}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white"
                    style={{ background: G }}>
                    <Calendar size={12} /> Mark demo booked
                  </button>
                  <button onClick={() => updateStatus("warm")}
                    className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <Send size={12} /> Mark warm
                  </button>
                  <button onClick={() => updateStatus("dead")}
                    className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <X size={12} /> Mark dead
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New conversation</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="mb-4 text-sm text-gray-500">Paste a reply you received. The Objection Handler will write a suggested response automatically.</p>

            {leads.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-gray-600">Link to a lead (optional)</label>
                <select value={newLeadId} onChange={(e) => setNewLeadId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none">
                  <option value="">No lead linked</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.business_name} — {l.city}</option>)}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Their reply *</label>
              <textarea
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                placeholder="Paste what they said..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
                onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={createConversation}
                disabled={generating || !newReplyText.trim()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: G }}
              >
                {generating ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Generating...</>
                ) : "Add conversation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
