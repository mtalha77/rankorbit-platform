/**
 * Web Push (VAPID) — send browser notifications to stored subscriptions.
 * Missing env keys → no-op (in-app + email keep working).
 */
import webpush from "web-push";
import { randomUUID } from "crypto";
import { appBaseUrl } from "./emailTemplate.js";

let vapidReady = false;

function uid(prefix = "ps") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

export function vapidConfigured() {
  return !!(
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT &&
    (process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY)
  );
}

export function vapidPublicKey() {
  return process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

function ensureVapid() {
  if (vapidReady) return true;
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    vapidPublicKey(),
    process.env.VAPID_PRIVATE_KEY
  );
  vapidReady = true;
  return true;
}

/** Deep-link path for notification click (SPA routes). */
export function pushPathFor(type, role) {
  const staff = role && role !== "client";
  if (staff) {
    if (type === "needs_bdm" || type === "client_assigned") return "/admin";
    if (type === "staff_message" || type === "chat_message") return "/admin";
    if (type === "call_booked" || type === "meeting") return "/admin";
    return "/admin";
  }
  if (type === "payment_failed" || type === "plan_subscribed") return "/dashboard";
  if (type === "bdm_assigned" || type === "staff_message" || type === "chat_message") return "/dashboard";
  if (type === "call_confirmed" || type === "call_booked" || type === "meeting") return "/dashboard";
  return "/dashboard";
}

/**
 * Upsert a PushSubscription for a user (service role).
 * subscription = browser PushSubscription.toJSON()
 */
export async function savePushSubscription(admin, userId, subscription, userAgent = null) {
  if (!admin || !userId || !subscription?.endpoint) {
    return { error: "Invalid subscription" };
  }
  const keys = subscription.keys || {};
  if (!keys.p256dh || !keys.auth) return { error: "Subscription keys missing" };

  const endpoint = String(subscription.endpoint);
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  const row = {
    id: existing?.id || uid("ps"),
    userId,
    endpoint,
    p256dh: String(keys.p256dh),
    auth: String(keys.auth),
    userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
    updatedAt: now,
    ...(existing ? {} : { createdAt: now }),
  };

  const { error } = await admin.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) {
    const missing = /does not exist|schema cache|push_subscriptions/i.test(error.message || "");
    return {
      error: missing
        ? "Push table missing. Run supabase/push-subscriptions.sql in the Supabase SQL editor."
        : error.message,
    };
  }
  return { ok: true, id: row.id };
}

export async function removePushSubscription(admin, userId, endpoint = null) {
  if (!admin || !userId) return { error: "Bad args" };
  let q = admin.from("push_subscriptions").delete().eq("userId", userId);
  if (endpoint) q = q.eq("endpoint", String(endpoint));
  const { error } = await q;
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Send a web push to every device registered for userId.
 * Never throws to callers — logs and cleans gone subscriptions.
 */
export async function sendPushToUser(admin, userId, { title, body, type, url } = {}) {
  if (!admin || !userId || !title) return { sent: 0, reason: "bad_args" };
  if (!ensureVapid()) return { sent: 0, reason: "not_configured" };

  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("userId", userId);
  if (error) {
    console.warn("push select:", error.message);
    return { sent: 0, reason: "db_error" };
  }
  if (!rows?.length) return { sent: 0, reason: "no_subscriptions" };

  let role = "client";
  try {
    const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (prof?.role) role = prof.role;
  } catch { /* ignore */ }

  const path = url || pushPathFor(type, role);
  const absoluteUrl = path.startsWith("http") ? path : `${appBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const payload = JSON.stringify({
    title: String(title).slice(0, 120),
    body: body ? String(body).slice(0, 240) : "",
    url: absoluteUrl,
    type: type || "info",
  });

  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
        { TTL: 60 * 60 * 12, urgency: "high" }
      );
      sent++;
    } catch (e) {
      const code = e?.statusCode || e?.status;
      // Gone / unauthorized / bad key → drop stale desktop/mobile endpoints
      if (code === 404 || code === 410 || code === 401 || code === 403) {
        try {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        } catch { /* ignore */ }
        console.warn("web-push dropped stale sub:", code, row.endpoint?.slice(0, 48));
      } else {
        console.warn("web-push send:", code, e?.message || e);
      }
    }
  }
  return { sent, total: rows.length };
}
