import { getAdmin, readJson, requireStaff } from "../server/billing.js";

/**
 * List staff DM threads.
 * Body: { token }
 * Super admin: one thread per staff member (manager/agent).
 * Manager/agent: single "Admin / Support" thread (their own).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const isSuper = me.role === "super_admin";

  try {
    const staffIds = isSuper
      ? await (async () => {
          const { data } = await admin
            .from("profiles")
            .select("id,name,email,role")
            .in("role", ["manager", "agent"])
            .order("name", { ascending: true });
          return data || [];
        })()
      : [{ id: me.id, name: me.name, email: me.email, role: me.role }];

    const ids = staffIds.map((s) => s.id);
    if (!ids.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });

    const { data: rows, error } = await admin
      .from("staff_messages")
      .select("id,staffId,senderId,body,createdAt,readAt")
      .in("staffId", ids)
      .order("createdAt", { ascending: false })
      .limit(600);

    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing. Run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const lastByStaff = new Map();
    const unreadByStaff = {};
    for (const m of rows || []) {
      if (!lastByStaff.has(m.staffId)) lastByStaff.set(m.staffId, m);
      if (!m.readAt && m.senderId !== me.id) {
        unreadByStaff[m.staffId] = (unreadByStaff[m.staffId] || 0) + 1;
      }
    }

    const threads = staffIds.map((s) => {
      const last = lastByStaff.get(s.id) || null;
      return {
        staffId: s.id,
        name: isSuper ? s.name || s.email || "Staff" : "Admin / Support",
        email: isSuper ? s.email || null : null,
        role: s.role,
        lastMessage: last
          ? { id: last.id, body: last.body, createdAt: last.createdAt, senderId: last.senderId }
          : null,
        unread: unreadByStaff[s.id] || 0,
      };
    });

    // Super admin: keep everyone (so they can start a chat with any staff).
    // Staff: always show their single Admin thread.
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
