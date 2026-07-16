import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { assertCanManageGbp, syncClientGbp } from "../server/googleGbp.js";

/**
 * POST { token, clientId } — staff "Sync now"
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId } = await readJson(req);
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const auth = await requireStaff(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const gate = await assertCanManageGbp(admin, auth.profile, clientId);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });

  try {
    const result = await syncClientGbp(admin, clientId);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(502).json({ error: e.message || "Sync failed" });
  }
}
