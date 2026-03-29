"use client";

import { useState, useEffect } from "react";
import { Calendar, CheckCircle, Clock, Users, AlertCircle } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const G = "#00C896";

type DemoStatus = "new" | "contacted" | "booked" | "completed";

interface DemoBooking {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  business_type: string;
  phone: string;
  status: DemoStatus;
  created_at: string;
}

const STATUS_CONFIG: Record<DemoStatus, { label: string; bg: string; color: string }> = {
  new:       { label: "New",       bg: "#F3F4F6",              color: "#6B7280" },
  contacted: { label: "Contacted", bg: "#EFF6FF",              color: "#3B82F6" },
  booked:    { label: "Booked",    bg: "rgba(0,200,150,0.1)",  color: G },
  completed: { label: "Completed", bg: "rgba(0,200,150,0.15)", color: "#047857" },
};

function exportCSV(bookings: DemoBooking[]) {
  const headers = ["Name", "Email", "Phone", "Business Name", "Business Type", "Status", "Date Submitted"];
  const rows = bookings.map((b) => [
    `${b.first_name} ${b.last_name}`,
    b.email,
    b.phone,
    b.business_name,
    b.business_type,
    b.status,
    new Date(b.created_at).toLocaleString("en-GB"),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "demo-requests.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function DemoRequestsPage() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    setLoading(true);
    if (!supabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("demo_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBookings(data as DemoBooking[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: DemoStatus) {
    if (!supabaseConfigured) return;
    await supabase.from("demo_bookings").update({ status }).eq("id", id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  }

  // Stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = bookings.filter((b) => new Date(b.created_at) >= weekAgo).length;
  const booked = bookings.filter((b) => b.status === "booked").length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      <div className="mx-auto max-w-full px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Demo Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">Businesses that requested a product demo</p>
          </div>
          <button
            onClick={() => exportCSV(bookings)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          {[
            { label: "Total requests", value: bookings.length, icon: Users },
            { label: "New this week",  value: newThisWeek,     icon: Clock,        color: "#3B82F6" },
            { label: "Booked",         value: booked,          icon: Calendar,     color: G },
            { label: "Completed",      value: completed,       icon: CheckCircle,  color: "#047857" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Icon size={15} style={{ color: color ?? "#6B7280" }} />
                <p className="text-xs font-medium text-gray-500">{label}</p>
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: color ?? "#111827" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Supabase warning */}
        {!supabaseConfigured && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={16} className="flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-700">Supabase not configured - demo requests will not be stored.</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No demo requests yet. Once the booking form is submitted, requests will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Name", "Email", "Business Name", "Business Type", "Phone", "Status", "Date Submitted"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.first_name} {b.last_name}</td>
                      <td className="px-4 py-3 text-gray-600">{b.email}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{b.business_name}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{b.business_type}</td>
                      <td className="px-4 py-3 text-gray-600">{b.phone}</td>
                      <td className="px-4 py-3">
                        <select
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value as DemoStatus)}
                          className="rounded-full border-0 px-3 py-1 text-xs font-medium outline-none cursor-pointer"
                          style={STATUS_CONFIG[b.status]}
                        >
                          {(Object.entries(STATUS_CONFIG) as [DemoStatus, typeof STATUS_CONFIG[DemoStatus]][]).map(([val, cfg]) => (
                            <option key={val} value={val}>{cfg.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
