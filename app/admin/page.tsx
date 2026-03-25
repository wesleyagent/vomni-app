"use client";

import { useState, useEffect } from "react";
import { Users, Send, ExternalLink, AlertTriangle, Pencil, Trash2, CircleX } from "lucide-react";
import { getAdminSignups, updateAdminSignup, deleteAdminSignup } from "@/lib/storage";

const G = "#00C896";

interface SignupRecord {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  plan?: string;
  signupTimestamp?: string;
  onboardingComplete?: boolean;
}

const emptyForm: SignupRecord = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  plan: "monthly",
  onboardingComplete: false,
};

export default function AdminPage() {
  const [signups, setSignups] = useState<SignupRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SignupRecord>(emptyForm);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setSignups(getAdminSignups() as SignupRecord[]);
  }, []);

  function openEdit(i: number) {
    setEditForm({ ...signups[i] });
    setEditingIndex(i);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    updateAdminSignup(editingIndex, editForm);
    setSignups((prev) => prev.map((s, i) => i === editingIndex ? editForm : s));
    setEditingIndex(null);
  }

  function confirmDelete(i: number) {
    deleteAdminSignup(i);
    setSignups((prev) => prev.filter((_, idx) => idx !== i));
    setDeletingIndex(null);
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
      </div>
    );
  }

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
            { icon: Users, label: "Total Businesses", value: signups.length },
            { icon: Send, label: "Review Requests", value: 0 },
            { icon: ExternalLink, label: "Google Redirects", value: 0 },
            { icon: AlertTriangle, label: "Parse Failures", value: 0 },
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
                      <th className="px-5 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {signups.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{s.businessName ?? "--"}</td>
                        <td className="px-5 py-3 text-gray-600">{s.ownerName ?? "--"}</td>
                        <td className="hidden px-5 py-3 text-gray-600 sm:table-cell">{s.email ?? "--"}</td>
                        <td className="hidden px-5 py-3 text-gray-500 md:table-cell">{s.phone ?? "--"}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "rgba(0,200,150,0.1)", color: G }}>
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
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(i)}
                              className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                              title="Edit"
                            >
                              <Pencil size={12} />
                            </button>
                            {deletingIndex === i ? (
                              <span className="flex items-center gap-1">
                                <button
                                  onClick={() => confirmDelete(i)}
                                  className="rounded-md px-2 py-1 text-xs font-medium text-white"
                                  style={{ background: "#EF4444" }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingIndex(null)}
                                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setDeletingIndex(i)}
                                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
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

      {/* Edit Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingIndex(null); }}>
          <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Business</h2>
              <button onClick={() => setEditingIndex(null)} className="rounded-md p-1 text-gray-400 hover:text-gray-600">
                <CircleX size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {([
                { label: "Business name", key: "businessName" },
                { label: "Owner name", key: "ownerName" },
                { label: "Email", key: "email" },
                { label: "Phone", key: "phone" },
              ] as { label: string; key: keyof SignupRecord }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                  <input
                    value={(editForm[key] as string) ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                    onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Plan</label>
                <select
                  value={editForm.plan ?? "monthly"}
                  onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Onboarding</label>
                <select
                  value={editForm.onboardingComplete ? "complete" : "in_progress"}
                  onChange={(e) => setEditForm((f) => ({ ...f, onboardingComplete: e.target.value === "complete" }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setEditingIndex(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: G }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
