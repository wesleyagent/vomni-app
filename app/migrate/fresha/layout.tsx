import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Switching from Fresha to Vomni — no commission, no surprises",
  description: "Fresha now charges 20% on new clients and per-staff monthly fees. Vomni never takes commission. Your clients, your data, your revenue — always.",
};

export default function FreshaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
