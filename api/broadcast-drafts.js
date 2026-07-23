/** Staff broadcast drafts: list / save / delete. Content + channels only (no recipients). */
import { getAdmin, readJson, requireStaff } from "../server/billing.js";

function canBroadcast(profile) {
  if (!profile) return false;
  if (profile.role === "super_admin") return true;
  return profile.perms?.broadcastClients === true;
}

function uid() {
  return `bd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const payload = await readJson(req);
  const { token, action } = payload || {};
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (staff.error) return res.status(staff.status || 401).json({ error: staff.error });
  if (!canBroadcast(staff.profile)) {
    return res.status(403).json({ error: "Broadcast permission required" });
  }

  const userId = staff.profile.id;

  if (action === "list") {
    const { data, error } = await admin
      .from("broadcast_drafts")
      .select("*")
      .eq("createdBy", userId)
      .order("updatedAt", { ascending: false })
      .limit(50);
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(missing ? 503 : 500).json({
        error: missing
          ? "Run supabase/broadcast-drafts.sql in the Supabase SQL editor."
          : error.message,
      });
    }
    return res.status(200).json({ ok: true, drafts: data || [] });
  }

  if (action === "save") {
    const d = payload.draft || {};
    const title = String(d.title || "").trim();
    const body = String(d.body || "").trim();
    if (!title && !body) {
      return res.status(400).json({ error: "Title or body required to save a draft" });
    }
    const id = d.id && String(d.id).trim() ? String(d.id).trim() : uid();
    const isUpdate = !!(d.id && String(d.id).trim());
    if (isUpdate) {
      const { data: existing } = await admin
        .from("broadcast_drafts")
        .select("id,createdBy")
        .eq("id", id)
        .maybeSingle();
      if (existing && existing.createdBy !== userId) {
        return res.status(403).json({ error: "Not your draft" });
      }
    }
    const row = {
      id,
      name: d.name != null && String(d.name).trim() ? String(d.name).trim() : null,
      title,
      body,
      sendEmail: d.sendEmail !== false,
      sendInApp: d.sendInApp !== false,
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      ...(isUpdate ? {} : { createdAt: new Date().toISOString() }),
    };

    const { data, error } = await admin
      .from("broadcast_drafts")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(missing ? 503 : 500).json({
        error: missing
          ? "Run supabase/broadcast-drafts.sql in the Supabase SQL editor."
          : error.message,
      });
    }
    return res.status(200).json({ ok: true, draft: data || row });
  }

  if (action === "delete") {
    const id = payload.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await admin.from("broadcast_drafts").delete().eq("id", id).eq("createdBy", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
