import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import {
  resolveClientChatPeer,
  notifyBdm,
  notifyClient,
  notifyManagersInApp,
  notifyStaffRoute,
} from "../server/assign.js";
import { planAllowsMessaging } from "../server/planEntitlements.js";
import { randomUUID } from "crypto";

function uid(prefix = "m") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Send a chat message in the client↔BDM (or support) thread.
 * Body: { token, body, clientId? }
 * If no agent is assigned, routes to a manager so the client is never stuck.
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
    roles: ["super_admin", "manager", "bdm", "agent"],
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
    if ((sender.role === "bdm" || sender.role === "agent") && clientRow.assignedAgentId !== sender.id) {
      return res.status(403).json({ error: "This client is not assigned to you" });
    }
  } else {
    const clientAuth = await requireClient(admin, token);
    if (clientAuth.error) {
      return res.status(clientAuth.status || 401).json({ error: clientAuth.error });
    }
    sender = clientAuth.profile;
    targetClientId = sender.id;
    // Essentials (and any plan with messaging: false) cannot send — BDM→client still allowed.
    if (!planAllowsMessaging(sender.plan)) {
      return res.status(403).json({
        error: "Chat with your BDM is available on Growth and GMB Pro. Upgrade your plan to unlock Messages.",
        upgradeRequired: true,
      });
    }
  }

  try {
    const { client, peer, kind, needsBdm } = await resolveClientChatPeer(admin, targetClientId);
    if (!peer) {
      try {
        await notifyStaffRoute(admin, {
          kind: "system",
          title: "Client waiting — no BDM or manager",
          body: `${client?.businessName || client?.name || client?.email || "A client"} tried to chat but no staff is available to receive it.`,
        });
      } catch {
        /* optional */
      }
      return res.status(503).json({
        error: "Our team is briefly unavailable. Please try again in a few minutes.",
        needsBdm: true,
        kind: "none",
      });
    }

    const agentId = peer.id;
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
      await notifyClient(admin, {
        userId: targetClientId,
        clientId: targetClientId,
        type: "chat_message",
        title: `Message from ${sender.name || "your team"}`,
        body: preview,
        meta: { agentId, from: "staff" },
      });
    } else if (kind === "bdm") {
      await notifyBdm(admin, {
        agentId,
        clientId: targetClientId,
        type: "chat_message",
        title: `Chat from ${who}`,
        body: preview,
        meta: { from: "client" },
      });
    } else {
      // Support fallback — alert managers to reply and assign a BDM.
      await notifyManagersInApp(admin, {
        clientId: targetClientId,
        type: "chat_message",
        title: `Support chat from ${who}`,
        body: `${preview} — assign a BDM when ready.`,
        meta: { from: "client", support: true, peerId: agentId },
      });
      try {
        await notifyStaffRoute(admin, {
          kind: "system",
          title: "Client chat needs a BDM",
          body: `${who} messaged support (no BDM assigned yet): ${preview}`,
        });
      } catch {
        /* optional */
      }
    }

    return res.status(200).json({
      ok: true,
      message: msg,
      agent: { id: peer.id, name: peer.name, email: peer.email },
      kind,
      needsBdm: !!needsBdm,
      support: kind === "support",
    });
  } catch (e) {
    console.error("chat-send:", e.message);
    return res.status(500).json({ error: e.message || "Could not send message" });
  }
}
