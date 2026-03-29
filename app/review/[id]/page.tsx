"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { getBusiness, getCustomers, saveFeedback, updateCustomer, generateId } from "@/lib/storage";
import type { Business } from "@/types";

export default function ReviewGatingPage() {
  const params = useParams();
  const id = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const biz = getBusiness();
    setBusiness(biz);

    // Track that the review link was opened
    if (id) {
      const customers = getCustomers();
      const customer = customers.find((c) => c.id === id);
      if (customer && !customer.reviewRequestOpenedAt) {
        updateCustomer(id, {
          reviewRequestOpenedAt: new Date().toISOString(),
          reviewRequestStatus: "opened",
        });
      }
    }
  }, [id]);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    setSubmitted(true);

    // Update customer with rating
    if (id) {
      updateCustomer(id, { rating });
    }
  };

  const handleGoogleRedirect = () => {
    if (id) {
      updateCustomer(id, {
        reviewRequestStatus: "redirected",
        redirectedToGoogle: true,
        redirectedAt: new Date().toISOString(),
        reviewRequestClickedAt: new Date().toISOString(),
      });
    }
    if (business?.googleReviewLink) {
      window.open(business.googleReviewLink, "_blank");
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;

    // Save feedback to localStorage
    const customers = getCustomers();
    const customer = customers.find((c) => c.id === id);

    const feedbackId = generateId();
    saveFeedback({
      id: feedbackId,
      businessId: business?.id ?? "",
      customerId: id,
      customerName: customer?.name ?? "Customer",
      customerPhone: customer?.phone ?? "",
      rating: selectedRating,
      feedback: feedbackText,
      status: "new",
      createdAt: new Date().toISOString(),
    });

    // Update customer status
    if (id) {
      updateCustomer(id, {
        reviewRequestStatus: "private_feedback",
        feedbackId,
      });
    }

    setFeedbackSubmitted(true);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const businessName = business?.name ?? "our business";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-xl font-bold text-white">V</span>
          </div>
          {business && (
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              Powered by Vomni
            </p>
          )}
        </div>

        {/* Not submitted yet - show star selector */}
        {!submitted && (
          <div className="mt-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              How was your experience at {businessName}?
            </h1>
            <p className="mt-2 text-sm text-gray-500">Tap a star to rate</p>

            <div className="mt-8 flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingSelect(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={48}
                    className={
                      star <= (hoveredStar || selectedRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-200"
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Positive rating (4-5 stars) */}
        {submitted && selectedRating >= 4 && (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Star size={32} className="fill-green-600 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Thank you! We&apos;re glad you had a great experience.
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Would you mind sharing your experience on Google? It helps others find {businessName}.
            </p>
            <button
              onClick={handleGoogleRedirect}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-primary-700 transition-colors"
            >
              <Star size={20} />
              Leave a Google Review
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Takes about 30 seconds. Your review means the world to us.
            </p>
          </div>
        )}

        {/* Negative rating (1-3 stars) - feedback form */}
        {submitted && selectedRating <= 3 && !feedbackSubmitted && (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Star size={32} className="text-orange-500" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              We&apos;re sorry to hear that.
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your feedback helps us improve. Please tell us what happened.
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what happened..."
              rows={4}
              className="mt-6 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              autoFocus
            />

            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim()}
              className="mt-4 w-full rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        )}

        {/* Feedback submitted confirmation */}
        {submitted && selectedRating <= 3 && feedbackSubmitted && (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Thank you for your feedback.
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;ll be in touch. Your feedback is important to us and helps us serve you better.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
