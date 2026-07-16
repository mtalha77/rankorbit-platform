import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import {
  assertCanManageGbp,
  ensureAccessToken,
  listGbpLocations,
} from "../server/googleGbp.js";

/**
 * POST { token, clientId }
 * → { locations: [{ accountName, locationName, title, address, phone }] }
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

  const { data: conn } = await admin
    .from("google_connections")
    .select("*")
    .eq("clientId", clientId)
    .maybeSingle();
  if (!conn?.refreshToken) {
    return res.status(400).json({ error: "Google not connected for this client" });
  }

  try {
    const access = await ensureAccessToken(admin, conn);
    const locations = await listGbpLocations(access);
    return res.status(200).json({ locations });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Failed to list locations" });
  }
}
