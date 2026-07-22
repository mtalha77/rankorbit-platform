/**
 * After signup/login: copy businessName/phone onto the client profile (service role).
 * Body: { token, businessName?, phone?, name?, emailNotifications? }
 * Also backfills from Auth user_metadata when body fields are empty.
 */
import { getAdmin, readJson, requireClient } from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireClient(admin, body?.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const profile = auth.profile;
  let meta = {};
  try {
    const { data } = await admin.auth.admin.getUserById(profile.id);
    meta = data?.user?.user_metadata || {};
  } catch {
    /* optional */
  }

  const pick = (...vals) => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "";
  };

  const businessName = pick(body?.businessName, meta.businessName, profile.businessName);
  const phone = pick(body?.phone, meta.phone, profile.phone);
  const name = pick(body?.name, meta.name, meta.full_name, profile.name);
  const patch = {};

  if (businessName && businessName !== String(profile.businessName || "").trim()) {
    patch.businessName = businessName;
  }
  if (phone && phone !== String(profile.phone || "").trim()) {
    patch.phone = phone;
  }
  if (name && name !== String(profile.name || "").trim()) {
    patch.name = name;
    patch.avatar = (name[0] || "U").toUpperCase();
  }
  if (typeof body?.emailNotifications === "boolean" && body.emailNotifications !== profile.emailNotifications) {
    patch.emailNotifications = body.emailNotifications;
  }

  // Always fill empties even when equal-check skipped (profile null vs "").
  if (!String(profile.businessName || "").trim() && businessName) patch.businessName = businessName;
  if (!String(profile.phone || "").trim() && phone) patch.phone = phone;

  if (!Object.keys(patch).length) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      profile: {
        businessName: profile.businessName || null,
        phone: profile.phone || null,
        name: profile.name || null,
      },
    });
  }

  const { data: updated, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", profile.id)
    .select("id,businessName,phone,name,emailNotifications")
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  // Keep Auth metadata in sync so trigger/backfill paths stay consistent.
  try {
    await admin.auth.admin.updateUserById(profile.id, {
      user_metadata: {
        ...meta,
        ...(patch.businessName ? { businessName: patch.businessName } : {}),
        ...(patch.phone ? { phone: patch.phone } : {}),
        ...(patch.name ? { name: patch.name } : {}),
      },
    });
  } catch {
    /* optional */
  }

  return res.status(200).json({ ok: true, profile: updated || { ...profile, ...patch } });
}
