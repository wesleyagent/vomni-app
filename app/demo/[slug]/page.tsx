"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  Lightbulb,
  TriangleAlert,
  CheckCircle,
} from "lucide-react";
import {
  LineChart,
  BarChart,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Bar,
  Pie,
  Cell,
} from "recharts";
import {
  kingsCutsBusiness,
  kingsCutsCustomers,
  kingsCutsFeedback,
  kingsCutsAnalytics,
  bellaVistaBusiness,
  bellaVistaCustomers,
  bellaVistaFeedback,
  bellaVistaAnalytics,
} from "@/lib/demo-data";
import { StatCard } from "@/components/ui/stat-card";
import type { Business, Customer, FeedbackItem, AnalyticsData } from "@/types";

// ─── Status badges ───
const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  opened: { label: "Opened", className: "bg-yellow-100 text-yellow-700" },
  clicked: { label: "Clicked", className: "bg-blue-100 text-blue-700" },
  submitted: { label: "Submitted", className: "bg-green-100 text-green-700" },
  redirected: { label: "Redirected", className: "bg-green-100 text-green-700" },
  private_feedback: { label: "Private Feedback", className: "bg-orange-100 text-orange-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  opted_out: { label: "Opted Out", className: "bg-gray-100 text-gray-500" },
};

const FEEDBACK_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-red-100 text-red-700" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9"];

// ─── Star Rating Component ───
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={
            i <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}

// ─── Copy Button ───
function DemoCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Demo Toast ───
function useDemoToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  const ToastUI = toast ? (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {toast}
    </div>
  ) : null;
  return { show, ToastUI };
}

// ─── Overview Tab ───
function OverviewTab({
  business,
  customers,
  feedback,
  analytics,
}: {
  business: Business;
  customers: Customer[];
  feedback: FeedbackItem[];
  analytics: AnalyticsData[];
}) {
  const lastMonth = analytics[analytics.length - 1];
  const sent = lastMonth?.sent ?? 0;
  const completed = lastMonth?.completed ?? 0;
  const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0;
  const avgRating = lastMonth?.avgRating ?? 0;
  const redirected = lastMonth?.redirected ?? 0;
  const negativeCaught = lastMonth?.negativeCaught ?? 0;

  const weeksElapsed = Math.max(new Date().getDate() / 7, 1);
  const reviewVelocity = (redirected / weeksElapsed).toFixed(1);

  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const activeAlerts = feedback.filter((f) => f.status === "new");

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Review Requests Sent"
          value={sent}
          icon={<Send size={20} />}
          subtext="This month"
          explanation="SMS review requests have a 98% open rate vs 20-45% for email. 90% are read within 3 minutes."
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={<TrendingUp size={20} />}
          explanation={
            completionRate >= 40
              ? `Excellent! Businesses above 40% generate 2x more reviews per month. You're well above the 25-30% industry average.`
              : `The industry average is 25-30%. Businesses above 40% generate 2x more reviews per month. Room to improve here.`
          }
        />
        <StatCard
          label="Average Rating"
          value={avgRating > 0 ? avgRating.toFixed(1) : "--"}
          icon={<Star size={20} />}
          explanation={
            avgRating >= 4.0
              ? `Great! Crossing 4.0 stars means +20% sales and 2x traffic. 57% of consumers only use businesses with 4+ stars.`
              : `Every 0.1 star increase = +25% conversion rate. Moving from 3.5 to 3.7 stars alone means +120% conversion growth.`
          }
        />
        <StatCard
          label="Google Reviews"
          value={redirected}
          icon={<Star size={20} />}
          subtext="Redirected to Google this month"
          explanation="Businesses with 25+ reviews generate 108% more revenue than those without. Consistent weekly reviews matter more than a large stagnant total."
        />
        <StatCard
          label="Negative Caught"
          value={negativeCaught}
          icon={<ShieldAlert size={20} />}
          explanation="Each negative review caught saves $3,750-$15,000 in lost customer lifetime value. 1 bad review drives away 22% of prospects."
        />
        <StatCard
          label="Review Velocity"
          value={`${reviewVelocity}/wk`}
          icon={<Zap size={20} />}
          subtext="Google reviews per week"
          explanation="Rankings can drop if no new reviews for 3 weeks. Target: 10+ new reviews per month for consistent ranking improvements."
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
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
                <li key={customer.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="truncate text-xs text-gray-400">{customer.service}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {customer.rating && <StarRating rating={customer.rating} />}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="hidden text-xs text-gray-400 sm:block">{timeAgo}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <AlertTriangle size={20} className="text-orange-500" />
            Active Alerts
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
              {activeAlerts.length}
            </span>
          </h2>
          <div className="mt-4 space-y-3">
            {activeAlerts.map((item) => (
              <div key={item.id} className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{item.customerName}</p>
                  <StarRating rating={item.rating} />
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers Tab ───
function CustomersTab({ customers, demoToast }: { customers: Customer[]; demoToast: (msg: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return customers
      .filter((c) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!c.name.toLowerCase().includes(q) && !c.service.toLowerCase().includes(q)) return false;
        }
        if (statusFilter !== "all" && c.reviewRequestStatus !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customers, searchQuery, statusFilter]);

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="redirected">Redirected</option>
          <option value="private_feedback">Private Feedback</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium text-gray-500">Customer</th>
                <th className="hidden px-5 py-3 font-medium text-gray-500 sm:table-cell">Service</th>
                <th className="hidden px-5 py-3 font-medium text-gray-500 md:table-cell">Date</th>
                <th className="px-5 py-3 font-medium text-gray-500">Rating</th>
                <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => {
                const badge = STATUS_BADGES[c.reviewRequestStatus] ?? STATUS_BADGES.scheduled;
                const isExpanded = expandedId === c.id;
                return (
                  <tr key={c.id} className="group">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{c.service}</p>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-gray-600 sm:table-cell">{c.service}</td>
                    <td className="hidden px-5 py-3 text-gray-500 md:table-cell">
                      {c.bookingDate} {c.bookingTime}
                    </td>
                    <td className="px-5 py-3">
                      {c.rating ? <StarRating rating={c.rating} /> : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    {isExpanded && (
                      <td colSpan={6} className="bg-gray-50 px-5 py-4">
                        <div className="space-y-2 text-xs text-gray-600">
                          <p><span className="font-medium">Phone:</span> {c.phone}</p>
                          <p><span className="font-medium">Staff:</span> {c.staffMember}</p>
                          <p><span className="font-medium">Parse Confidence:</span> {c.parsingConfidence}%</p>
                          {c.reviewRequestSentAt && (
                            <p><span className="font-medium">Request Sent:</span> {new Date(c.reviewRequestSentAt).toLocaleString()}</p>
                          )}
                          {c.reviewRequestOpenedAt && (
                            <p><span className="font-medium">Opened:</span> {new Date(c.reviewRequestOpenedAt).toLocaleString()}</p>
                          )}
                          {c.redirectedAt && (
                            <p><span className="font-medium">Redirected to Google:</span> {new Date(c.redirectedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No customers match your search.</p>
        )}
      </div>
    </div>
  );
}

// ─── Feedback Tab ───
function FeedbackTab({ feedback, demoToast }: { feedback: FeedbackItem[]; demoToast: (msg: string) => void }) {
  return (
    <div className="space-y-4">
      {feedback.length === 0 ? (
        <p className="text-sm text-gray-400">No feedback items yet.</p>
      ) : (
        feedback.map((item) => {
          const badge = FEEDBACK_STATUS_BADGES[item.status] ?? FEEDBACK_STATUS_BADGES.new;
          return (
            <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-900">{item.customerName}</p>
                <StarRating rating={item.rating} />
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">{item.feedback}</p>

              {/* AI Suggested Reply */}
              {item.aiSuggestedReply && (
                <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary-700">AI Suggested Reply</p>
                    <DemoCopyButton text={item.aiSuggestedReply} />
                  </div>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{item.aiSuggestedReply}</p>
                </div>
              )}

              {/* Internal Notes */}
              {item.internalNotes && (
                <p className="mt-3 text-xs text-gray-500">
                  <span className="font-medium">Internal Notes:</span> {item.internalNotes}
                </p>
              )}

              {/* Resolution */}
              {item.resolution && (
                <p className="mt-2 text-xs text-green-600">
                  <span className="font-medium">Resolution:</span> {item.resolution}
                </p>
              )}

              {/* Demo-mode action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => demoToast("This is a demo — sign up to manage your own feedback")}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => demoToast("This is a demo — sign up to manage your own feedback")}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Analytics Tab ───
function AnalyticsTab({
  analytics,
  customers,
  businessSlug,
}: {
  analytics: AnalyticsData[];
  customers: Customer[];
  businessSlug: string;
}) {
  // Rating distribution
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    customers.forEach((c) => {
      if (c.rating) counts[c.rating - 1]++;
    });
    return counts.map((count, i) => ({
      name: `${i + 1} Star`,
      value: count,
    }));
  }, [customers]);

  // Insights per business
  const insights =
    businessSlug === "kings-cuts"
      ? [
          {
            type: "positive" as const,
            title: "Completion Rate Above Industry Average",
            body: "Your 66% completion rate crushes the 25-30% industry average. Businesses above 40% generate 2x more reviews per month. You're in elite territory.",
            action: "Keep your current SMS timing and template — it's clearly working.",
          },
          {
            type: "opportunity" as const,
            title: "Rating Trend Is Strong",
            body: "You've climbed from 3.9 to 4.3 average rating in 6 months. Crossing 4.0 stars means +20% sales and 2x traffic. Every additional 0.1 star = +25% conversion.",
            action: "Aim for 4.5+ by addressing the common themes in your negative feedback.",
          },
          {
            type: "warning" as const,
            title: "3 Negative Reviews This Month — Highest Yet",
            body: "Each negative review drives away 22% of prospects. 3 negative reviews = 59% potential customers lost. Your AI recovery system caught them all before Google.",
            action: "Review the feedback from Tyler and Isaac — there may be a training opportunity with one staff member.",
          },
          {
            type: "positive" as const,
            title: "Google Review Velocity Is Excellent",
            body: "28 Google reviews this month puts you well above the 10+/month target. Consistent weekly reviews boost rankings by up to 15%. You're building a compounding advantage.",
            action: "Maintain this pace — your competitors likely get fewer than 5 reviews per month.",
          },
        ]
      : [
          {
            type: "alert" as const,
            title: "Completion Rate Needs Urgent Attention",
            body: "Your 29% completion rate is below the 25-30% industry average. Businesses above 40% generate 2x more reviews. You're leaving significant revenue on the table.",
            action: "Review your SMS template and timing — try sending within 2-3 hours of dining instead of 3+.",
          },
          {
            type: "warning" as const,
            title: "High Volume of Negative Feedback",
            body: "3 negative reviews caught this month from only 11 completions is a 27% negative rate. 1 bad review drives away 22% of prospects and costs $3,750-$15,000 in lost lifetime value.",
            action: "Address the recurring service speed complaints — multiple customers mention long waits.",
          },
          {
            type: "opportunity" as const,
            title: "Rating Can Improve Significantly",
            body: "Moving from 3.7 to 4.0 stars would mean +20% sales and 2x traffic. The jump from 3.5 to 3.7 alone was +120% conversion growth. Every 0.1 matters enormously.",
            action: "Focus on resolving the service speed issues — this single fix could move your rating above 4.0.",
          },
          {
            type: "warning" as const,
            title: "Many Requests Going Unanswered",
            body: "You're sending 38 requests but only getting 11 completions. 27 customers are ignoring your review request. 94% of consumers are open to leaving a review when asked at the right moment.",
            action: "Test a shorter, more personalized SMS template. Mention the specific dish or occasion.",
          },
        ];

  const insightIcons = {
    positive: <CheckCircle size={18} className="text-green-600" />,
    warning: <TriangleAlert size={18} className="text-yellow-600" />,
    opportunity: <Lightbulb size={18} className="text-blue-600" />,
    alert: <AlertTriangle size={18} className="text-red-600" />,
  };

  const insightBorders = {
    positive: "border-green-200 bg-green-50/50",
    warning: "border-yellow-200 bg-yellow-50/50",
    opportunity: "border-blue-200 bg-blue-50/50",
    alert: "border-red-200 bg-red-50/50",
  };

  return (
    <div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Distribution Pie */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Rating Distribution</h3>
          <p className="text-xs text-gray-400 mt-1">96% of consumers read reviews before visiting a local business</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                >
                  {ratingDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requests Over Time Bar */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Requests Over Time</h3>
          <p className="text-xs text-gray-400 mt-1">SMS open rate: 98% vs email: 20-45%</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Rate Trend Line */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Completion Rate Trend</h3>
          <p className="text-xs text-gray-400 mt-1">Businesses above 40% completion generate 2x more reviews</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analytics.map((d) => ({
                  ...d,
                  rate: d.sent > 0 ? Math.round((d.completed / d.sent) * 100) : 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value: number) => [`${value}%`, "Completion Rate"]} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: "#0ea5e9", r: 4 }}
                  name="Completion Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Google Reviews Line */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Google Reviews Generated</h3>
          <p className="text-xs text-gray-400 mt-1">108% more revenue for businesses with 25+ reviews</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="redirected"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                  name="Google Reviews"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Lightbulb size={20} className="text-primary-600" />
          AI Insights
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border p-5 ${insightBorders[insight.type]}`}>
              <div className="flex items-center gap-2">
                {insightIcons[insight.type]}
                <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{insight.body}</p>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/60 p-3">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-primary-600" />
                <p className="text-xs font-medium text-gray-700">{insight.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Demo Page ───
const TABS = ["Overview", "Customers", "Feedback", "Analytics"] as const;

export default function DemoDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const { show: showToast, ToastUI } = useDemoToast();

  // Resolve demo data
  let business: Business;
  let customers: Customer[];
  let feedback: FeedbackItem[];
  let analytics: AnalyticsData[];

  if (slug === "kings-cuts") {
    business = kingsCutsBusiness;
    customers = kingsCutsCustomers;
    feedback = kingsCutsFeedback;
    analytics = kingsCutsAnalytics;
  } else if (slug === "bella-vista") {
    business = bellaVistaBusiness;
    customers = bellaVistaCustomers;
    feedback = bellaVistaFeedback;
    analytics = bellaVistaAnalytics;
  } else {
    if (typeof window !== "undefined") {
      router.push("/demo");
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Demo Banner */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-primary-600 px-4 py-2.5 text-white sm:px-6">
        <p className="text-sm font-medium">
          You&apos;re viewing a demo account &mdash; {business.name}
        </p>
        <Link
          href="/signup"
          className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors"
        >
          Start Getting Reviews
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/demo" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            &larr; Back to Demos
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{business.address}</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && (
          <OverviewTab
            business={business}
            customers={customers}
            feedback={feedback}
            analytics={analytics}
          />
        )}
        {activeTab === "Customers" && <CustomersTab customers={customers} demoToast={showToast} />}
        {activeTab === "Feedback" && <FeedbackTab feedback={feedback} demoToast={showToast} />}
        {activeTab === "Analytics" && (
          <AnalyticsTab analytics={analytics} customers={customers} businessSlug={slug} />
        )}
      </div>

      {ToastUI}
    </div>
  );
}
