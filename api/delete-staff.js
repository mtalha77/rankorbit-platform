// Permanently delete a staff account (super_admin only).
// Removes auth user → profile cascade → staff_messages cascade.
import { getAdmin, readJson, requireStaff } from "../server/billing.js";

const STAFF = new Set(["super_admin", "manager", "bdm", "agent"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId } = await readJson(req);
  if (!staffId) return res.status(400).json({ error: "staffId required" });

  const auth = await requireStaff(admin, token, { roles: ["super_admin"] });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const callerId = auth.profile.id;
  if (String(staffId) === String(callerId)) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const { data: target, error: tErr } = await admin
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", staffId)
    .maybeSingle();
  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!target) return res.status(404).json({ error: "Team member not found" });
  if (!STAFF.has(target.role)) {
    return res.status(400).json({ error: "Only staff accounts can be removed this way" });
  }

  // Hard delete auth user — profiles + staff_messages cascade.
  const { error: delErr } = await admin.auth.admin.deleteUser(staffId);
  if (delErr) return res.status(500).json({ error: delErr.message || "Could not delete account" });

  return res.status(200).json({ ok: true, name: target.name || target.email || null });
}
