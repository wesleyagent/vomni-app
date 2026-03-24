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

export function StatCard({ label, value, subtext, trend, trendValue, icon, explanation }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
        </div>
        {icon && <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600">{icon}</div>}
      </div>
      {(trend || trendValue) && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up" && <TrendingUp size={14} className="text-green-600" />}
          {trend === "down" && <TrendingDown size={14} className="text-red-500" />}
          {trend === "neutral" && <Minus size={14} className="text-gray-400" />}
          <span className={`text-xs font-medium ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400"}`}>
            {trendValue}
          </span>
        </div>
      )}
      {explanation && (
        <p className="mt-3 text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-3">{explanation}</p>
      )}
    </div>
  );
}
