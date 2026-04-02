"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Globe, Phone, Instagram, Search, ChevronUp, ChevronDown } from "lucide-react";

const G = "#00C896";

interface RadarBusiness {
  id: string;
  source: "google_maps" | "ica_registry";
  external_id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  registration_date: string | null;
  instagram_handle: string | null;
  instagram_created_month: string | null;
  first_seen_at: string;
  alerted: boolean;
}

type SortKey = "review_count" | "rating" | "first_seen_at";
type SortDir = "asc" | "desc";

function sourceBadge(source: string) {
  if (source === "google_maps") {
    return (
      <span style={{ background: "#EFF6FF", color: "#3B82F6", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>
        📍 Google Maps
      </span>
    );
  }
  return (
    <span style={{ background: "#FFF7ED", color: "#F59E0B", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>
      🏛 ICA Registry
    </span>
  );
}

function newnessBadge(biz: RadarBusiness) {
  if (biz.source === "ica_registry") {
    return (
      <span style={{ background: "rgba(0,200,150,0.1)", color: G, borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>
        🆕 New Company
      </span>
    );
  }
  const rc = biz.review_count;
  if (rc === null || rc === undefined) return <span className="text-xs text-gray-300">—</span>;
  if (rc === 0) return <span style={{ background: "rgba(0,200,150,0.12)", color: "#059669", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>🆕 0 reviews</span>;
  if (rc <= 10) return <span style={{ background: "rgba(0,200,150,0.08)", color: G, borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>✨ {rc} reviews</span>;
  if (rc <= 50) return <span style={{ background: "#F3F4F6", color: "#6B7280", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>{rc} reviews</span>;
  return <span style={{ background: "#F3F4F6", color: "#9CA3AF", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>{rc} reviews</span>;
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-gray-400">—</span>;
  const color = rating >= 4.3 ? "#10B981" : rating >= 3.5 ? "#F59E0B" : "#EF4444";
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

/** A business is a target if it's new OR in the pain-rating zone */
function isTarget(b: RadarBusiness): boolean {
  if (b.source === "ica_registry") return true;
  const rc = b.review_count;
  const r = b.rating;
  const isNew = rc === null || rc <= 50;
  const isPain = r !== null && r >= 3.5 && r <= 4.3;
  return isNew || isPain;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 text-gray-300">↕</span>;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="inline ml-1" style={{ color: G }} />
    : <ChevronDown size={12} className="inline ml-1" style={{ color: G }} />;
}

export default function RadarPage() {
  const [businesses, setBusinesses] = useState<RadarBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterType, setFilterType] = useState("targets"); // default: targets only
  const [sortKey, setSortKey] = useState<SortKey>("first_seen_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db/radar_businesses?order=first_seen_at.desc&limit=500");
      if (res.ok) {
        const data = await res.json();
        setBusinesses(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBusinesses(); }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = businesses
    .filter((b) => {
      const name = b.name?.toLowerCase() ?? "";
      const addr = b.address?.toLowerCase() ?? "";
      const q = search.toLowerCase();
      if (q && !name.includes(q) && !addr.includes(q)) return false;
      if (filterSource !== "all" && b.source !== filterSource) return false;
      if (filterType === "targets" && !isTarget(b)) return false;
      if (filterType === "new" && b.source !== "ica_registry" && (b.review_count ?? 999) > 50) return false;
      if (filterType === "pain" && (b.rating === null || b.rating < 3.5 || b.rating > 4.3)) return false;
      if (filterType === "ica" && b.source !== "ica_registry") return false;
      return true;
    })
    .sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "review_count") {
        av = a.review_count ?? -1;
        bv = b.review_count ?? -1;
      } else if (sortKey === "rating") {
        av = a.rating ?? -1;
        bv = b.rating ?? -1;
      } else {
        av = new Date(a.first_seen_at).getTime();
        bv = new Date(b.first_seen_at).getTime();
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

  const total = businesses.length;
  const targetCount = businesses.filter(isTarget).length;
  const icaCount = businesses.filter((b) => b.source === "ica_registry").length;
  const newCount = businesses.filter((b) => b.source === "google_maps" && (b.review_count ?? 999) <= 50).length;
  const painCount = businesses.filter((b) => b.rating !== null && b.rating >= 3.5 && b.rating <= 4.3).length;
  const hasIg = businesses.filter((b) => b.instagram_handle).length;

  const thStyle = (key?: SortKey): React.CSSProperties => ({
    padding: "10px 16px",
    fontSize: 11,
    fontWeight: 600,
    color: key && sortKey === key ? G : "#6B7280",
    whiteSpace: "nowrap" as const,
    cursor: key ? "pointer" : "default",
    userSelect: "none",
    background: "transparent",
  });

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      <div className="mx-auto max-w-full px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 }}>
              Business Radar
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              New &amp; struggling barbers/salons in Tel Aviv metro — Google Maps + ICA Registry
            </p>
          </div>
          <button
            onClick={fetchBusinesses}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: loading ? "#9CA3AF" : G, cursor: loading ? "not-allowed" : "pointer" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-5 gap-3">
          {[
            { label: "Total in DB", value: total, color: "#111827" },
            { label: "Targets", value: targetCount, color: G },
            { label: "New (≤50 reviews)", value: newCount, color: "#3B82F6" },
            { label: "Pain zone (3.5–4.3★)", value: painCount, color: "#F59E0B" },
            { label: "Has Instagram", value: hasIg, color: "#8B5CF6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color }}>
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or address..."
              className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none"
              style={{ width: 240 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
          >
            <option value="all">All Sources</option>
            <option value="google_maps">Google Maps</option>
            <option value="ica_registry">ICA Registry</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
          >
            <option value="targets">🎯 Targets only (new OR pain zone)</option>
            <option value="all">All Businesses</option>
            <option value="new">New only (≤50 reviews)</option>
            <option value="pain">Pain zone only (3.5–4.3★)</option>
            <option value="ica">ICA Registry only</option>
          </select>

          <span className="text-sm text-gray-400">{filtered.length} shown</span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th style={thStyle()}>Business</th>
                  <th style={thStyle()}>Source</th>
                  <th
                    style={thStyle("review_count")}
                    onClick={() => toggleSort("review_count")}
                    title="Sort by review count"
                  >
                    Reviews <SortIcon col="review_count" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    style={thStyle("rating")}
                    onClick={() => toggleSort("rating")}
                    title="Sort by rating"
                  >
                    Rating <SortIcon col="rating" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th style={thStyle()}>Address</th>
                  <th style={thStyle()}>Contact</th>
                  <th style={thStyle()}>Instagram</th>
                  <th
                    style={thStyle("first_seen_at")}
                    onClick={() => toggleSort("first_seen_at")}
                    title="Sort by detected date"
                  >
                    Detected <SortIcon col="first_seen_at" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No businesses found</td>
                  </tr>
                ) : filtered.map((biz) => (
                  <tr key={biz.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">

                    {/* Business name */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-medium text-gray-900 truncate" title={biz.name ?? ""}>
                        {biz.name ?? <span className="text-gray-400 italic">Unknown</span>}
                      </div>
                      {biz.website && (
                        <a href={biz.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 mt-0.5 truncate">
                          <Globe size={10} /> {biz.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                        </a>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {sourceBadge(biz.source)}
                      {biz.source === "ica_registry" && biz.registration_date && (
                        <div className="text-xs text-gray-400 mt-1">Reg: {biz.registration_date}</div>
                      )}
                    </td>

                    {/* Reviews */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {newnessBadge(biz)}
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StarRating rating={biz.rating} />
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-xs text-gray-600 truncate block" title={biz.address ?? ""}>
                        {biz.address ?? <span className="text-gray-400">—</span>}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {biz.phone ? (
                        <a href={`tel:${biz.phone}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-500">
                          <Phone size={10} /> {biz.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Instagram */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {biz.instagram_handle ? (
                        <a
                          href={`https://instagram.com/${biz.instagram_handle}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs hover:text-pink-500"
                          style={{ color: "#8B5CF6" }}
                        >
                          <Instagram size={11} />
                          @{biz.instagram_handle}
                          {biz.instagram_created_month && (
                            <span className="text-gray-400 ml-1">({biz.instagram_created_month})</span>
                          )}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Detected date */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                      {new Date(biz.first_seen_at).toLocaleDateString("he-IL", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>🎯 Targets = new businesses (≤50 reviews or ICA) OR pain zone (3.5–4.3★)</span>
          <span>⭐ Rating: <span style={{ color: "#10B981" }}>green ≥4.3</span> · <span style={{ color: "#F59E0B" }}>amber 3.5–4.2</span> · <span style={{ color: "#EF4444" }}>red &lt;3.5</span></span>
        </div>
      </div>
    </div>
  );
}
