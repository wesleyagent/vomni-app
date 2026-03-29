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
    <html lang="en" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        {/* Clear googtrans cookie before anything loads — prevents auto Hebrew translation */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var h = window.location.hostname;
            var exp = 'expires=Thu, 01 Jan 1970 00:00:01 UTC; path=/;';
            document.cookie = 'googtrans=; ' + exp;
            document.cookie = 'googtrans=; ' + exp + ' domain=' + h + ';';
            document.cookie = 'googtrans=; ' + exp + ' domain=.' + h + ';';
          })();
        ` }} />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        {children}
        <LandingChatWidget />
        <CookieBanner />
        <TranslateWidget />
      </body>
    </html>
  );
}
