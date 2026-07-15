import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import {
  resolveClientAgent,
  notifyBdm,
  notifyClient,
  notifySuperAdmins,
} from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "m") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Send a chat message in the client↔BDM thread.
 * Body: { token, body, clientId? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, body, clientId } = await readJson(req);
  const text = String(body || "").trim();
  if (!text) return res.status(400).json({ error: "Message is required" });
  if (text.length > 4000) return res.status(400).json({ error: "Message is too long" });

  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });

  let sender = null;
  let targetClientId = null;
  let isStaff = false;

  if (!staff.error) {
    isStaff = true;
    sender = staff.profile;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    targetClientId = clientId;

    const { data: clientRow } = await admin
      .from("profiles")
      .select("id,role,assignedAgentId")
      .eq("id", targetClientId)
      .maybeSingle();
    if (!clientRow || clientRow.role !== "client") {
      return res.status(404).json({ error: "Client not found" });
    }
    if (sender.role === "agent" && clientRow.assignedAgentId !== sender.id) {
      return res.status(403).json({ error: "This client is not assigned to you" });
    }
  } else {
    const clientAuth = await requireClient(admin, token);
    if (clientAuth.error) {
      return res.status(clientAuth.status || 401).json({ error: clientAuth.error });
    }
    sender = clientAuth.profile;
    targetClientId = sender.id;
  }

  try {
    const { client, agent } = await resolveClientAgent(admin, targetClientId);
    if (!agent) {
      return res.status(503).json({
        error: "No BDM is available yet. Please try again shortly or contact support.",
      });
    }

    // Staff send: use assigned agent id on the thread (manager may reply as themselves but
    // thread remains tied to the client's assigned agent).
    const agentId = agent.id;
    const msg = {
      id: uid("m"),
      clientId: targetClientId,
      agentId,
      senderId: sender.id,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    const { error } = await admin.from("messages").insert(msg);
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Chat table missing. Run supabase/chat-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const who = client?.businessName || client?.name || client?.email || "Client";
    const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;

    if (isStaff) {
      // Notify client
      await notifyClient(admin, {
        userId: targetClientId,
        clientId: targetClientId,
        type: "chat_message",
        title: `Message from ${sender.name || "your BDM"}`,
        body: preview,
        meta: { agentId, from: "staff" },
      });
    } else {
      // Notify BDM (+ optional routeBdm emails)
      await notifyBdm(admin, {
        agentId,
        clientId: targetClientId,
        type: "chat_message",
        title: `Chat from ${who}`,
        body: preview,
        meta: { from: "client" },
      });
      await notifySuperAdmins(admin, {
        clientId: targetClientId,
        type: "chat_message",
        title: `Client chat → ${agent.name || "agent"}`,
        body: `${who}: ${preview}`,
        meta: { agentId, agentName: agent.name || agent.email || null, reportOnly: true },
      });
    }

    return res.status(200).json({
      ok: true,
      message: msg,
      agent: { id: agent.id, name: agent.name, email: agent.email },
    });
  } catch (e) {
    console.error("chat-send:", e.message);
    return res.status(500).json({ error: e.message || "Could not send message" });
  }
}
