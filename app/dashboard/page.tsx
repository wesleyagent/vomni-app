"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  Star,
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { getBusiness, getCustomers, getThisMonthStats, getFeedback } from "@/lib/storage";
import { StatCard } from "@/components/ui/stat-card";
import type { Business, Customer, FeedbackItem } from "@/types";

const G = "#00C896";
const N = "#0A0F1E";

const STATUS_BADGES: Record<string, { label: string; style: React.CSSProperties }> = {
  scheduled: { label: "Scheduled", style: { background: '#F3F4F6', color: '#6B7280' } },
  sent: { label: "Sent", style: { background: 'rgba(0,200,150,0.1)', color: '#00A87D' } },
  opened: { label: "Opened", style: { background: '#FEF3C7', color: '#B45309' } },
  clicked: { label: "Clicked", style: { background: 'rgba(0,200,150,0.1)', color: '#00A87D' } },
  submitted: { label: "Submitted", style: { background: 'rgba(0,200,150,0.12)', color: '#00A87D' } },
  redirected: { label: "Redirected", style: { background: 'rgba(0,200,150,0.12)', color: '#00A87D' } },
  private_feedback: { label: "Private Feedback", style: { background: '#FEF3C7', color: '#B45309' } },
  failed: { label: "Failed", style: { background: '#FEE2E2', color: '#DC2626' } },
  opted_out: { label: "Opted Out", style: { background: '#F3F4F6', color: '#9CA3AF' } },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
        />
      ))}
    </div>
  );
}

function getRatingExplanation(avg: number): string {
  if (avg === 0) return "No ratings yet this month.";
  if (avg >= 4.5) return "Excellent! You're well above the 4.2 average needed for top local search ranking.";
  if (avg >= 4.0) return "Good. Aim for 4.5+ to maximize your visibility in local search results.";
  if (avg >= 3.5) return "Room to improve. Businesses below 4.0 see significantly fewer clicks from search.";
  return "Needs attention. Low ratings can reduce your search visibility by up to 70%.";
}

export default function DashboardOverview() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBusiness(getBusiness());
    setCustomers(getCustomers());
    setFeedback(getFeedback());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: N }}>
            Welcome to Vomni!
          </h2>
          <p className="mt-2 text-gray-500">Complete your onboarding to get started.</p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
            style={{ background: G }}
          >
            Start Onboarding
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const stats = getThisMonthStats(customers);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const weeksElapsed = Math.max(dayOfMonth / 7, 1);
  const reviewVelocity = (stats.redirected / weeksElapsed).toFixed(1);

  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const activeAlerts = feedback.filter((f) => f.status === "new");

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: N }}>
          Overview
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your review management dashboard for {business.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Review Requests Sent"
          value={stats.sent}
          icon={<Send size={20} />}
          subtext="This month"
        />
        <StatCard
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={<TrendingUp size={20} />}
          explanation="Businesses above 40% generate 2x more reviews per month. The industry average is 25-30%."
        />
        <StatCard
          label="Average Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--"}
          icon={<Star size={20} />}
          subtext={stats.avgRating > 0 ? undefined : "No ratings yet"}
          explanation={getRatingExplanation(stats.avgRating)}
        />
        <StatCard
          label="Google Reviews Generated"
          value={stats.redirected}
          icon={<Star size={20} />}
          subtext="Redirected to Google"
        />
        <StatCard
          label="Negative Feedback Caught"
          value={stats.negativeCaught}
          icon={<ShieldAlert size={20} />}
          explanation="Each negative review caught saves an estimated $3,750-$15,000 in lost customer lifetime value."
        />
        <StatCard
          label="Review Velocity"
          value={`${reviewVelocity}/wk`}
          icon={<Zap size={20} />}
          subtext="Google reviews per week"
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-10">
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, color: N }}>
          Recent Activity
        </h2>
        {recentCustomers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No customer activity yet. Start sending review requests to see activity here.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden bg-white shadow-sm" style={{ borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <ul className="divide-y divide-gray-50">
              {recentCustomers.map((customer) => {
                const badge = STATUS_BADGES[customer.reviewRequestStatus] ?? STATUS_BADGES.scheduled;
                let timeAgo = "";
                try {
                  timeAgo = formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true });
                } catch {
                  timeAgo = "";
                }
                return (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="truncate text-xs text-gray-400">{customer.service}</p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={badge.style}
                      >
                        {badge.label}
                      </span>
                      <span className="hidden text-xs text-gray-400 sm:block">{timeAgo}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, color: N }}>
            <AlertTriangle size={20} className="text-orange-500" />
            Active Alerts
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
              {activeAlerts.length}
            </span>
          </h2>
          <div className="mt-4 space-y-3">
            {activeAlerts.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4"
                style={{ borderRadius: 12, border: '1px solid #FED7AA', background: 'rgba(255,237,213,0.5)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{item.customerName}</p>
                    <StarRating rating={item.rating} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.feedback}</p>
                </div>
                <Link
                  href="/dashboard/feedback"
                  className="ml-4 shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm border border-orange-200 hover:bg-orange-50 transition-colors"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
