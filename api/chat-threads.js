import { getAdmin, readJson, requireStaff } from "../server/billing.js";

/**
 * List chat threads for staff (agent: assigned clients; manager/sa: all with messages).
 * Body: { token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    let clientIds = null;
    if (auth.profile.role === "bdm" || auth.profile.role === "agent") {
      const { data: clients, error } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "client")
        .eq("assignedAgentId", auth.profile.id);
      if (error) return res.status(500).json({ error: error.message });
      clientIds = (clients || []).map((c) => c.id);
      if (!clientIds.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });
    }

    // Recent messages — then collapse to last per client
    let q = admin
      .from("messages")
      .select("id,clientId,agentId,senderId,body,createdAt,readAt")
      .order("createdAt", { ascending: false })
      .limit(400);
    if (clientIds) q = q.in("clientId", clientIds);

    const { data: rows, error } = await q;
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Chat table missing. Run supabase/chat-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const byClient = new Map();
    for (const m of rows || []) {
      if (byClient.has(m.clientId)) continue;
      byClient.set(m.clientId, m);
    }

    const ids = [...byClient.keys()];
    if (!ids.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });

    const { data: profiles } = await admin
      .from("profiles")
      .select("id,name,businessName,email,assignedAgentId")
      .in("id", ids);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    // Unread counts per client (messages not from me, unread)
    const { data: unreadRows } = await admin
      .from("messages")
      .select("clientId")
      .in("clientId", ids)
      .is("readAt", null)
      .neq("senderId", auth.profile.id);

    const unreadMap = {};
    for (const r of unreadRows || []) {
      unreadMap[r.clientId] = (unreadMap[r.clientId] || 0) + 1;
    }

    const threads = ids.map((cid) => {
      const last = byClient.get(cid);
      const p = profileMap[cid] || {};
      return {
        clientId: cid,
        clientName: p.businessName || p.name || p.email || "Client",
        email: p.email || null,
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              createdAt: last.createdAt,
              senderId: last.senderId,
            }
          : null,
        unread: unreadMap[cid] || 0,
      };
    });

    threads.sort((a, b) => {
      const ta = a.lastMessage?.createdAt || "";
      const tb = b.lastMessage?.createdAt || "";
      return tb.localeCompare(ta);
    });

    const unreadTotal = threads.reduce((s, t) => s + (t.unread || 0), 0);
    return res.status(200).json({ ok: true, threads, unreadTotal });
  } catch (e) {
    console.error("chat-threads:", e.message);
    return res.status(500).json({ error: e.message || "Could not load threads" });
  }
}
