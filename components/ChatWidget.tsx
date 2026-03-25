"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const G = "#00C896";
const N = "#0A0F1E";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: string;
  isAgent?: boolean;
}

interface ChatWidgetProps {
  context: "landing" | "dashboard";
  business?: {
    id: string;
    name: string;
    ownerName: string;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const LANDING_QR = ["How does it work?", "What does it cost?", "Is it right for my business?", "I want a demo"];
const DASHBOARD_QR = ["Help with setup", "I have a question", "Something isn't working", "Talk to someone"];

// ── SVG icons ─────────────────────────────────────────────────────────────────

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, animationName: "vchat-msg-in", animationDuration: "0.2s", animationFillMode: "both" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: G, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 13, color: "white",
      }}>V</div>
      <div style={{
        background: "white", borderRadius: "18px 18px 18px 4px", padding: "14px 18px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 5,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="vchat-dot" style={{
            width: 7, height: 7, borderRadius: "50%", background: "#9CA3AF",
            animationName: "vchat-dot", animationDuration: "1.2s", animationIterationCount: "infinite",
            animationDelay: `${i * 180}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatWidget({ context, business }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openingDoneRef = useRef(false);
  const proactiveDoneRef = useRef(false);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Init session
  useEffect(() => {
    try {
      let sid = sessionStorage.getItem("vomni_chat_sid");
      if (!sid) {
        sid = genId();
        sessionStorage.setItem("vomni_chat_sid", sid);
      }
      setSessionId(sid);

      const saved = sessionStorage.getItem("vomni_chat_msgs");
      const savedId = sessionStorage.getItem("vomni_chat_conv_id");
      const savedName = sessionStorage.getItem("vomni_chat_name");
      const savedEmail = sessionStorage.getItem("vomni_chat_email");
      const savedOpened = sessionStorage.getItem("vomni_chat_opened");

      if (saved) {
        const msgs = JSON.parse(saved) as ChatMessage[];
        setMessages(msgs);
        if (msgs.length > 0) openingDoneRef.current = true;
      }
      if (savedId) setConversationId(savedId);
      if (savedName) setVisitorName(savedName);
      if (savedEmail) setVisitorEmail(savedEmail);
      if (savedOpened === "1") openingDoneRef.current = true;
    } catch { /* sessionStorage blocked */ }
  }, []);

  // Proactive badge (landing only, 30s)
  useEffect(() => {
    if (context !== "landing" || proactiveDoneRef.current) return;
    const t = setTimeout(() => {
      if (!isOpen && !proactiveDoneRef.current) {
        proactiveDoneRef.current = true;
        setUnreadCount((c) => (c === 0 ? 1 : c));
      }
    }, 30000);
    return () => clearTimeout(t);
  }, [context, isOpen]);

  // Opening message
  useEffect(() => {
    if (!isOpen || openingDoneRef.current) return;
    openingDoneRef.current = true;
    try { sessionStorage.setItem("vomni_chat_opened", "1"); } catch { /* ignore */ }

    const firstName = business?.ownerName?.split(" ")[0] || "there";
    const greeting = context === "dashboard"
      ? `Hey ${firstName} 👋 Let me know if you need any help with your account or have any questions.`
      : "Hey there 👋 Welcome to Vomni. I can answer any questions about how it works, pricing, or getting started. What would you like to know?";

    setTimeout(() => {
      const msg: ChatMessage = { id: genId(), role: "assistant", content: greeting, timestamp: new Date().toISOString() };
      setMessages([msg]);
      setQuickReplies(context === "dashboard" ? DASHBOARD_QR : LANDING_QR);
    }, 800);
  }, [isOpen, context, business]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Save to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try { sessionStorage.setItem("vomni_chat_msgs", JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages]);

  // Supabase realtime — watch for admin replies
  useEffect(() => {
    if (!conversationId || !supabaseConfigured) return;

    const channel = supabase
      .channel(`vchat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `id=eq.${conversationId}` },
        (payload) => {
          const dbMsgs = (payload.new as { messages: ChatMessage[] }).messages || [];
          const agentMsgs = dbMsgs.filter((m) => m.role === "agent");
          if (agentMsgs.length === 0) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newAgent = agentMsgs.filter((m) => !existingIds.has(m.id));
            if (newAgent.length === 0) return prev;
            setUnreadCount((c) => (isOpen ? 0 : c + newAgent.length));
            return [...prev, ...newAgent];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, isOpen]);

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return;
    setQuickReplies([]);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: content.trim(), timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          sessionId,
          businessId: business?.id || null,
          source: context === "landing" ? "landing_page" : "dashboard",
          visitorName,
          visitorEmail,
          conversationId,
          businessName: business?.name || null,
          ownerFirstName: business?.ownerName?.split(" ")[0] || null,
        }),
      });

      const data = await res.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        try { sessionStorage.setItem("vomni_chat_conv_id", data.conversationId); } catch { /* ignore */ }
      }
      if (data.visitorName && data.visitorName !== visitorName) {
        setVisitorName(data.visitorName);
        try { sessionStorage.setItem("vomni_chat_name", data.visitorName); } catch { /* ignore */ }
      }
      if (data.visitorEmail && data.visitorEmail !== visitorEmail) {
        setVisitorEmail(data.visitorEmail);
        try { sessionStorage.setItem("vomni_chat_email", data.visitorEmail); } catch { /* ignore */ }
      }

      const botMsg: ChatMessage = {
        id: genId(), role: "assistant",
        content: data.response || "Sorry, I had trouble with that. Please try again.",
        timestamp: new Date().toISOString(),
        isAgent: false,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, sessionId, business, context, visitorName, visitorEmail, conversationId]);

  function handleOpen() {
    setIsOpen(true);
    setUnreadCount(0);
    setTimeout(() => inputRef.current?.focus(), 350);
  }

  function handleClose() { setIsOpen(false); }

  function handleQuickReply(text: string) { sendMessage(text); }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = isMobile
    ? { position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 1001, borderRadius: 0 }
    : { position: "fixed", bottom: 90, right: 24, width: 380, height: 520, zIndex: 1001, borderRadius: 20 };

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes vchat-pulse {
          0%, 65%, 100% { box-shadow: 0 4px 20px rgba(0,200,150,0.4); }
          32% { box-shadow: 0 4px 32px rgba(0,200,150,0.65), 0 0 0 10px rgba(0,200,150,0.09); }
        }
        @keyframes vchat-panel-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vchat-msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vchat-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
        .vchat-msg { animation: vchat-msg-in 0.22s ease both; }
        .vchat-dot { animation: vchat-dot 1.2s infinite; }
        .vchat-qr:hover { border-color: ${G} !important; color: ${G} !important; }
        .vchat-send:hover:not(:disabled) { background: #00A87D !important; }
        .vchat-trigger:hover { transform: scale(1.06) !important; box-shadow: 0 6px 28px rgba(0,200,150,0.55) !important; }
      `}</style>

      {/* ── Trigger button ──────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          className="vchat-trigger"
          onClick={handleOpen}
          aria-label="Open chat"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 1000,
            width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
            background: G, display: "flex", alignItems: "center", justifyContent: "center",
            animation: "vchat-pulse 4s ease-in-out infinite",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
        >
          <ChatBubbleIcon />
          {unreadCount > 0 && (
            <div style={{
              position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%",
              background: "#EF4444", color: "white", fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid white",
            }}>
              {unreadCount}
            </div>
          )}
        </button>
      )}

      {/* ── Widget panel ────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            ...panelStyle,
            background: "white",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            animation: "vchat-panel-in 0.3s ease both",
          }}
        >
          {/* Header */}
          <div style={{
            flexShrink: 0, height: 64, background: N,
            display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
          }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: G, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, color: "white",
            }}>V</div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Vomni Support</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Typically replies instantly</div>
            </div>
            {/* Close */}
            <button
              onClick={handleClose}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
              aria-label="Close chat"
            >
              <MinimizeIcon />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: 20,
            display: "flex", flexDirection: "column", gap: 12,
            background: "#F7F8FA",
          }}>
            {messages.length === 0 && !isTyping && (
              <div style={{ margin: "auto", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                Start a conversation
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isAgentMsg = msg.isAgent || msg.role === "agent";

              return (
                <div key={msg.id} className="vchat-msg" style={{ animationDelay: `${idx === messages.length - 1 ? 0 : 0}ms` }}>
                  {/* Bot / Agent label row */}
                  {!isUser && (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 0 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: isAgentMsg ? "#374151" : G,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isAgentMsg ? <PersonIcon /> : (
                          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 12, color: "white" }}>V</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 3, fontWeight: 500 }}>
                          {isAgentMsg ? "Vomni Support" : "Vomni"}
                        </div>
                        <div style={{
                          background: "white", borderRadius: "18px 18px 18px 4px",
                          padding: "12px 16px", maxWidth: "80%", display: "inline-block",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                          color: N, fontSize: 14, lineHeight: 1.5,
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, paddingLeft: 4 }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User message */}
                  {isUser && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <div style={{
                        background: G, borderRadius: "18px 18px 4px 18px",
                        padding: "12px 16px", maxWidth: "80%",
                        color: "white", fontSize: 14, lineHeight: 1.5,
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, paddingRight: 4 }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && <TypingIndicator />}

            {/* Quick replies */}
            {quickReplies.length > 0 && !isTyping && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    className="vchat-qr"
                    onClick={() => handleQuickReply(qr)}
                    style={{
                      background: "white", border: "1.5px solid #E5E7EB",
                      borderRadius: 9999, padding: "8px 16px",
                      fontSize: 13, fontWeight: 500, color: N, cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            flexShrink: 0, height: 64, borderTop: "1px solid #E5E7EB",
            display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
            background: "white",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              style={{
                flex: 1, border: "none", outline: "none",
                fontSize: 14, color: N, background: "transparent",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            />
            <button
              className="vchat-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
                background: G, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
                opacity: !input.trim() || isTyping ? 0.4 : 1,
              }}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
