import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { resolveStaffPeer, resolveStaffThreadKey, STAFF_ROLES } from "../server/staffChat.js";

/**
 * List staff DM messages.
 * Body: { token, staffId, limit? }
 * staffId = teammate you're chatting with (required).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId, limit: lim } = await readJson(req);
  const limit = Math.min(Math.max(Number(lim) || 100, 1), 300);

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
    let q = admin
      .from("staff_messages")
      .select("id,staffId,peerId,senderId,body,createdAt,readAt")
      .eq("staffId", threadStaffId)
      .eq("peerId", threadPeerId)
      .order("createdAt", { ascending: true })
      .limit(limit);

    const { data, error } = await q;

    if (error) {
      const missing = /does not exist|schema cache|peerId/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing/outdated. Re-run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    // Also surface legacy Support rows (peerId null on the teammate's id) so old SA↔staff chats aren't lost.
    let legacy = [];
    if (me.role === "super_admin" || peer.role === "super_admin") {
      const staffKey = me.role === "super_admin" ? peer.id : me.id;
      const { data: oldRows } = await admin
        .from("staff_messages")
        .select("id,staffId,peerId,senderId,body,createdAt,readAt")
        .eq("staffId", staffKey)
        .is("peerId", null)
        .order("createdAt", { ascending: true })
        .limit(limit);
      legacy = oldRows || [];
    }

    const byId = new Map();
    for (const m of [...legacy, ...(data || [])]) byId.set(m.id, m);
    const messages = [...byId.values()].sort((a, b) =>
      String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    );

    const unread = messages.filter((m) => !m.readAt && m.senderId !== me.id).length;

    return res.status(200).json({
      ok: true,
      messages,
      unread,
      staffId: peer.id,
      threadStaffId,
      threadPeerId,
      peer,
    });
  } catch (e) {
    console.error("staff-messages:", e.message);
    return res.status(500).json({ error: e.message || "Could not load messages" });
  }
}
