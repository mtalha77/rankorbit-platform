/* NAP Orbit — Web Push service worker (no icons — Windows-safe) */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "NAP Orbit", body: "", url: "/", type: "info" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      data.body = event.data ? event.data.text() : "";
    } catch { /* ignore */ }
  }

  const title = String(data.title || "NAP Orbit");
  const body = String(data.body || "");
  const origin = self.location.origin;
  const targetUrl = data.url
    ? data.url.startsWith("http")
      ? data.url
      : origin + (data.url.startsWith("/") ? data.url : "/" + data.url)
    : origin + "/";

  // Bare notification only — no icon/badge (Windows Chrome is picky).
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url: targetUrl },
      tag: "nap-" + Date.now(),
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.location.origin + "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      for (const c of list) {
        if (!c.url || !("focus" in c)) continue;
        try {
          if (typeof c.navigate === "function") await c.navigate(url);
        } catch { /* ignore */ }
        return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
