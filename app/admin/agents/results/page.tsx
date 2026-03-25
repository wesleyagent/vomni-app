"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { supabase, supabaseConfigured, type WeeklyReport } from "@/lib/supabase";

const G = "#00C896";

const FUNNEL_STAGES = [
  { key: "leads_found", label: "Leads Found" },
  { key: "outreach_sent", label: "Approved & Sent" },
  { key: "replied", label: "Replied" },
  { key: "demos_booked", label: "Demo Booked" },
  { key: "new_customers", label: "Customer" },
] as const;

function MetricCard({ label, value, unit = "", good, bad }: { label: string; value: number; unit?: string; good?: number; bad?: number }) {
  const isGood = good !== undefined && value >= good;
  const isBad = bad !== undefined && value < bad;
  const color = isGood ? G : isBad ? "#F59E0B" : "#111827";
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-4xl font-bold" style={{ color, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        {value}{unit}
      </p>
      {isGood && <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: G }}><TrendingUp size={12} /> On target</p>}
      {isBad && <p className="mt-1 flex items-center gap-1 text-xs text-amber-500"><TrendingDown size={12} /> Below target</p>}
    </div>
  );
}

function FunnelBar({ label, value, max, rate }: { label: string; value: number; max: number; rate?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 flex-shrink-0 text-right">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {rate && <p className="text-xs text-gray-400">{rate}</p>}
      </div>
      <div className="flex-1 rounded-full bg-gray-100 h-6 relative overflow-hidden">
        <div className="h-6 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${G}, #00A87D)`, minWidth: value > 0 ? 32 : 0 }} />
        <span className="absolute left-3 top-0 flex h-6 items-center text-xs font-semibold text-white mix-blend-difference">{value}</span>
      </div>
      <div className="w-10 text-right text-xs text-gray-400">{pct}%</div>
    </div>
  );
}

export default function ResultsBoardPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({ leads: 0, sent: 0, replied: 0, demos: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    if (supabaseConfigured) {
      const [reportRes, leadsRes, copyRes, convRes] = await Promise.all([
        supabase.from("weekly_reports").select("*").order("week_starting", { ascending: false }),
        supabase.from("leads").select("status", { count: "exact" }),
        supabase.from("copy_queue").select("status", { count: "exact" }),
        supabase.from("conversations").select("status", { count: "exact" }),
      ]);
      if (reportRes.data) { setReports(reportRes.data as WeeklyReport[]); if (reportRes.data.length > 0) setExpandedId(reportRes.data[0].id); }

      // Compute live stats from actual data
      const leads = (leadsRes.data ?? []) as { status: string }[];
      const copy = (copyRes.data ?? []) as { status: string }[];
      const convs = (convRes.data ?? []) as { status: string }[];
      setLiveStats({
        leads: leads.length,
        sent: copy.filter((c) => c.status === "sent" || c.status === "replied").length,
        replied: convs.length,
        demos: leads.filter((l) => l.status === "demo_booked" || l.status === "customer").length,
      });
    }
    setLoading(false);
  }

  const latest = reports[0];
  const replyRatePct = liveStats.sent > 0 ? Math.round((liveStats.replied / liveStats.sent) * 100) : 0;
  const funnelMax = liveStats.leads;

  function formatWeek(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Results Board</h1>
          <p className="mt-1 text-sm text-gray-500">Live pipeline data + weekly reports from the Analyst</p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">Supabase not configured. Add your environment variables to see live data.</p>
          </div>
        )}

        {/* Live metric cards */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <MetricCard label="Total leads" value={liveStats.leads} />
          <MetricCard label="Outreach sent" value={liveStats.sent} />
          <MetricCard label="Reply rate" value={replyRatePct} unit="%" good={15} bad={15} />
          <MetricCard label="Demos booked" value={liveStats.demos} good={1} />
        </div>

        {/* Funnel visualisation */}
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-gray-900">Pipeline Funnel</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : funnelMax === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No data yet. Leads will appear here once the Prospector is active.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Leads Found", value: liveStats.leads },
                { label: "Contacted", value: liveStats.sent, rate: liveStats.leads > 0 ? `${Math.round((liveStats.sent / liveStats.leads) * 100)}% approval` : undefined },
                { label: "Replied", value: liveStats.replied, rate: liveStats.sent > 0 ? `${Math.round((liveStats.replied / liveStats.sent) * 100)}% reply rate` : undefined },
                { label: "Demo Booked", value: liveStats.demos, rate: liveStats.replied > 0 ? `${Math.round((liveStats.demos / liveStats.replied) * 100)}% conversion` : undefined },
              ].map(({ label, value, rate }) => (
                <FunnelBar key={label} label={label} value={value} max={funnelMax} rate={rate} />
              ))}
            </div>
          )}
        </div>

        {/* Latest report insights */}
        {latest && (
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: G }} />
                <h3 className="text-sm font-semibold text-gray-700">What is working</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {latest.what_worked || <span className="text-gray-400 italic">Analyst hasn&apos;t written this week&apos;s report yet.</span>}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-gray-700">What is not working</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {latest.what_didnt || <span className="text-gray-400 italic">No observations yet.</span>}
              </p>
            </div>
            {latest.recommendations && (
              <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Recommendations this week</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{latest.recommendations}</p>
              </div>
            )}
          </div>
        )}

        {/* Weekly report history */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Weekly Report History</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-400">No weekly reports yet. The Analyst writes these every Monday.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const isOpen = expandedId === report.id;
                return (
                  <div key={report.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <button
                      onClick={() => setExpandedId(isOpen ? null : report.id)}
                      className="flex w-full items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">Week of {formatWeek(report.week_starting)}</p>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span><strong className="text-gray-900">{report.leads_found}</strong> leads</span>
                          <span><strong className="text-gray-900">{report.outreach_sent}</strong> sent</span>
                          <span><strong className={report.reply_rate >= 15 ? "text-green-600" : "text-amber-600"}>{report.reply_rate}%</strong> reply rate</span>
                          <span><strong className="text-gray-900">{report.demos_booked}</strong> demos</span>
                          <span><strong className="text-gray-900">{report.new_customers}</strong> customers</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 grid grid-cols-3 gap-4 p-6">
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">What worked</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.what_worked || "—"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">What didn&apos;t work</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.what_didnt || "—"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Recommendations</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.recommendations || "—"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
