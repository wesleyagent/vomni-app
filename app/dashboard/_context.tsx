"use client";
import { createContext, useContext } from "react";

export interface BusinessCtx {
  businessId: string;
  businessName: string;
  ownerName: string;
  email: string;
  timezone: string;  // IANA timezone from businesses.booking_timezone, e.g. "Asia/Jerusalem"
  currency: string;  // ISO currency code from businesses.booking_currency, e.g. "ILS" | "GBP"
}

export const BusinessContext = createContext<BusinessCtx | null>(null);

export function useBusinessContext(): BusinessCtx {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessContext must be used within DashboardLayout");
  return ctx;
}
