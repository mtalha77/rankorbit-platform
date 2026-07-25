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
    : origin + "/dashboard";

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
  const origin = self.location.origin;
  let url =
    (event.notification.data && event.notification.data.url) || origin + "/dashboard";
  // Same-origin only (block accidental external links)
  try {
    const u = new URL(url, origin);
    if (u.origin !== origin) url = origin + "/dashboard";
    else url = u.href;
  } catch {
    url = origin + "/dashboard";
  }

  event.waitUntil(
    (async () => {
      const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const ours = list.filter((c) => {
        try {
          return c.url && new URL(c.url).origin === origin;
        } catch {
          return false;
        }
      });

      for (const client of ours) {
        try {
          // Desktop Chrome often supports navigate; many mobile browsers do not.
          if (typeof client.navigate === "function") {
            await client.navigate(url);
          } else {
            // SPA fallback: tell the open tab to change route
            client.postMessage({ type: "PUSH_NAVIGATE", url });
          }
          if (typeof client.focus === "function") {
            await client.focus();
          }
          return;
        } catch {
          /* try next client / openWindow */
        }
      }

      // Mobile: no usable tab — must open a window (or nothing happens)
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })()
  );
});
