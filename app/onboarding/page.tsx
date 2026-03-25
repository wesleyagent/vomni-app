"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBusiness, updateBusiness } from "@/lib/storage";
import type { Business } from "@/types";
import { CheckCircle2, Circle } from "lucide-react";
import { EmailForwardingSetup } from "./EmailForwardingSetup";

const G = "#00C896";
const N = "#0A0F1E";

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none";

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputClass} ${props.className ?? ""}`}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = G;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,200,150,0.12)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [googleLink, setGoogleLink] = useState("");
  const refreshBusiness = useCallback(() => {
    const biz = getBusiness();
    if (!biz) {
      router.push("/signup");
      return;
    }
    setBusiness(biz);
    setBizName(biz.name);
    setBizPhone(biz.phone);
    setBizAddress(biz.address);
    setGoogleLink(biz.googleReviewLink);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refreshBusiness();
  }, [refreshBusiness]);

  if (loading || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const steps = business.onboardingSteps;
  const completedCount = steps.filter(Boolean).length;

  function markStep(index: number, updates: Partial<Business> = {}) {
    const newSteps = [...steps];
    newSteps[index] = true;
    updateBusiness({ ...updates, onboardingSteps: newSteps });
    refreshBusiness();
  }

  function handleGoLive() {
    updateBusiness({ onboardingComplete: true });
    router.push("/dashboard");
  }

  const canGoLive = steps[0] && steps[1] && steps[2];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 28, color: N, letterSpacing: '-0.5px' }}
          >
            vomni
          </h1>
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Set up your account</h2>
          <p className="text-sm text-gray-500 mt-1">Step {Math.min(completedCount + 1, 5)} of 5</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-10">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 5) * 100}%`, background: G }}
          />
        </div>

        <div className="space-y-4">
          {/* Step 1: Business details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              {steps[0] ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: G }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Add your business details</h3>
                {!steps[0] && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Business name</label>
                      <StyledInput
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Phone</label>
                      <StyledInput
                        type="tel"
                        value={bizPhone}
                        onChange={(e) => setBizPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Address</label>
                      <StyledInput
                        type="text"
                        value={bizAddress}
                        onChange={(e) => setBizAddress(e.target.value)}
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                    <button
                      onClick={() => markStep(0, { name: bizName, phone: bizPhone, address: bizAddress })}
                      className="text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      style={{ background: G }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#00A87D'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                    >
                      Mark as complete
                    </button>
                  </div>
                )}
                {steps[0] && (
                  <p className="text-sm text-gray-500 mt-1">
                    {business.name} &mdash; {business.address || "No address"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Google review link */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              {steps[1] ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: G }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Add your Google review link</h3>
                {!steps[1] && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-500">
                      Go to Google Maps, search for your business, click &ldquo;Write a review&rdquo;, and copy the URL.
                    </p>
                    <StyledInput
                      type="url"
                      value={googleLink}
                      onChange={(e) => setGoogleLink(e.target.value)}
                      placeholder="https://g.page/r/..."
                    />
                    <button
                      onClick={() => markStep(1, { googleReviewLink: googleLink })}
                      disabled={!googleLink}
                      className="text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: G }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = '#00A87D'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                    >
                      Mark as complete
                    </button>
                  </div>
                )}
                {steps[1] && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{business.googleReviewLink}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Email forwarding */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              {steps[2] ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: G }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Set up email forwarding</h3>
                {!steps[2] && (
                  <EmailForwardingSetup onComplete={() => markStep(2)} />
                )}
                {steps[2] && (
                  <p className="text-sm text-gray-500 mt-1">Forwarding to forwarding@vomni.io</p>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Test booking */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              {steps[3] ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: G }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Send a test booking</h3>
                {!steps[3] && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-500">
                      Forward a booking confirmation email to{" "}
                      <span className="font-mono text-gray-700">{business.forwardingEmail}</span>{" "}
                      to test the system. This step is optional.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markStep(3)}
                        className="text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        style={{ background: G }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#00A87D'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                      >
                        Mark as done
                      </button>
                      <button
                        onClick={() => markStep(3)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}
                {steps[3] && <p className="text-sm text-gray-500 mt-1">Completed</p>}
              </div>
            </div>
          </div>

          {/* Step 5: Go live */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              {steps[4] ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: G }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Go live!</h3>
                {!steps[4] && (
                  <div className="mt-4">
                    {!canGoLive && (
                      <p className="text-sm text-amber-600 mb-3">Complete steps 1-3 before launching.</p>
                    )}
                    <button
                      onClick={handleGoLive}
                      disabled={!canGoLive}
                      className="text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: G }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = '#00A87D'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                    >
                      Launch Vomni
                    </button>
                  </div>
                )}
                {steps[4] && <p className="text-sm text-gray-500 mt-1">You&apos;re live!</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
