import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import {
  assertCanManageGbp,
  syncClientGbp,
  toLocationResource,
} from "../server/googleGbp.js";

/**
 * POST { token, clientId, locationName, accountName?, locationTitle? }
 * Saves location and runs an initial sync.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId, locationName, accountName, locationTitle } = await readJson(req);
  if (!clientId || !locationName) {
    return res.status(400).json({ error: "clientId and locationName required" });
  }

  const auth = await requireStaff(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const gate = await assertCanManageGbp(admin, auth.profile, clientId);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });

  const loc = toLocationResource(locationName);
  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("google_connections")
    .update({
      locationName: loc,
      accountName: accountName || null,
      locationTitle: locationTitle || null,
      status: "connected",
      lastError: null,
      updatedAt: now,
    })
    .eq("clientId", clientId);
  if (upErr) return res.status(500).json({ error: upErr.message });

  await admin
    .from("profiles")
    .update({ gbpId: loc })
    .eq("id", clientId);

  try {
    const result = await syncClientGbp(admin, clientId);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(200).json({
      ok: true,
      synced: false,
      warning: e.message || "Location saved but sync failed",
    });
  }
}
