import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { STAFF_ROLES, resolveStaffThreadKey } from "../server/staffChat.js";

/**
 * List staff DM threads — same for every staff role.
 * One thread per other teammate (super_admin / manager / agent).
 * Body: { token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireStaff(admin, token, { roles: STAFF_ROLES });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;

  try {
    const { data: peers } = await admin
      .from("profiles")
      .select("id,name,email,role,deletedAt")
      .in("role", STAFF_ROLES)
      .neq("id", me.id)
      .is("deletedAt", null)
      .order("name", { ascending: true });

    const list = peers || [];
    if (!list.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });

    const threadMeta = list.map((p) => {
      const key = resolveStaffThreadKey(me, p);
      return { peer: p, ...key };
    });

    const staffIds = [...new Set(threadMeta.map((t) => t.staffId))];

    const { data: rows, error } = await admin
      .from("staff_messages")
      .select("id,staffId,peerId,senderId,body,createdAt,readAt")
      .in("staffId", staffIds)
      .order("createdAt", { ascending: false })
      .limit(1200);

    if (error) {
      const missing = /does not exist|schema cache|peerId/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing/outdated. Re-run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const matchThread = (m, t) => m.staffId === t.staffId && m.peerId === t.peerId;

    const threads = threadMeta.map((t) => {
      const last = (rows || []).find((m) => matchThread(m, t)) || null;
      const unread = (rows || []).filter(
        (m) => matchThread(m, t) && !m.readAt && m.senderId !== me.id
      ).length;
      return {
        staffId: t.peer.id,
        threadStaffId: t.staffId,
        threadPeerId: t.peerId,
        name: t.peer.name || t.peer.email || "Teammate",
        email: t.peer.email || null,
        role: t.peer.role,
        lastMessage: last
          ? { id: last.id, body: last.body, createdAt: last.createdAt, senderId: last.senderId }
          : null,
        unread,
      };
    });

    threads.sort((a, b) => {
      const ta = a.lastMessage?.createdAt || "";
      const tb = b.lastMessage?.createdAt || "";
      if (ta && tb) return tb.localeCompare(ta);
      if (ta) return -1;
      if (tb) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

    const unreadTotal = threads.reduce((s, t) => s + (t.unread || 0), 0);
    return res.status(200).json({ ok: true, threads, unreadTotal });
  } catch (e) {
    console.error("staff-threads:", e.message);
    return res.status(500).json({ error: e.message || "Could not load threads" });
  }
}
