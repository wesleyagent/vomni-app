// Vomni Service Worker v4 — cache-free, push-only
// Previous versions aggressively cached pages causing stale content.
// This version nukes all caches immediately and never caches anything.

const CACHE_NAME = "vomni-v4";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler — zero caching. Every request goes straight to the network.

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
