import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { resolveClientChatPeer } from "../server/assign.js";

/**
 * List chat messages for a client↔BDM thread.
 * Body: { token, clientId?, before?, limit? }
 * Client: own thread. Staff/agent: pass clientId (agent must be assigned unless manager/super_admin).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId, before, limit: lim } = await readJson(req);
  const limit = Math.min(Math.max(Number(lim) || 80, 1), 200);

  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  let profile = null;
  let isStaff = false;
  let targetClientId = null;

  if (!staff.error) {
    isStaff = true;
    profile = staff.profile;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    targetClientId = clientId;

    const { data: client, error } = await admin
      .from("profiles")
      .select("id,role,assignedBdmId,assignedAgentId,name,businessName,email")
      .eq("id", targetClientId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "Client not found" });
    }
    // Agents do not use client chat. BDMs only see their assigned clients.
    if (profile.role === "agent") {
      return res.status(403).json({ error: "Agents do not access client chat" });
    }
    if (profile.role === "bdm" && client.assignedBdmId !== profile.id) {
      return res.status(403).json({ error: "This client is not assigned to you" });
    }
  } else {
    const clientAuth = await requireClient(admin, token);
    if (clientAuth.error) {
      return res.status(clientAuth.status || 401).json({ error: clientAuth.error });
    }
    profile = clientAuth.profile;
    targetClientId = profile.id;
  }

  try {
    const { client, peer, kind, needsBdm } = await resolveClientChatPeer(admin, targetClientId);

    // Thread is per client + current BDM/support peer.
    // After reassignment, old BDM chats must not appear for the new BDM (or client).
    const threadAgentId = peer?.id || null;
    if (!threadAgentId) {
      return res.status(200).json({
        ok: true,
        messages: [],
        unread: 0,
        agent: null,
        kind: kind || "none",
        needsBdm: true,
        support: false,
        client: client
          ? {
              id: client.id,
              name: client.name,
              businessName: client.businessName,
              email: client.email,
            }
          : null,
        isStaff,
      });
    }

    let q = admin
      .from("messages")
      .select("id,clientId,agentId,senderId,body,createdAt,readAt")
      .eq("clientId", targetClientId)
      .eq("agentId", threadAgentId)
      .order("createdAt", { ascending: true })
      .limit(limit);

    if (before) q = q.lt("createdAt", before);

    const { data, error } = await q;
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Chat table missing. Run supabase/chat-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const rows = data || [];
    const myId = profile.id;
    const unread = rows.filter((m) => !m.readAt && m.senderId !== myId).length;

    // Enrich sender labels so staff (esp. super admin) can tell Client vs BDM vs other staff.
    const senderIds = [...new Set(rows.map((m) => m.senderId).filter(Boolean))];
    let senderMap = {};
    if (senderIds.length) {
      const { data: senders } = await admin
        .from("profiles")
        .select("id,name,businessName,email,role")
        .in("id", senderIds);
      senderMap = Object.fromEntries((senders || []).map((p) => [p.id, p]));
    }

    const roleTag = (role) => {
      if (role === "client") return "Client";
      if (role === "bdm" || role === "agent") return "BDM";
      if (role === "manager") return "Manager";
      if (role === "super_admin") return "Super Admin";
      return "Staff";
    };

    const messages = rows.map((m) => {
      const s = senderMap[m.senderId];
      const role = s?.role || (m.senderId === targetClientId ? "client" : m.senderId === peer?.id ? (peer.role || "bdm") : null);
      const name =
        role === "client"
          ? (s?.businessName || s?.name || client?.businessName || client?.name || "Client")
          : (s?.name || s?.email || (m.senderId === peer?.id ? peer?.name : null) || "Staff");
      const tag = roleTag(role);
      return {
        ...m,
        senderRole: role || null,
        senderName: name,
        senderLabel: role === "client" ? `Client · ${name}` : `${tag} · ${name}`,
      };
    });

    return res.status(200).json({
      ok: true,
      messages,
      unread,
      agent: peer
        ? { id: peer.id, name: peer.name, email: peer.email, role: peer.role || null }
        : null,
      kind,
      needsBdm: !!needsBdm,
      support: kind === "support",
      client: client
        ? {
            id: client.id,
            name: client.name,
            businessName: client.businessName,
            email: client.email,
            role: "client",
          }
        : null,
      isStaff,
    });
  } catch (e) {
    console.error("chat-messages:", e.message);
    return res.status(500).json({ error: e.message || "Could not load messages" });
  }
}
