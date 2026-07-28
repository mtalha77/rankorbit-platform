import { getAdmin, readJson, verifyAccessToken } from "../server/billing.js";
import {
  clientIp,
  clientUserAgent,
  logAccessEvent,
  shouldLogLogin,
} from "../server/accessLog.js";

const FEATURES = new Set([
  "home",
  "listings",
  "analytics",
  "gmb",
  "billing",
  "messages",
  "call",
  "settings",
  "notifications",
  "legal",
  "report",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await verifyAccessToken(admin, body?.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const { data: profile } = await admin
    .from("profiles")
    .select("id,email")
    .eq("id", auth.userId)
    .maybeSingle();

  const eventType = String(body.eventType || "feature").slice(0, 64);
  const feature = body.feature ? String(body.feature).slice(0, 64) : null;

  if (eventType === "feature" && feature && !FEATURES.has(feature)) {
    return res.status(400).json({ error: "Unknown feature" });
  }

  if (eventType === "login") {
    const ok = await shouldLogLogin(admin, auth.userId);
    if (!ok) return res.status(200).json({ ok: true, skipped: true });
  }

  await logAccessEvent(admin, {
    userId: auth.userId,
    email: profile?.email || auth.user?.email || null,
    eventType,
    feature: eventType === "feature" ? feature : null,
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
    meta: body.meta && typeof body.meta === "object" ? body.meta : {},
  });

  return res.status(200).json({ ok: true });
}
