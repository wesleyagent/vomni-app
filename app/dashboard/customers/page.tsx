"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { format, isAfter, startOfWeek, startOfMonth } from "date-fns";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Users,
  Clock,
  Send,
  Eye,
  MousePointerClick,
  ExternalLink,
  MessageSquare,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { getCustomers, getBusiness } from "@/lib/storage";
import type { Customer, ReviewRequestStatus } from "@/types";

const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<
  ReviewRequestStatus,
  { label: string; className: string }
> = {
  scheduled: { label: "Scheduled", className: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  opened: { label: "Opened", className: "bg-amber-100 text-amber-700" },
  clicked: { label: "Clicked", className: "bg-sky-100 text-sky-700" },
  submitted: { label: "Submitted", className: "bg-green-100 text-green-700" },
  redirected: {
    label: "Redirected",
    className: "bg-green-100 text-green-700",
  },
  private_feedback: {
    label: "Private Feedback",
    className: "bg-orange-100 text-orange-700",
  },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  opted_out: { label: "Opted Out", className: "bg-gray-100 text-gray-500" },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked" },
  { value: "redirected", label: "Redirected" },
  { value: "private_feedback", label: "Private Feedback" },
  { value: "failed", label: "Failed" },
];

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}

interface TimelineEvent {
  label: string;
  time: string | undefined;
  icon: React.ReactNode;
}

function CustomerTimeline({ customer }: { customer: Customer }) {
  const events: TimelineEvent[] = [
    {
      label: "Booking created",
      time: customer.createdAt,
      icon: <CheckCircle2 size={14} />,
    },
    {
      label: "Request sent",
      time: customer.reviewRequestSentAt,
      icon: <Send size={14} />,
    },
    {
      label: "Email opened",
      time: customer.reviewRequestOpenedAt,
      icon: <Eye size={14} />,
    },
    {
      label: "Link clicked",
      time: customer.reviewRequestClickedAt,
      icon: <MousePointerClick size={14} />,
    },
  ];

  if (customer.rating !== undefined) {
    events.push({
      label: `Rated ${customer.rating} star${customer.rating !== 1 ? "s" : ""}`,
      time: customer.reviewRequestClickedAt,
      icon: <Star size={14} />,
    });
  }

  if (customer.redirectedToGoogle && customer.redirectedAt) {
    events.push({
      label: "Redirected to Google",
      time: customer.redirectedAt,
      icon: <ExternalLink size={14} />,
    });
  }

  if (customer.reviewRequestStatus === "private_feedback") {
    events.push({
      label: "Private feedback received",
      time: customer.reviewRequestClickedAt,
      icon: <MessageSquare size={14} />,
    });
  }

  if (customer.reviewRequestStatus === "failed") {
    events.push({
      label: "Delivery failed",
      time: customer.reviewRequestSentAt,
      icon: <XCircle size={14} />,
    });
  }

  const completedEvents = events.filter((e) => e.time);

  return (
    <div className="py-4 px-2">
      {completedEvents.length === 0 ? (
        <p className="text-sm text-gray-400">No timeline events yet.</p>
      ) : (
        <div className="relative ml-2">
          {completedEvents.map((event, idx) => (
            <div key={idx} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {/* Vertical line */}
              {idx < completedEvents.length - 1 && (
                <div className="absolute left-[7px] top-5 h-full w-px bg-gray-200" />
              )}
              {/* Dot */}
              <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                {event.icon}
              </div>
              {/* Content */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">
                  {event.label}
                </p>
                <p className="text-xs text-gray-400">
                  {event.time
                    ? format(new Date(event.time), "MMM d, yyyy 'at' h:mm a")
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  useEffect(() => {
    setCustomers(getCustomers());
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick() {
      setShowStatusDropdown(false);
      setShowDateDropdown(false);
    }
    if (showStatusDropdown || showDateDropdown) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [showStatusDropdown, showDateDropdown]);

  const filtered = useMemo(() => {
    let result = [...customers];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.service.toLowerCase().includes(q) ||
          c.staffMember.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (c) => c.reviewRequestStatus === statusFilter
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === "week") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      result = result.filter((c) => isAfter(new Date(c.createdAt), start));
    } else if (dateFilter === "month") {
      const start = startOfMonth(now);
      result = result.filter((c) => isAfter(new Date(c.createdAt), start));
    }

    // Sort newest first
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [customers, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-12 shadow-sm">
          <Users size={48} className="text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No customers yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Once you start forwarding booking emails, your customers will appear
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} customer{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Filters bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, service, or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(!showStatusDropdown);
              setShowDateDropdown(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Filter size={14} />
            {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ??
              "Status"}
            <ChevronDown size={14} />
          </button>
          {showStatusDropdown && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setShowStatusDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    statusFilter === opt.value
                      ? "font-medium text-primary-600"
                      : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDateDropdown(!showDateDropdown);
              setShowStatusDropdown(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock size={14} />
            {DATE_OPTIONS.find((o) => o.value === dateFilter)?.label ??
              "Date"}
            <ChevronDown size={14} />
          </button>
          {showDateDropdown && (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setDateFilter(opt.value);
                    setShowDateDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    dateFilter === opt.value
                      ? "font-medium text-primary-600"
                      : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Customer
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Service
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Staff
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((customer) => {
              const badge =
                STATUS_CONFIG[customer.reviewRequestStatus] ??
                STATUS_CONFIG.scheduled;
              const isExpanded = expandedId === customer.id;

              return (
                <Fragment key={customer.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(isExpanded ? null : customer.id)
                    }
                    className="cursor-pointer transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {customer.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {customer.service}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {customer.staffMember}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {format(new Date(customer.bookingDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {customer.rating !== undefined ? (
                        <StarRating rating={customer.rating} />
                      ) : (
                        <span className="text-sm text-gray-300">&mdash;</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50/50 px-5">
                        <CustomerTimeline customer={customer} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {paginated.map((customer) => {
          const badge =
            STATUS_CONFIG[customer.reviewRequestStatus] ??
            STATUS_CONFIG.scheduled;
          const isExpanded = expandedId === customer.id;

          return (
            <div
              key={customer.id}
              className="rounded-xl border border-gray-100 bg-white shadow-sm"
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : customer.id)
                }
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {customer.service} &middot; {customer.staffMember}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {format(new Date(customer.bookingDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {customer.rating !== undefined ? (
                      <StarRating rating={customer.rating} />
                    ) : null}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4">
                  <CustomerTimeline customer={customer} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && customers.length > 0 && (
        <div className="mt-8 flex flex-col items-center justify-center py-12">
          <Search size={32} className="text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No customers match your filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setDateFilter("all");
            }}
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

