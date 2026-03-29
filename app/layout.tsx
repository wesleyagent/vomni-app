import type { Metadata } from "next";
import "./globals.css";
import LandingChatWidget from "@/components/LandingChatWidget";
import CookieBanner from "@/components/CookieBanner";
import TranslateWidget from "@/components/TranslateWidget";

export const metadata: Metadata = {
  title: "Vomni - Get More 5-Star Google Reviews on Autopilot",
  description:
    "Vomni automatically asks your happy customers for reviews and catches unhappy ones before they go public. Built for barbers, salons, restaurants, dentists, and tattoo shops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
        <LandingChatWidget />
        <CookieBanner />
        <TranslateWidget />
      </body>
    </html>
  );
}
