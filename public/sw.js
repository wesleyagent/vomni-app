// Vomni Service Worker — PWA support
// Caches the dashboard shell for offline access + handles push notifications

const CACHE_NAME = "vomni-v1";
const SHELL_URLS = [
  "/dashboard",
  "/dashboard/calendar",
  "/dashboard/calendar/settings",
  "/dashboard/analytics",
];

// ── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS).catch(() => {
        // Non-fatal if some pages fail during install (e.g. redirect)
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for static ─────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  // Network-first for API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached ?? fetch(event.request).then((response) => {
        if (response.ok && !url.pathname.startsWith("/_next/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "Vomni", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Vomni", {
      body:  data.body ?? "",
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data:  { url: data.url ?? "/dashboard" },
      actions: [
        { action: "open",    title: "Open Dashboard" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if (c.url.includes(location.origin) && "focus" in c) {
          c.navigate(targetUrl);
          return c.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
