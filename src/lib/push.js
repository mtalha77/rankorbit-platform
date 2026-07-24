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

/** Sync: build-time VITE_ key only (may be empty if env added after last frontend build). */
export function vapidPublicKeyFromEnv() {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();
}

/**
 * Resolve public key: env first, else GET /api/push-vapid-public (runtime).
 * Fixes “mobile works / web Enable missing” when VITE_ was not in the client bundle.
 */
export async function resolveVapidPublicKey() {
  const fromEnv = vapidPublicKeyFromEnv();
  if (fromEnv) {
    cachedPublicKey = fromEnv;
    return fromEnv;
  }
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
  } catch { /* ignore */ }
  return "";
}

export function vapidPublicKey() {
  return cachedPublicKey || vapidPublicKeyFromEnv();
}

/** Sync check — prefer await resolveVapidPublicKey() + isPushSupported for UI. */
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

export async function registerPushSw() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
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
 * Request permission, subscribe, and POST to /api/push-subscribe via api helper.
 * @param {(sub: object) => Promise<{error?: string}>} saveFn
 */
export async function enablePush(saveFn) {
  if (!isPushSupported()) return { error: "Push is not available in this browser" };
  const publicKey = await resolveVapidPublicKey();
  if (!publicKey) {
    return { error: "Push is not configured on the server. Redeploy after setting VAPID keys." };
  }

  const reg = await registerPushSw();
  if (!reg) return { error: "Could not register notifications" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { error: "Notifications were blocked. Enable them in browser settings." };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();
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
