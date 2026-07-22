/**
 * Persist Control Panel settings (service role — bypasses brittle client RLS updates).
 * Body: { token, settings }  — settings is the full JSON blob stored in settings.data
 */
import { getAdmin, readJson, requireStaff } from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireStaff(admin, body?.token, { roles: ["super_admin"] });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const settings = body?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return res.status(400).json({ error: "settings object is required" });
  }

  // Normalize plan prices to numbers so display + revenue math stay consistent.
  const config = { ...(settings.config || {}) };
  for (const k of ["priceEssentials", "priceGrowth", "priceGmb"]) {
    if (config[k] != null && config[k] !== "") {
      const n = Number(config[k]);
      if (Number.isFinite(n)) config[k] = n;
    }
  }
  const payload = {
    ...settings,
    config,
    stripe: settings.stripe && typeof settings.stripe === "object" ? settings.stripe : {},
  };

  const { data, error } = await admin
    .from("settings")
    .upsert({ id: 1, data: payload }, { onConflict: "id" })
    .select("data")
    .maybeSingle();

  if (error) {
    console.error("save-settings:", error.message);
    return res.status(500).json({ error: error.message || "Could not save settings" });
  }

  return res.status(200).json({ ok: true, settings: data?.data || payload });
}
