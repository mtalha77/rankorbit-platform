import { getAdmin, readJson, requireStaff } from "../server/billing.js";

/**
 * List staff DM messages (super_admin ↔ staff member).
 * Body: { token, staffId?, limit? }
 * Super admin: pass staffId (the manager/agent). Staff: own thread (staffId = self).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId, limit: lim } = await readJson(req);
  const limit = Math.min(Math.max(Number(lim) || 100, 1), 300);

  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const isSuper = me.role === "super_admin";
  // Super admin may pass a staffId; everyone else is locked to their own thread.
  const targetStaffId = isSuper && staffId ? staffId : me.id;

  if (isSuper && staffId) {
    const { data: staff } = await admin
      .from("profiles")
      .select("id,role")
      .eq("id", targetStaffId)
      .maybeSingle();
    if (!staff || !["manager", "agent", "super_admin"].includes(staff.role)) {
      return res.status(404).json({ error: "Staff member not found" });
    }
  }

  try {
    const { data, error } = await admin
      .from("staff_messages")
      .select("id,staffId,senderId,body,createdAt,readAt")
      .eq("staffId", targetStaffId)
      .order("createdAt", { ascending: true })
      .limit(limit);

    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing. Run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const unread = (data || []).filter((m) => !m.readAt && m.senderId !== me.id).length;

    // Counterparty label for the header.
    let peer = null;
    if (isSuper && staffId) {
      const { data: sp } = await admin
        .from("profiles")
        .select("id,name,email,role")
        .eq("id", targetStaffId)
        .maybeSingle();
      peer = sp || null;
    } else {
      peer = { id: null, name: "Admin / Support", role: "super_admin" };
    }

    return res.status(200).json({
      ok: true,
      messages: data || [],
      unread,
      staffId: targetStaffId,
      peer,
    });
  } catch (e) {
    console.error("staff-messages:", e.message);
    return res.status(500).json({ error: e.message || "Could not load messages" });
  }
}
