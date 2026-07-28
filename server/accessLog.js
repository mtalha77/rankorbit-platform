import { TOS_VERSION, PRIVACY_VERSION } from "./legal.js";

export function clientIp(req) {
  const xf = req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "";
  const raw = String(Array.isArray(xf) ? xf[0] : xf).split(",")[0].trim();
  if (raw) return raw.slice(0, 128);
  const socketIp = req?.socket?.remoteAddress || req?.connection?.remoteAddress;
  return socketIp ? String(socketIp).slice(0, 128) : null;
}

export function clientUserAgent(req) {
  const ua = req?.headers?.["user-agent"];
  return ua ? String(ua).slice(0, 512) : null;
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Append-only access / IP log. Never throws to caller — logs and returns null on failure.
 */
export async function logAccessEvent(admin, {
  userId = null,
  email = null,
  eventType,
  feature = null,
  ip = null,
  userAgent = null,
  meta = {},
}) {
  if (!admin || !eventType) return null;
  const row = {
    id: uid("acc"),
    userId: userId || null,
    email: email ? String(email).trim().toLowerCase() : null,
    eventType: String(eventType).slice(0, 64),
    feature: feature ? String(feature).slice(0, 64) : null,
    ip: ip || null,
    userAgent: userAgent || null,
    createdAt: new Date().toISOString(),
    meta: meta && typeof meta === "object" ? meta : {},
  };
  try {
    const { error } = await admin.from("access_events").insert(row);
    if (error) {
      console.warn("logAccessEvent:", error.message);
      return null;
    }
    return row;
  } catch (e) {
    console.warn("logAccessEvent:", e.message);
    return null;
  }
}

/**
 * Persist ToS/Privacy acceptance. Requires checkboxConfirmed === true.
 */
export async function recordConsent(admin, {
  userId = null,
  email,
  ip = null,
  userAgent = null,
  source,
  checkboxConfirmed = false,
  tosVersion = TOS_VERSION,
  privacyVersion = PRIVACY_VERSION,
  meta = {},
}) {
  if (!admin || !email || !source) return { error: "Missing consent fields" };
  if (!checkboxConfirmed) return { error: "Checkbox not confirmed" };
  const row = {
    id: uid("cns"),
    userId: userId || null,
    email: String(email).trim().toLowerCase(),
    acceptedAt: new Date().toISOString(),
    ip: ip || null,
    userAgent: userAgent || null,
    tosVersion: String(tosVersion),
    privacyVersion: String(privacyVersion),
    source: String(source).slice(0, 64),
    checkboxConfirmed: true,
    meta: meta && typeof meta === "object" ? meta : {},
  };
  try {
    const { error } = await admin.from("consent_records").insert(row);
    if (error) {
      console.warn("recordConsent:", error.message);
      return { error: error.message };
    }
    return { ok: true, row };
  } catch (e) {
    console.warn("recordConsent:", e.message);
    return { error: e.message };
  }
}

/** Attach pending consent rows (userId null) to a newly created profile. */
export async function linkPendingConsent(admin, { userId, email }) {
  if (!admin || !userId || !email) return;
  const em = String(email).trim().toLowerCase();
  try {
    await admin
      .from("consent_records")
      .update({ userId })
      .eq("email", em)
      .is("userId", null);
    await admin
      .from("access_events")
      .update({ userId })
      .eq("email", em)
      .is("userId", null);
  } catch (e) {
    console.warn("linkPendingConsent:", e.message);
  }
}

/** Skip duplicate login logs within the same hour for the same user. */
export async function shouldLogLogin(admin, userId) {
  if (!admin || !userId) return true;
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await admin
      .from("access_events")
      .select("id")
      .eq("userId", userId)
      .eq("eventType", "login")
      .gte("createdAt", since)
      .limit(1);
    return !(data && data.length);
  } catch {
    return true;
  }
}
