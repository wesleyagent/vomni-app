import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Switching from Calmark to Vomni — WhatsApp reviews, customer re-engagement, zero commission",
  description: "Calmark doesn't collect Google reviews, doesn't protect your reputation, and has no way to bring back lapsed customers. Vomni does all three — on WhatsApp, automatically.",
};

export default function CalmarkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
