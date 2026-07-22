import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { isBdmRole } from "../server/roles.js";

/**
 * List chat threads for staff (BDM: assigned clients, current-agent thread only).
 * Body: { token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm"],
  });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const mineOnly = isBdmRole(auth.profile.role);
    let clientIds = null;
    if (mineOnly) {
      const { data: clients, error } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "client")
        .eq("assignedBdmId", auth.profile.id);
      if (error) return res.status(500).json({ error: error.message });
      clientIds = (clients || []).map((c) => c.id);
      if (!clientIds.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });
    }

    // Recent messages for the current BDM thread only (not prior assignees).
    let q = admin
      .from("messages")
      .select("id,clientId,agentId,senderId,body,createdAt,readAt")
      .order("createdAt", { ascending: false })
      .limit(400);
    if (clientIds) q = q.in("clientId", clientIds);
    if (mineOnly) q = q.eq("agentId", auth.profile.id);

    const { data: rows, error } = await q;
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Chat table missing. Run supabase/chat-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    // For managers: only surface each client's current-assignee thread (skip old BDM history).
    let allowed = rows || [];
    if (!mineOnly && allowed.length) {
      const cids = [...new Set(allowed.map((m) => m.clientId))];
      const { data: clients } = await admin
        .from("profiles")
        .select("id,assignedBdmId")
        .in("id", cids);
      const assigned = Object.fromEntries((clients || []).map((c) => [c.id, c.assignedBdmId || null]));
      allowed = allowed.filter((m) => {
        const cur = assigned[m.clientId];
        // No BDM yet → allow support/manager peer threads.
        if (!cur) return true;
        return m.agentId === cur;
      });
    }

    const byClient = new Map();
    for (const m of allowed) {
      if (byClient.has(m.clientId)) continue;
      byClient.set(m.clientId, m);
    }

    const ids = [...byClient.keys()];
    if (!ids.length) return res.status(200).json({ ok: true, threads: [], unreadTotal: 0 });

    const { data: profiles } = await admin
      .from("profiles")
      .select("id,name,businessName,email,assignedBdmId")
      .in("id", ids);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    // Unread counts — current BDM thread only
    let unreadQ = admin
      .from("messages")
      .select("clientId,agentId")
      .in("clientId", ids)
      .is("readAt", null)
      .neq("senderId", auth.profile.id);
    if (mineOnly) unreadQ = unreadQ.eq("agentId", auth.profile.id);

    const { data: unreadRows } = await unreadQ;

    const unreadMap = {};
    for (const r of unreadRows || []) {
      const cur = profileMap[r.clientId]?.assignedBdmId || null;
      if (!mineOnly && cur && r.agentId !== cur) continue;
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
