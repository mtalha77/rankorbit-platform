import { getAdmin, readJson, requireStaff } from "../server/billing.js";

/**
 * Mark peer messages as read in a staff DM thread.
 * Body: { token, staffId? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId } = await readJson(req);

  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const isSuper = me.role === "super_admin";
  const targetStaffId = isSuper && staffId ? staffId : me.id;

  try {
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("staff_messages")
      .update({ readAt: now })
      .eq("staffId", targetStaffId)
      .is("readAt", null)
      .neq("senderId", me.id)
      .select("id");

    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing. Run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    return res.status(200).json({ ok: true, marked: (data || []).length });
  } catch (e) {
    console.error("staff-read:", e.message);
    return res.status(500).json({ error: e.message || "Could not mark read" });
  }
}
