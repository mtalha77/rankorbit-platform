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
    roles: ["super_admin", "manager", "agent"],
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
      .select("id,role,assignedAgentId,name,businessName,email")
      .eq("id", targetClientId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "Client not found" });
    }
    if (profile.role === "agent" && client.assignedAgentId !== profile.id) {
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
    let q = admin
      .from("messages")
      .select("id,clientId,agentId,senderId,body,createdAt,readAt")
      .eq("clientId", targetClientId)
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

    const { client, peer, kind, needsBdm } = await resolveClientChatPeer(admin, targetClientId);
    const myId = profile.id;
    const unread = (data || []).filter((m) => !m.readAt && m.senderId !== myId).length;

    return res.status(200).json({
      ok: true,
      messages: data || [],
      unread,
      agent: peer
        ? { id: peer.id, name: peer.name, email: peer.email }
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
          }
        : null,
      isStaff,
    });
  } catch (e) {
    console.error("chat-messages:", e.message);
    return res.status(500).json({ error: e.message || "Could not load messages" });
  }
}
