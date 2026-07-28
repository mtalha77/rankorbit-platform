/**
 * Client support / BDM connect request (Messages or Book a Call when none assigned).
 * Body: { token, supportType: "billing" | "technical" | "it" }
 * Both options → in-app + email to managers AND super admins.
 * Marks profiles.bdmConnectRequestedAt once (no spam on repeat clicks).
 */
import { getAdmin, readJson, requireClient } from "../server/billing.js";
import {
  notifyManagersInApp,
  notifySuperAdminsInApp,
  emailManagersAndSuperAdmins,
} from "../server/assign.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, supportType } = await readJson(req);
  let kind = String(supportType || "").toLowerCase();
  if (kind === "it") kind = "technical";
  if (kind !== "billing" && kind !== "technical") {
    return res.status(400).json({ error: "Choose Billing support or Technical support" });
  }

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const profile = auth.profile;

  if (!profile.plan) {
    return res.status(403).json({ error: "Subscribe to a plan to request support" });
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
    try {
      const isBilling = kind === "billing";
      const title = isBilling ? "Billing support request" : "Technical support request";
      const body = isBilling
        ? `${business} requested Billing support from Messages. Review their plan, invoices, or payment issues.`
        : `${business} requested Technical support from Messages. Assign a BDM or help from the client page.`;
      const payload = {
        clientId: profile.id,
        type: isBilling ? "support_billing" : "support_technical",
        title,
        body,
        meta: { source: "connect_request", supportType: kind },
      };
      await notifyManagersInApp(admin, payload);
      await notifySuperAdminsInApp(admin, payload);
      // Email managers + super admins for either option (Resend failure must not fail the request).
      await emailManagersAndSuperAdmins(admin, {
        routeKey: isBilling ? "routeSystem" : "routeOnboard",
        title,
        body,
      });
    } catch (e) {
      console.warn("request-bdm notify:", e.message);
    }
  }

  return res.status(200).json({
    ok: true,
    requestedAt,
    alreadyRequested,
    supportType: kind,
  });
}
