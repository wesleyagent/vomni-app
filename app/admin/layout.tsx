"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lock, LayoutDashboard, Bot, ArrowLeft,
  Target, PenLine, MessageSquare, BarChart3, ChevronDown,
} from "lucide-react";

const ADMIN_PASSWORD = "vomni2026";
const SESSION_KEY = "vomni_admin_authed";

const G = "#00C896";
const N = "#0A0F1E";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthenticated(true);
    } catch { /* sessionStorage blocked */ }
    // Auto-expand if on any agents page
    if (pathname.startsWith("/admin/agents")) setWorkspaceOpen(true);
  }, [pathname]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(0,200,150,0.1)" }}>
              <Lock size={24} style={{ color: G }} />
            </div>
            <h1 className="mt-4 text-center text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="mt-1 text-center text-sm text-gray-500">Enter the admin password to continue</p>
            <form onSubmit={handleLogin} className="mt-6">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Password"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none"
                onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white"
                style={{ background: G }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
              >
                Sign In
              </button>
            </form>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Back to Vomni
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => pathname === href;
  const isActivePrefix = (prefix: string) => pathname.startsWith(prefix);

  function NavLink({ href, label, icon: Icon, indent = false }: { href: string; label: string; icon: React.ComponentType<{ size?: number }>; indent?: boolean }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        style={active ? {
          display: "flex", alignItems: "center", gap: 9,
          padding: indent ? "7px 10px 7px 28px" : "9px 10px",
          borderRadius: 8,
          background: "rgba(0,200,150,0.1)", color: G,
          borderLeft: `3px solid ${G}`,
          fontSize: indent ? 13 : 14, fontWeight: 500, textDecoration: "none",
        } : {
          display: "flex", alignItems: "center", gap: 9,
          padding: indent ? "7px 12px 7px 30px" : "9px 12px",
          borderRadius: 8,
          color: "rgba(255,255,255,0.55)",
          borderLeft: "3px solid transparent",
          fontSize: indent ? 13 : 14, fontWeight: 500, textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "#fff";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        <Icon size={indent ? 15 : 18} />
        {label}
      </Link>
    );
  }

  const workspaceActive = isActivePrefix("/admin/agents");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col overflow-y-auto" style={{ background: N }}>
        {/* Logo */}
        <div className="flex h-14 flex-shrink-0 items-center px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", letterSpacing: "-0.5px" }}>
            vomni
          </span>
          <span className="ml-2 text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4" style={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Top nav items */}
          <NavLink href="/admin" label="Admin Dashboard" icon={LayoutDashboard} />

          {/* Agent Workspace section */}
          <div style={{ marginTop: 12 }}>
            {/* Section header — clickable to expand/collapse */}
            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "6px 12px", borderRadius: 6,
                background: workspaceActive ? "rgba(0,200,150,0.08)" : "transparent",
                border: "none", cursor: "pointer",
                color: workspaceActive ? G : "rgba(255,255,255,0.3)",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Agent Workspace
              <ChevronDown size={12} style={{ transform: workspaceOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {workspaceOpen && (
              <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <NavLink href="/admin/agents" label="Agent Team" icon={Bot} indent />
                <NavLink href="/admin/agents/leads" label="Lead Pipeline" icon={Target} indent />
                <NavLink href="/admin/agents/copy" label="Copy Queue" icon={PenLine} indent />
                <NavLink href="/admin/agents/conversations" label="Conversations" icon={MessageSquare} indent />
                <NavLink href="/admin/agents/results" label="Results Board" icon={BarChart3} indent />
              </div>
            )}
          </div>
        </nav>

        {/* Back link */}
        <div className="flex-shrink-0 px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
          >
            <ArrowLeft size={14} />
            Back to Vomni
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
