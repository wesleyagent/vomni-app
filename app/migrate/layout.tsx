import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Migrate to Vomni — Switch from Fresha, Booksy, or Calmark",
  description: "Switching to Vomni takes less than 30 minutes. Your customer list imports in minutes. No commission. WhatsApp-first. Your data, always.",
};

export default function MigrateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
