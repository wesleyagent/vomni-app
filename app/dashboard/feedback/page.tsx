"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Star,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Save,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getFeedback, updateFeedback } from "@/lib/storage";
import type { FeedbackItem, FeedbackStatus } from "@/types";

// Inline toast system
function useToast() {
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "info" }[]
  >([]);

  function showToast(message: string, type: "success" | "info" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  function ToastContainer() {
    if (toasts.length === 0) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    );
  }

  return { showToast, ToastContainer };
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const FEEDBACK_STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  new: {
    label: "New",
    className: "bg-red-100 text-red-700",
    icon: <AlertCircle size={12} />,
  },
  in_progress: {
    label: "In Progress",
    className: "bg-yellow-100 text-yellow-700",
    icon: <Clock size={12} />,
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-700",
    icon: <CheckCircle2 size={12} />,
  },
};

function FeedbackStars({ rating }: { rating: number }) {
  const color = rating <= 2 ? "text-red-400 fill-red-400" : "text-orange-400 fill-orange-400";
  const emptyColor = rating <= 2 ? "text-red-200" : "text-orange-200";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= rating ? color : emptyColor}
        />
      ))}
    </div>
  );
}

interface FeedbackCardProps {
  item: FeedbackItem;
  onUpdate: (id: string, updates: Partial<FeedbackItem>) => void;
  showToast: (message: string, type?: "success" | "info") => void;
}

function FeedbackCard({ item, onUpdate, showToast }: FeedbackCardProps) {
  const [notes, setNotes] = useState(item.internalNotes ?? "");
  const [resolution, setResolution] = useState(item.resolution ?? "");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showAiReply, setShowAiReply] = useState(
    item.aiSuggestedReply ? true : false
  );

  const statusConfig = FEEDBACK_STATUS_CONFIG[item.status];

  function handleCopy() {
    if (item.aiSuggestedReply) {
      navigator.clipboard.writeText(item.aiSuggestedReply);
      setCopied(true);
      showToast("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleRegenerate() {
    setRegenerating(true);
    setTimeout(() => {
      setRegenerating(false);
      showToast("AI reply regenerated", "info");
    }, 2000);
  }

  function handleSaveNotes() {
    onUpdate(item.id, { internalNotes: notes });
    showToast("Notes saved");
  }

  function handleMarkResolved() {
    onUpdate(item.id, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolution: resolution,
    });
    showToast("Feedback marked as resolved");
  }

  function handleMarkInProgress() {
    onUpdate(item.id, { status: "in_progress" });
    showToast("Feedback marked as in progress");
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
            {item.customerName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {item.customerName}
            </p>
            <p className="text-xs text-gray-500">{item.customerPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FeedbackStars rating={item.rating} />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          <span className="text-xs text-gray-400">
            {format(new Date(item.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Feedback text */}
      <div className="border-b border-gray-100 p-4">
        <p className="text-sm leading-relaxed text-gray-700">{item.feedback}</p>
      </div>

      {/* AI Suggested Reply */}
      {item.aiSuggestedReply && (
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-blue-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              AI Suggested Reply
            </h4>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm leading-relaxed text-blue-800">
              {item.aiSuggestedReply}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={regenerating ? "animate-spin" : ""}
                />
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <div className="border-b border-gray-100 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Internal Notes
        </h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this feedback..."
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
        />
        <button
          onClick={handleSaveNotes}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Save size={12} />
          Save Notes
        </button>
      </div>

      {/* Resolution section */}
      {(item.status === "in_progress" || item.status === "resolved") && (
        <div className="border-b border-gray-100 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Resolution
          </h4>
          {item.status === "resolved" ? (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm text-green-800">
                {item.resolution || "No resolution details provided."}
              </p>
              {item.resolvedAt && (
                <p className="mt-1 text-xs text-green-600">
                  Resolved on{" "}
                  {format(new Date(item.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          ) : (
            <>
              <input
                type="text"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this was resolved..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
              <button
                onClick={handleMarkResolved}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={12} />
                Mark as Resolved
              </button>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 p-4">
        {item.status === "new" && (
          <button
            onClick={handleMarkInProgress}
            className="flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
          >
            <Clock size={12} />
            Mark In Progress
          </button>
        )}
        {item.status === "in_progress" && !resolution && (
          <button
            onClick={handleMarkResolved}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 size={12} />
            Mark as Resolved
          </button>
        )}
        <button
          onClick={() => showToast("SMS reply coming soon", "info")}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Phone size={12} />
          Reply via SMS
        </button>
        <button
          onClick={() => showToast("Email reply coming soon", "info")}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Mail size={12} />
          Reply via Email
        </button>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    setFeedbackItems(getFeedback());
    setMounted(true);
  }, []);

  const newCount = useMemo(
    () => feedbackItems.filter((f) => f.status === "new").length,
    [feedbackItems]
  );

  const filtered = useMemo(() => {
    if (activeTab === "all") return feedbackItems;
    return feedbackItems.filter((f) => f.status === activeTab);
  }, [feedbackItems, activeTab]);

  // Sort newest first
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [filtered]
  );

  function handleUpdate(id: string, updates: Partial<FeedbackItem>) {
    updateFeedback(id, updates);
    // Refresh state
    setFeedbackItems(getFeedback());
  }

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback Inbox</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage negative feedback before it reaches public reviews
        </p>
      </div>

      {feedbackItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-12 shadow-sm">
          <MessageSquare size={48} className="text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No negative feedback yet
          </h3>
          <p className="mt-2 max-w-md text-center text-sm text-gray-500">
            When a customer rates their experience 1-3 stars, their feedback
            will appear here. This is a good thing — it means your customers
            are happy!
          </p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                  {tab.value === "new" && newCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {newCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback cards */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-12 shadow-sm">
              <MessageSquare size={32} className="text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No feedback items in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
