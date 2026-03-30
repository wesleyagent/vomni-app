"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const G = "#00C896";
const BORDER = "#E5E7EB";
const SECONDARY = "#6B7280";

const TABS = [
  { href: "/dashboard/calendar",          label: "Calendar", exact: true },
  { href: "/dashboard/calendar/settings", label: "Settings", exact: false },
];

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", display: "flex", gap: 0 }}>
          {TABS.map(tab => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: "14px 20px",
                  textDecoration: "none",
                  fontFamily: active ? "'Bricolage Grotesque', sans-serif" : "Inter, sans-serif",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  color: active ? G : SECONDARY,
                  borderBottom: active ? `2px solid ${G}` : "2px solid transparent",
                  marginBottom: -1,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s, border-bottom-color 0.2s",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
