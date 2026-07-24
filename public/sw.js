/* NAP Orbit — Web Push service worker */
self.addEventListener("push", (event) => {
  let data = { title: "NAP Orbit", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      data.body = event.data ? event.data.text() : "";
    } catch { /* ignore */ }
  }
  const title = data.title || "NAP Orbit";
  const options = {
    body: data.body || "",
    icon: "/notification-bell-svgrepo-com.svg",
    badge: "/favicon.ico",
    data: { url: data.url || "/" },
    tag: data.type || "naporbit",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
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
