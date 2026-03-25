"use client";

import { useState, useEffect } from "react";
import { Users, Send, ExternalLink, AlertTriangle } from "lucide-react";
import { getAdminSignups } from "@/lib/storage";

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
  const [signups, setSignups] = useState<SignupRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const raw = getAdminSignups() as SignupRecord[];
    setSignups(raw);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#00C896", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const totalBusinesses = signups.length;
  const totalReviewRequests = 0;
  const totalGoogleRedirects = 0;
  const totalParseFailures = 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Business signups and platform metrics</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Users, label: "Total Businesses", value: totalBusinesses },
            { icon: Send, label: "Review Requests", value: totalReviewRequests },
            { icon: ExternalLink, label: "Google Redirects", value: totalGoogleRedirects },
            { icon: AlertTriangle, label: "Parse Failures", value: totalParseFailures },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Icon size={16} />
                <p className="text-xs font-medium">{label}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
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
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
                            {s.plan ?? "--"}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 text-xs text-gray-400 lg:table-cell">
                          {s.signupTimestamp ? new Date(s.signupTimestamp).toLocaleString() : "--"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            s.onboardingComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
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

        {/* System Log */}
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
