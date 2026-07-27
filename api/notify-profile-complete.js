/**
 * After client completes the pre-payment business profile form.
 * Notifies all managers + super admins in-app once (payment still pending).
 * Body: { token }
 */
import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { notifyManagersInApp, notifySuperAdminsInApp } from "../server/assign.js";

function profileReady(p) {
  if (!p) return false;
  const phoneOk = String(p.phone || "").replace(/\D/g, "").length >= 10;
  const zipOk = String(p.zip || "").replace(/\D/g, "").length >= 5;
  return !!(
    String(p.businessName || "").trim() &&
    phoneOk &&
    String(p.address || "").trim() &&
    String(p.city || "").trim() &&
    String(p.state || "").trim() &&
    zipOk &&
    String(p.category || "").trim()
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const { data: profile, error: loadErr } = await admin
    .from("profiles")
    .select("id,email,name,businessName,phone,address,city,state,zip,category,plan")
    .eq("id", auth.profile.id)
    .maybeSingle();
  if (loadErr) return res.status(500).json({ error: loadErr.message });
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  if (!profileReady(profile)) {
    return res.status(400).json({ error: "Business profile is incomplete" });
  }
  if (profile.plan) {
    return res.status(200).json({ ok: true, skipped: "already_subscribed" });
  }

  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("type", "profile_complete")
    .eq("clientId", profile.id)
    .limit(1);
  if (existing?.length) {
    return res.status(200).json({ ok: true, alreadyNotified: true });
  }

  const business = profile.businessName || profile.name || profile.email || "A client";
  const title = "Client details ready — payment pending";
  const body = `${business} filled their business profile. Payment is still pending — they have not subscribed yet.`;

  try {
    await notifyManagersInApp(admin, {
      clientId: profile.id,
      type: "profile_complete",
      title,
      body,
      meta: { source: "profile_gate", paymentPending: true },
    });
    await notifySuperAdminsInApp(admin, {
      clientId: profile.id,
      type: "profile_complete",
      title,
      body,
      meta: { source: "profile_gate", paymentPending: true },
    });
  } catch (e) {
    console.warn("notify-profile-complete:", e.message);
    return res.status(500).json({ error: e.message || "Could not notify staff" });
  }

  return res.status(200).json({ ok: true, notified: true });
}
