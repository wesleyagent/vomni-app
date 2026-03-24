"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, ArrowLeft, Users, Send, ExternalLink, AlertTriangle } from "lucide-react";
import { getAdminSignups } from "@/lib/storage";

const ADMIN_PASSWORD = "vomni2026";

interface SignupRecord {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  plan?: string;
  signupTimestamp?: string;
  onboardingComplete?: boolean;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [signups, setSignups] = useState<SignupRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authenticated && mounted) {
      const raw = getAdminSignups() as SignupRecord[];
      setSignups(raw);
    }
  }, [authenticated, mounted]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  // Compute admin stats
  const totalBusinesses = signups.length;
  const totalReviewRequests = 0; // placeholder — real data would come from aggregation
  const totalGoogleRedirects = 0;
  const totalParseFailures = 0;

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  // ─── Login Screen ───
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Lock size={24} className="text-primary-600" />
            </div>
            <h1 className="mt-4 text-center text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="mt-1 text-center text-sm text-gray-500">Enter the admin password to continue</p>

            <form onSubmit={handleLogin} className="mt-6">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Password"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              &larr; Back to Vomni
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Dashboard ───
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Vomni
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Vomni Admin Panel</h1>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Users size={16} />
              <p className="text-xs font-medium">Total Businesses</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalBusinesses}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Send size={16} />
              <p className="text-xs font-medium">Review Requests</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalReviewRequests}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <ExternalLink size={16} />
              <p className="text-xs font-medium">Google Redirects</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalGoogleRedirects}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <AlertTriangle size={16} />
              <p className="text-xs font-medium">Parse Failures</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalParseFailures}</p>
          </div>
        </div>

        {/* Signups Table */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Business Signups</h2>
          {signups.length === 0 ? (
            <div className="mt-4 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No businesses have signed up yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 font-medium text-gray-500">Business Name</th>
                      <th className="px-5 py-3 font-medium text-gray-500">Owner</th>
                      <th className="hidden px-5 py-3 font-medium text-gray-500 sm:table-cell">Email</th>
                      <th className="hidden px-5 py-3 font-medium text-gray-500 md:table-cell">Phone</th>
                      <th className="px-5 py-3 font-medium text-gray-500">Plan</th>
                      <th className="hidden px-5 py-3 font-medium text-gray-500 lg:table-cell">Signed Up</th>
                      <th className="px-5 py-3 font-medium text-gray-500">Onboarding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {signups.map((s, i) => (
                      <tr key={i}>
                        <td className="px-5 py-3 font-medium text-gray-900">{s.businessName ?? "--"}</td>
                        <td className="px-5 py-3 text-gray-600">{s.ownerName ?? "--"}</td>
                        <td className="hidden px-5 py-3 text-gray-600 sm:table-cell">{s.email ?? "--"}</td>
                        <td className="hidden px-5 py-3 text-gray-500 md:table-cell">{s.phone ?? "--"}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                            {s.plan ?? "--"}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 text-xs text-gray-400 lg:table-cell">
                          {s.signupTimestamp ? new Date(s.signupTimestamp).toLocaleString() : "--"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              s.onboardingComplete
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {s.onboardingComplete ? "Complete" : "In Progress"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* System Log Placeholder */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">System Log</h2>
          <div className="mt-4 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400">System logs will appear here once the platform is live.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
