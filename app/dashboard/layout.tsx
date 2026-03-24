"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { getBusiness } from "@/lib/storage";

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/feedback", label: "Feedback Inbox", icon: MessageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const G = "#00C896";
const N = "#0A0F1E";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessName, setBusinessName] = useState<string>("My Business");

  useEffect(() => {
    const business = getBusiness();
    if (business?.name) {
      setBusinessName(business.name);
    }
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ background: N }}
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo + close button */}
        <div className="flex h-16 items-center justify-between px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Link
            href="/dashboard"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}
          >
            vomni
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 lg:hidden"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                style={active ? {
                  borderLeft: `3px solid ${G}`,
                  paddingLeft: 10,
                  color: G,
                  background: 'rgba(0,200,150,0.1)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px 10px 10px',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.55)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  borderLeft: '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: business name + sign out */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="truncate text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {businessName}
          </p>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <LogOut size={16} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center border-b border-gray-100 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>
          <span
            className="ml-3 text-lg font-bold"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: N }}
          >
            vomni
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
