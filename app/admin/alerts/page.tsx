"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Activity } from "lucide-react";

const G  = "#00C896";
const RD = "#EF4444";
const AM = "#F59E0B";

interface Alert {
  id: string;
  type: "cron" | "sentry" | "warning";
  name: string;
  status: "success" | "failure";
  detail: string | null;
  duration_ms: number | null;
  path?: string | null;
  created_at: string;
}

interface LastRun {
  status: string;
  created_at: string;
  duration_ms: number | null;
}

interface Stats {
  cronTotal: number;
  cronSuccess: number;
  cronFailed: number;
  sentryTotal: number;
  warningTotal: number;
  lastRuns: Record<string, LastRun>;
}

const CRON_JOBS = [
  "appointment-reminders",
  "review-requests",
  "cleanup-data",
  "downgrade-expired-trials",
  "sync-customer-profiles",
  "waitlist-check",
  "no-show-rebooking",
  "crm-nudges",
  "reset-sms-counters",
  "weekly-report",
  "update-velocity",
  "auto-complete-appointments",
];

function fmtAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "cron" | "sentry" | "warning" | "failure">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/alerts?limit=200");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setStats(data.stats ?? null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = alerts.filter(a => {
    if (filter === "cron")    return a.type === "cron";
    if (filter === "sentry")  return a.type === "sentry";
    if (filter === "warning") return a.type === "warning";
    if (filter === "failure") return a.status === "failure";
    return true;
  });

  const failureCount = alerts.filter(a => a.status === "failure").length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cron health + Sentry errors — auto-refreshes every 30s</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <StatCard label="Cron runs (logged)" value={stats.cronTotal} color="#6366F1" />
          <StatCard label="Cron successes" value={stats.cronSuccess} color={G} />
          <StatCard label="Cron failures" value={stats.cronFailed} color={RD} />
          <StatCard label="Sentry errors" value={stats.sentryTotal} color={AM} />
          <StatCard label="Warnings" value={stats.warningTotal ?? 0} color="#F97316" />
        </div>
      )}

      {/* Cron job status grid */}
      {stats && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Last run per cron job</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CRON_JOBS.map(job => {
              const run = stats.lastRuns[job];
              const ok  = run?.status === "success";
              return (
                <div key={job} className="rounded-xl border p-3" style={{ borderColor: run ? (ok ? "rgba(0,200,150,0.3)" : "rgba(239,68,68,0.3)") : "#E5E7EB", background: run ? (ok ? "rgba(0,200,150,0.04)" : "rgba(239,68,68,0.04)") : "#FAFAFA" }}>
                  <div className="flex items-center gap-2 mb-1">
                    {run ? (
                      ok
                        ? <CheckCircle size={13} style={{ color: G, flexShrink: 0 }} />
                        : <XCircle size={13} style={{ color: RD, flexShrink: 0 }} />
                    ) : (
                      <Clock size={13} className="text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-gray-800 truncate">{job}</span>
                  </div>
                  {run ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{fmtAgo(run.created_at)}</span>
                      {run.duration_ms != null && (
                        <span className="text-xs text-gray-400">{run.duration_ms}ms</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No data yet</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "cron", "sentry", "warning", "failure"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: filter === f ? (f === "failure" ? RD : f === "warning" ? "#F97316" : G) : "#F3F4F6",
              color: filter === f ? "#fff" : "#6B7280",
            }}
          >
            {f === "all"     ? `All (${alerts.length})` :
             f === "cron"    ? `Cron (${alerts.filter(a => a.type === "cron").length})` :
             f === "sentry"  ? `Sentry (${alerts.filter(a => a.type === "sentry").length})` :
             f === "warning" ? `Warnings (${alerts.filter(a => a.type === "warning").length})` :
             `Failures (${failureCount})`}
          </button>
        ))}
      </div>

      {/* Alert log */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Activity size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No alerts yet. They&apos;ll appear here as cron jobs run and Sentry catches errors.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(alert => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {alert.status === "success" ? (
                      <CheckCircle size={15} style={{ color: G }} />
                    ) : (
                      <XCircle size={15} style={{ color: RD }} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{
                      background: alert.type === "cron" ? "rgba(99,102,241,0.1)" : alert.type === "warning" ? "rgba(249,115,22,0.1)" : "rgba(245,158,11,0.1)",
                      color: alert.type === "cron" ? "#6366F1" : alert.type === "warning" ? "#F97316" : AM,
                    }}>
                      {alert.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{alert.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[260px]">
                    <span className="truncate block text-xs font-mono" title={alert.detail ?? ""}>
                      {alert.detail ?? "—"}
                    </span>
                    {alert.path && (
                      <span className="text-xs text-gray-400 font-mono">{alert.path}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {alert.duration_ms != null ? `${alert.duration_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap" title={alert.created_at}>
                    {fmtTime(alert.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
