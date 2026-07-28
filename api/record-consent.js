import { getAdmin, readJson, verifyAccessToken } from "../server/billing.js";
import { clientIp, clientUserAgent, recordConsent } from "../server/accessLog.js";
import { TOS_VERSION, PRIVACY_VERSION } from "../server/legal.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  if (!body?.acceptedTerms && !body?.checkboxConfirmed) {
    return res.status(400).json({ error: "Terms acceptance required" });
  }

  const source = String(body.source || "profile_gate").slice(0, 64);
  let userId = null;
  let email = body.email ? String(body.email).trim().toLowerCase() : "";

  if (body.token) {
    const auth = await verifyAccessToken(admin, body.token);
    if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
    userId = auth.userId;
    const { data: profile } = await admin.from("profiles").select("id,email").eq("id", userId).maybeSingle();
    email = (profile?.email || auth.user?.email || email || "").toLowerCase();
  }

  if (!email) return res.status(400).json({ error: "Email required" });

  const result = await recordConsent(admin, {
    userId,
    email,
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
    source,
    checkboxConfirmed: true,
    tosVersion: body.tosVersion || TOS_VERSION,
    privacyVersion: body.privacyVersion || PRIVACY_VERSION,
    meta: { ...(body.meta || {}), recordedVia: "api/record-consent" },
  });

  if (result.error) return res.status(500).json({ error: result.error });
  return res.status(200).json({
    ok: true,
    tosVersion: TOS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: result.row?.acceptedAt,
  });
}
