/** Browser Web Push helpers (VAPID). */

const DISMISS_KEY = "ro_push_dismiss_until";
let cachedPublicKey = null;
let cachedPublicKeyAt = 0;

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function vapidPublicKeyFromEnv() {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();
}

export async function resolveVapidPublicKey() {
  // Prefer the server key so subscribe always matches VAPID_PRIVATE_KEY used to send.
  // Baked VITE_ key alone can diverge after a Vercel env rotate → 401/403 and silent drops.
  if (cachedPublicKey && Date.now() - cachedPublicKeyAt < 5 * 60 * 1000) {
    return cachedPublicKey;
  }
  try {
    const r = await fetch("/api/push-vapid-public");
    const j = await r.json().catch(() => ({}));
    const key = (j.publicKey || "").trim();
    if (j.configured && key) {
      cachedPublicKey = key;
      cachedPublicKeyAt = Date.now();
      return key;
    }
  } catch { /* fall through to build-time env */ }
  const fromEnv = vapidPublicKeyFromEnv();
  if (fromEnv) {
    cachedPublicKey = fromEnv;
    cachedPublicKeyAt = Date.now();
    return fromEnv;
  }
  return "";
}

export function vapidPublicKey() {
  return cachedPublicKey || vapidPublicKeyFromEnv();
}

export function isPushConfigured() {
  return isPushSupported() && !!vapidPublicKey();
}

export async function isPushAvailable() {
  if (!isPushSupported()) return false;
  const key = await resolveVapidPublicKey();
  return !!key;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ensure /sw.js is real JS, not SPA index.html (common Vercel rewrite bug). */
async function assertServiceWorkerScript() {
  const r = await fetch(`/sw.js?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) return { error: `Could not load /sw.js (HTTP ${r.status})` };
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  const text = await r.text();
  const looksHtml =
    text.trimStart().startsWith("<!DOCTYPE") ||
    text.trimStart().startsWith("<html") ||
    text.includes("<div id=\"root\"") ||
    ct.includes("text/html");
  if (looksHtml) {
    return {
      error:
        "Service worker is being served as HTML (SPA rewrite). Deploy the vercel.json fix that excludes /sw.js, then hard-refresh.",
    };
  }
  if (!text.includes("addEventListener(\"push\"") && !text.includes("addEventListener('push'")) {
    return { error: "Service worker file looks invalid — missing push handler." };
  }
  return { ok: true };
}

export async function registerPushSw() {
  if (!isPushSupported()) return null;
  const check = await assertServiceWorkerScript();
  if (check.error) throw new Error(check.error);

  // Unregister broken SW that was registered from index.html
  const existing = await navigator.serviceWorker.getRegistrations();
  for (const reg of existing) {
    try {
      const scriptUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
      if (scriptUrl && !scriptUrl.includes("/sw.js")) {
        await reg.unregister();
      }
    } catch { /* ignore */ }
  }

  const reg = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  try {
    await reg.update();
  } catch { /* ignore */ }
  await navigator.serviceWorker.ready;

  // Wait until this page is controlled (needed for reliable push on desktop)
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 3000);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          clearTimeout(t);
          resolve();
        },
        { once: true }
      );
    });
  }
  return reg;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function permissionState() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function isPushPromptDismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function dismissPushPrompt(days = 7) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch { /* ignore */ }
}

/**
 * Enable push on THIS browser/device and save subscription.
 * @param {(sub: object) => Promise<{error?: string}>} saveFn
 */
export async function enablePush(saveFn) {
  if (!isPushSupported()) return { error: "Push is not available in this browser" };
  const publicKey = await resolveVapidPublicKey();
  if (!publicKey) {
    return { error: "Push is not configured on the server. Set VAPID keys on Vercel and redeploy." };
  }

  let reg;
  try {
    reg = await registerPushSw();
  } catch (e) {
    return { error: e?.message || "Could not register service worker" };
  }
  if (!reg) return { error: "Could not register notifications" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return {
      error:
        "Notifications blocked for this site. Chrome → lock icon → Notifications → Allow, then try again.",
    };
  }

  try {
    const old = await reg.pushManager.getSubscription();
    if (old) await old.unsubscribe();
  } catch { /* ignore */ }

  let sub;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch (e) {
    return { error: e?.message || "Could not subscribe to push on this browser" };
  }

  const json = sub.toJSON();
  if (!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) {
    return { error: "Browser returned an incomplete push subscription" };
  }

  const r = await saveFn(json);
  if (r?.error) return { error: r.error };

  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch { /* ignore */ }

  return { ok: true, subscription: json };
}

export async function disablePush(unsubFn) {
  const sub = await getExistingSubscription();
  const endpoint = sub?.endpoint || null;
  if (sub) {
    try {
      await sub.unsubscribe();
    } catch { /* ignore */ }
  }
  if (typeof unsubFn === "function") {
    const r = await unsubFn(endpoint);
    if (r?.error) return { error: r.error };
  }
  return { ok: true };
}
