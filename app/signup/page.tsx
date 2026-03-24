"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBusiness, generateId, generateForwardingEmail, saveAdminSignup } from "@/lib/storage";
import type { Business } from "@/types";
import type { Plan } from "@/types";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<Plan>("monthly");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const business: Business = {
      id: generateId(),
      name: businessName,
      ownerName,
      email,
      phone,
      address: "",
      googleReviewLink: "",
      brandColor: "#0EA5E9",
      plan,
      forwardingEmail: generateForwardingEmail(businessName),
      smsTemplate:
        "Hi {name}, thanks for visiting {business}! We'd love your feedback. Tap here to leave a quick review: {link}",
      reviewRequestDelay: 24,
      quietHoursStart: 22,
      quietHoursEnd: 8,
      notifyOnNegative: true,
      notifyEmail: email,
      onboardingComplete: false,
      onboardingSteps: [false, false, false, false, false],
      createdAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    saveBusiness(business);

    saveAdminSignup({
      businessName,
      ownerName,
      email,
      phone,
      plan,
      signupTimestamp: new Date().toISOString(),
      onboardingComplete: false,
    });

    // Fire-and-forget API call
    try {
      fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, ownerName, email, phone, plan }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-sky-500 tracking-tight">
              vomni
            </h1>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-8">
            Start Getting More Google Reviews
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="King's Cuts Barbershop"
              />
            </div>

            {/* Owner name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner name
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Marcus Johnson"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="marcus@kingcuts.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Create a password"
                minLength={8}
              />
            </div>

            {/* Plan selector */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose your plan
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Monthly */}
                <button
                  type="button"
                  onClick={() => setPlan("monthly")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    plan === "monthly"
                      ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">
                    Monthly
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    $70
                    <span className="text-sm font-normal text-gray-500">
                      /mo
                    </span>
                  </div>
                </button>

                {/* Annual */}
                <button
                  type="button"
                  onClick={() => setPlan("annual")}
                  className={`rounded-xl border-2 p-4 text-left transition-all relative ${
                    plan === "annual"
                      ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="absolute -top-2.5 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Save $240
                  </span>
                  <div className="text-sm font-semibold text-gray-900">
                    Annual
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    $600
                    <span className="text-sm font-normal text-gray-500">
                      /yr
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Your Account"}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <a
              href="/dashboard"
              className="text-sky-500 hover:text-sky-600 font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
