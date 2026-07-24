/**
 * Client requests to be connected with a BDM (from Messages or Book a Call when none assigned).
 * Body: { token }
 * - Marks profiles.bdmConnectRequestedAt (once — no spam on repeat clicks)
 * - Notifies managers + super admins in-app (needs_bdm) and by email (routed)
 */
import { getAdmin, readJson, requireClient } from "../server/billing.js";
import {
  notifyManagersInApp,
  notifySuperAdminsInApp,
  notifyStaffRoute,
} from "../server/assign.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const profile = auth.profile;

  // Any subscribed plan can request a BDM (Book a Call for Essentials, Messages for Growth/GMB Pro).
  if (!profile.plan) {
    return res.status(403).json({ error: "Subscribe to a plan to connect with a BDM" });
  }
  if (profile.assignedBdmId) {
    return res.status(200).json({ ok: true, alreadyAssigned: true });
  }

  const alreadyRequested = !!profile.bdmConnectRequestedAt;
  const requestedAt = profile.bdmConnectRequestedAt || new Date().toISOString();

  if (!alreadyRequested) {
    const { error: upErr } = await admin
      .from("profiles")
      .update({ bdmConnectRequestedAt: requestedAt })
      .eq("id", profile.id);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const business = profile.businessName || profile.name || profile.email || "A client";
    const title = "Client requested a BDM";
    const body = `${business} tapped “Connect with your BDM” in Messages. Assign a BDM from the client page.`;
    try {
      await notifyManagersInApp(admin, {
        clientId: profile.id,
        type: "needs_bdm",
        title,
        body,
        meta: { source: "connect_request" },
      });
      await notifySuperAdminsInApp(admin, {
        clientId: profile.id,
        type: "needs_bdm",
        title,
        body,
        meta: { source: "connect_request" },
      });
      await notifyStaffRoute(admin, { kind: "onboard", title, body });
    } catch (e) {
      console.warn("request-bdm notify:", e.message);
    }
  }

  return res.status(200).json({ ok: true, requestedAt, alreadyRequested });
}
