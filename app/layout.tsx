import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import LandingChatWidget from "@/components/LandingChatWidget";
import CookieBanner from "@/components/CookieBanner";
import TranslateWidget from "@/components/TranslateWidget";
import { LocaleProvider, type Locale } from "@/lib/localeContext";

export const metadata: Metadata = {
  title: "Vomni — Bookings, Reviews & Customer Retention on Autopilot",
  description:
    "Vomni runs your booking page, follows up with every customer after their visit, and brings back regulars who've gone quiet — all via WhatsApp, automatically.",
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware sets x-locale on every request so we can apply lang/dir
  // server-side before the client hydrates — avoiding a flash of LTR content.
  const hdrs = await headers();
  const locale = (hdrs.get("x-locale") ?? "en") as Locale;
  const isRTL = locale === "he";

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      {...(!isRTL ? { translate: "no" } : {})}
    >
      <head>
        {!isRTL && <meta name="google" content="notranslate" />}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00C896" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vomni" />
        {/* Service worker: nuke old caches then register fresh */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              // Unregister every old SW and wipe all caches, then re-register clean
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                var kills = regs.map(function(r) { return r.unregister(); });
                return Promise.all(kills);
              }).then(function() {
                return caches.keys();
              }).then(function(keys) {
                return Promise.all(keys.map(function(k) { return caches.delete(k); }));
              }).then(function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              }).catch(function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            });
          }
        ` }} />
        {/* On English routes: clear googtrans to prevent auto-translation.
            On Hebrew route (/he): pre-set the cookie so Google Translate fires to Hebrew. */}
        {isRTL ? (
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var h = window.location.hostname;
              document.cookie = 'googtrans=/en/iw; path=/';
              document.cookie = 'googtrans=/en/iw; path=/; domain=.' + h;
            })();
          ` }} />
        ) : (
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var h = window.location.hostname;
              var exp = 'expires=Thu, 01 Jan 1970 00:00:01 UTC; path=/;';
              document.cookie = 'googtrans=; ' + exp;
              document.cookie = 'googtrans=; ' + exp + ' domain=' + h + ';';
              document.cookie = 'googtrans=; ' + exp + ' domain=.' + h + ';';
            })();
          ` }} />
        )}
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <LocaleProvider initialLocale={locale}>
          {children}
          <LandingChatWidget />
          <CookieBanner />
          <TranslateWidget />
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
