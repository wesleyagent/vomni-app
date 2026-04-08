import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths to skip entirely
const SKIP_PREFIXES = [
  "/api",
  "/_next",
  "/favicon",
  "/icon",
  "/manifest",
  "/sw.js",
  "/r/", // booking rating pages — never touch
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, and the rating page
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip static file extensions
  if (/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css|js|map)$/.test(pathname)) {
    return NextResponse.next();
  }

  // ── /he route: Hebrew locale, determined purely by URL path ────────────────
  // No cookie is set — locale does NOT bleed onto other routes.
  if (pathname === "/he" || pathname.startsWith("/he/")) {
    return NextResponse.next({
      request: { headers: buildLocaleHeaders(request.headers, "he") },
    });
  }

  // ── IP-based detection (only redirect once per session) ────────────────────
  // Uses a short-lived flag cookie so IL users aren't stuck in a redirect loop
  // if they navigate back to the English site.
  const alreadyRedirected = request.cookies.get("vomni_il_visited")?.value;
  if (!alreadyRedirected) {
    const country = request.headers.get("cf-ipcountry") ?? "";
    if (country === "IL") {
      const url = request.nextUrl.clone();
      url.pathname = "/he";
      const response = NextResponse.redirect(url);
      // Flag lasts 1 hour — enough to navigate freely without re-redirecting
      response.cookies.set("vomni_il_visited", "1", {
        path: "/",
        maxAge: 60 * 60,
        sameSite: "lax",
      });
      return response;
    }
  }

  // ── All other paths: English ────────────────────────────────────────────────
  return NextResponse.next({
    request: { headers: buildLocaleHeaders(request.headers, "en") },
  });
}

function buildLocaleHeaders(incoming: Headers, locale: string): Headers {
  const headers = new Headers(incoming);
  headers.set("x-locale", locale);
  return headers;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
