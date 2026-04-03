import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Switching from Booksy to Vomni — keep 100% of every booking",
  description: "Booksy's Boost charges 30% commission — even on clients you already have. Vomni never takes a cut. Flat monthly fee. Your revenue stays yours.",
};

export default function BooksyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
