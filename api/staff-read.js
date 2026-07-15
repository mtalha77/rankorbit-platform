import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { resolveStaffPeer, resolveStaffThreadKey, STAFF_ROLES } from "../server/staffChat.js";

/**
 * Mark peer messages as read in a staff DM thread.
 * Body: { token, staffId }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId } = await readJson(req);

  const auth = await requireStaff(admin, token, { roles: STAFF_ROLES });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const resolved = await resolveStaffPeer(admin, me, staffId);
  if (resolved.error) {
    return res.status(resolved.status || 404).json({ error: resolved.error });
  }
  const peer = resolved.peer;

  const { staffId: threadStaffId, peerId: threadPeerId } = resolveStaffThreadKey(me, peer);

  try {
    const now = new Date().toISOString();
    let marked = 0;

    const { data: pairRows, error } = await admin
      .from("staff_messages")
      .update({ readAt: now })
      .eq("staffId", threadStaffId)
      .eq("peerId", threadPeerId)
      .is("readAt", null)
      .neq("senderId", me.id)
      .select("id");

    if (error) {
      const missing = /does not exist|schema cache|peerId/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing/outdated. Re-run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }
    marked += (pairRows || []).length;

    // Legacy Support rows (peerId null)
    if (me.role === "super_admin" || peer.role === "super_admin") {
      const staffKey = me.role === "super_admin" ? peer.id : me.id;
      const { data: legacyRows } = await admin
        .from("staff_messages")
        .update({ readAt: now })
        .eq("staffId", staffKey)
        .is("peerId", null)
        .is("readAt", null)
        .neq("senderId", me.id)
        .select("id");
      marked += (legacyRows || []).length;
    }

    return res.status(200).json({ ok: true, marked });
  } catch (e) {
    console.error("staff-read:", e.message);
    return res.status(500).json({ error: e.message || "Could not mark read" });
  }
}
