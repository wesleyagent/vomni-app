"use client";
import { createContext, useContext } from "react";

export interface BusinessCtx {
  businessId: string;
  businessName: string;
  ownerName: string;
  email: string;
}

export const BusinessContext = createContext<BusinessCtx | null>(null);

export function useBusinessContext(): BusinessCtx {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessContext must be used within DashboardLayout");
  return ctx;
}
