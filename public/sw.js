/* NAP Orbit — Web Push service worker
 * Icons MUST be PNG (SVG often fails silently on Windows Chrome).
 */
const ICON = "/android-chrome-512x512.png";
const BADGE = "/favicon-32x32.png";

self.addEventListener("install", (event) => {
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

  const title = data.title || "NAP Orbit";
  const origin = self.location.origin;
  const targetUrl = data.url
    ? data.url.startsWith("http")
      ? data.url
      : origin + (data.url.startsWith("/") ? data.url : "/" + data.url)
    : origin + "/";

  const options = {
    body: data.body || "",
    icon: origin + ICON,
    badge: origin + BADGE,
    data: { url: targetUrl },
    // Unique tag so each alert shows (same type no longer replaces prior toast)
    tag: "nap-" + (data.type || "info") + "-" + Date.now(),
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch(() =>
      // Windows can reject bad icon options — retry bare notification
      self.registration.showNotification(title, {
        body: data.body || "",
        data: { url: targetUrl },
        tag: options.tag,
      })
    )
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
