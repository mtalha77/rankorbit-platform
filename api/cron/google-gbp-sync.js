import { getAdmin } from "../../server/billing.js";
import { googleConfigured, syncClientGbp } from "../../server/googleGbp.js";

/**
 * GET /api/cron/google-gbp-sync
 * Header: Authorization: Bearer CRON_SECRET
 * Syncs all connected clients that have a location selected.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "CRON_SECRET not set" });

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = req.query?.secret || "";
  if (bearer !== secret && q !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!googleConfigured()) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { data: rows, error } = await admin
    .from("google_connections")
    .select("clientId,locationName,refreshToken")
    .not("refreshToken", "is", null)
    .not("locationName", "is", null);

  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const row of rows || []) {
    try {
      const r = await syncClientGbp(admin, row.clientId);
      results.push({ clientId: row.clientId, ok: true, syncedAt: r.syncedAt });
    } catch (e) {
      results.push({ clientId: row.clientId, ok: false, error: e.message });
    }
  }

  return res.status(200).json({
    ok: true,
    count: results.length,
    results,
  });
}
