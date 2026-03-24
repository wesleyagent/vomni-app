"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  explanation?: string;
}

const G = "#00C896";

export function StatCard({ label, value, subtext, trend, trendValue, icon, explanation }: StatCardProps) {
  return (
    <div
      className="bg-white p-5 hover:shadow-md transition-shadow"
      style={{ borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#6B7280' }}>{label}</p>
          <p
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 700, color: G, lineHeight: 1.1, marginTop: 4 }}
          >
            {value}
          </p>
          {subtext && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{subtext}</p>
          )}
        </div>
        {icon && (
          <div
            style={{ borderRadius: 10, background: 'rgba(0,200,150,0.1)', padding: '10px', color: G, flexShrink: 0 }}
          >
            {icon}
          </div>
        )}
      </div>
      {(trend || trendValue) && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up" && <TrendingUp size={14} style={{ color: G }} />}
          {trend === "down" && <TrendingDown size={14} className="text-red-500" />}
          {trend === "neutral" && <Minus size={14} className="text-gray-400" />}
          <span
            className={`text-xs font-medium ${trend === "up" ? "" : trend === "down" ? "text-red-500" : "text-gray-400"}`}
            style={trend === "up" ? { color: G } : {}}
          >
            {trendValue}
          </span>
        </div>
      )}
      {explanation && (
        <p
          className="mt-3 text-xs leading-relaxed"
          style={{ color: '#6B7280', borderTop: '1px solid #F3F4F6', paddingTop: 12, marginTop: 12 }}
        >
          {explanation}
        </p>
      )}
    </div>
  );
}
