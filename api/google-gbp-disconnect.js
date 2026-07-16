import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { assertCanManageGbp } from "../server/googleGbp.js";

/**
 * POST { token, clientId } — remove Google connection tokens
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

  const { error } = await admin.from("google_connections").delete().eq("clientId", clientId);
  if (error) return res.status(500).json({ error: error.message });

  // Clear gbpId display field (manual ID can be re-entered)
  await admin.from("profiles").update({ gbpId: null }).eq("id", clientId);

  // Mark gmb source as manual so staff can use Update GMB again
  const { data: gmb } = await admin
    .from("gmb")
    .select("data")
    .eq("clientId", clientId)
    .maybeSingle();
  if (gmb?.data) {
    await admin
      .from("gmb")
      .upsert({ clientId, data: { ...gmb.data, source: "manual" } });
  }

  return res.status(200).json({ ok: true });
}
