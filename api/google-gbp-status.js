import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import {
  assertCanManageGbp,
  connectionPublicMeta,
  googleConfigured,
} from "../server/googleGbp.js";

/**
 * POST { token, clientId }
 * → { configured, connection }
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
    .select("clientId,accountName,locationName,locationTitle,syncedAt,status,lastError")
    .eq("clientId", clientId)
    .maybeSingle();

  return res.status(200).json({
    configured: googleConfigured(),
    connection: connectionPublicMeta(conn),
  });
}
