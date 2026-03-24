"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { getBusiness, getCustomers } from "@/lib/storage";
import type { Business, Customer } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyData {
  month: string;
  sent: number;
  completed: number;
  redirected: number;
  negativeCaught: number;
  completionRate: number;
}

interface InsightItem {
  type: "positive" | "warning" | "opportunity";
  title: string;
  body: string;
  action: string;
}

const RATING_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#38bdf8",
  5: "#22c55e",
};

function computeMonthlyData(customers: Customer[]): MonthlyData[] {
  const now = new Date();
  const months: MonthlyData[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const inMonth = customers.filter((c) => {
      const created = new Date(c.createdAt);
      return created >= d && created <= monthEnd;
    });

    const sent = inMonth.filter((c) =>
      ["sent", "opened", "clicked", "submitted", "redirected", "private_feedback"].includes(
        c.reviewRequestStatus
      )
    ).length;

    const completed = inMonth.filter((c) =>
      ["submitted", "redirected", "private_feedback"].includes(c.reviewRequestStatus)
    ).length;

    const redirected = inMonth.filter((c) => c.redirectedToGoogle).length;

    const negativeCaught = inMonth.filter(
      (c) => c.reviewRequestStatus === "private_feedback"
    ).length;

    const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0;

    months.push({ month: label, sent, completed, redirected, negativeCaught, completionRate });
  }

  return months;
}

function computeRatingDistribution(customers: Customer[]) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  customers.forEach((c) => {
    if (c.rating && c.rating >= 1 && c.rating <= 5) {
      counts[Math.round(c.rating)]++;
    }
  });
  return [1, 2, 3, 4, 5].map((star) => ({
    name: `${star} Star`,
    value: counts[star],
    star,
  }));
}

function generateInsights(
  customers: Customer[],
  monthlyData: MonthlyData[]
): InsightItem[] {
  const insights: InsightItem[] = [];
  const totalSent = customers.filter((c) =>
    ["sent", "opened", "clicked", "submitted", "redirected", "private_feedback"].includes(
      c.reviewRequestStatus
    )
  ).length;
  const totalCompleted = customers.filter((c) =>
    ["submitted", "redirected", "private_feedback"].includes(c.reviewRequestStatus)
  ).length;
  const completionRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;

  const negativeCaught = customers.filter(
    (c) => c.reviewRequestStatus === "private_feedback"
  ).length;

  const rated = customers.filter((c) => c.rating !== undefined && c.rating > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, c) => sum + (c.rating ?? 0), 0) / rated.length
      : 0;

  const redirected = customers.filter((c) => c.redirectedToGoogle).length;

  // Completion rate insight
  if (completionRate >= 40) {
    insights.push({
      type: "positive",
      title: "Above-Average Completion Rate",
      body: `Your ${completionRate}% completion rate beats the 40% benchmark. This puts you in the top tier of businesses using review management tools.`,
      action: "Keep your current messaging strategy — it's working.",
    });
  } else if (totalSent > 0) {
    insights.push({
      type: "warning",
      title: "Completion Rate Below Benchmark",
      body: `Your ${completionRate}% completion rate is below the 40% benchmark. Businesses above 40% generate 2x more reviews per month.`,
      action: "Try sending requests within 2-4 hours of the appointment for higher response rates.",
    });
  }

  // Negative feedback insight
  if (negativeCaught > 0) {
    const lowSavings = negativeCaught * 3750;
    const highSavings = negativeCaught * 15000;
    insights.push({
      type: "positive",
      title: `${negativeCaught} Negative Review${negativeCaught > 1 ? "s" : ""} Intercepted`,
      body: `You've caught ${negativeCaught} negative review${negativeCaught > 1 ? "s" : ""} before they hit Google. Each negative review prevented saves an estimated $3,750-$15,000 in lost customer lifetime value.`,
      action: `Estimated savings: $${lowSavings.toLocaleString()}-$${highSavings.toLocaleString()}. Respond promptly to turn these into recovery opportunities.`,
    });
  }

  // Rating trend
  if (avgRating > 0) {
    if (avgRating >= 4.5) {
      insights.push({
        type: "positive",
        title: "Excellent Average Rating",
        body: `Your ${avgRating.toFixed(1)} average rating is well above the 4.2 threshold needed for top local search ranking. ${rated.length} customers have left ratings.`,
        action: "Maintain this by continuing to deliver great service and following up quickly.",
      });
    } else if (avgRating >= 4.0) {
      insights.push({
        type: "opportunity",
        title: "Rating Improvement Opportunity",
        body: `Your ${avgRating.toFixed(1)} average rating is solid but pushing to 4.5+ would significantly boost your Google Maps visibility.`,
        action: "Focus on service quality for your most common complaints to move the needle.",
      });
    } else {
      insights.push({
        type: "warning",
        title: "Rating Needs Attention",
        body: `Your ${avgRating.toFixed(1)} average rating is below the 4.0 mark. Businesses below 4.0 see up to 70% fewer clicks from search results.`,
        action: "Review your negative feedback for patterns and address the root causes.",
      });
    }
  }

  // Review velocity
  const recentMonths = monthlyData.slice(-3);
  const recentRedirected = recentMonths.reduce((sum, m) => sum + m.redirected, 0);
  if (redirected > 0) {
    insights.push({
      type: recentRedirected > 0 ? "positive" : "warning",
      title: "Review Velocity Assessment",
      body: `You've generated ${redirected} Google review${redirected !== 1 ? "s" : ""} total. Businesses that maintain 4+ new reviews per month rank higher in local search results.`,
      action: "Consistency matters more than volume. Aim for steady weekly reviews rather than bursts.",
    });
  }

  return insights;
}

const INSIGHT_ICONS = {
  positive: TrendingUp,
  warning: AlertTriangle,
  opportunity: Lightbulb,
};

const INSIGHT_STYLES = {
  positive: "border-green-200 bg-green-50/50",
  warning: "border-orange-200 bg-orange-50/50",
  opportunity: "border-blue-200 bg-blue-50/50",
};

const INSIGHT_ICON_STYLES = {
  positive: "text-green-600",
  warning: "text-orange-500",
  opportunity: "text-blue-500",
};

export default function AnalyticsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBusiness(getBusiness());
    setCustomers(getCustomers());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const monthlyData = computeMonthlyData(customers);
  const ratingDistribution = computeRatingDistribution(customers);
  const hasRatings = ratingDistribution.some((d) => d.value > 0);
  const hasData = customers.length > 0;
  const insights = hasData ? generateInsights(customers, monthlyData) : [];

  if (!hasData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Charts, trends, and AI-powered insights
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <BarChart3 size={48} className="text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No data yet</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Start collecting reviews to see your analytics. Once you have a few weeks of data,
            we&apos;ll show you trends, insights, and recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Charts, trends, and AI-powered insights
          {business ? ` for ${business.name}` : ""}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Distribution — Pie Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Rating Distribution</h3>
          <p className="mt-0.5 text-xs text-gray-400">Breakdown by star rating</p>
          {hasRatings ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {ratingDistribution
                      .filter((d) => d.value > 0)
                      .map((entry) => (
                        <Cell
                          key={`cell-${entry.star}`}
                          fill={RATING_COLORS[entry.star]}
                        />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-64 items-center justify-center text-sm text-gray-400">
              No ratings collected yet
            </div>
          )}
        </div>

        {/* Review Requests Over Time — Bar Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Review Requests Over Time</h3>
          <p className="mt-0.5 text-xs text-gray-400">Sent count by month</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sent" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Sent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Rate Trend — Line Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Completion Rate Trend</h3>
          <p className="mt-0.5 text-xs text-gray-400">Percentage over time</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(value: number) => [`${value}%`, "Completion Rate"]} />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Completion Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Google Reviews Generated — Line Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Google Reviews Generated</h3>
          <p className="mt-0.5 text-xs text-gray-400">Redirected to Google by month</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="redirected"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Google Reviews"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {insights.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.type];
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-5 ${INSIGHT_STYLES[insight.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${INSIGHT_ICON_STYLES[insight.type]}`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {insight.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">{insight.body}</p>
                      <p className="mt-2 text-sm font-bold text-gray-800">
                        {insight.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
