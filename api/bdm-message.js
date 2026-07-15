import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { resolveClientAgent, notifyBdm, notifyClient, notifySuperAdmins } from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "a") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/** Client sends a pre-call / BDM message → notifies assigned agent. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, message } = await readJson(req);
  const text = String(message || "").trim();
  if (!text) return res.status(400).json({ error: "Message is required" });
  if (text.length > 2000) return res.status(400).json({ error: "Message is too long" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { client, agent } = await resolveClientAgent(admin, auth.profile.id);
    if (!agent) {
      return res.status(503).json({
        error: "No BDM is available yet. Please try again shortly or contact support.",
      });
    }

    const who = client.businessName || client.name || client.email;
    await notifyBdm(admin, {
      agentId: agent.id,
      clientId: client.id,
      type: "bdm_message",
      title: `Message from ${who}`,
      body: text,
    });

    await notifySuperAdmins(admin, {
      clientId: client.id,
      type: "bdm_message",
      title: `Client message → ${agent.name || "agent"}`,
      body: `${who}: ${text.length > 180 ? `${text.slice(0, 180)}…` : text}`,
      meta: { agentId: agent.id, agentName: agent.name || agent.email || null, reportOnly: true },
    });

    await notifyClient(admin, {
      userId: client.id,
      clientId: client.id,
      type: "message_sent",
      title: `Message sent to ${agent.name || "your BDM"}`,
      body: `Your message was delivered to ${agent.name || "your BDM"}.\n\n${text.length > 400 ? `${text.slice(0, 400)}…` : text}`,
      meta: { agentId: agent.id },
    });

    try {
      await admin.from("activity").insert({
        id: uid("a"),
        clientId: client.id,
        type: "submitted",
        desc: `Message sent to BDM ${agent.name || agent.email}`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        by: client.name || "Client",
      });
    } catch {
      /* optional */
    }

    return res.status(200).json({
      ok: true,
      agent: { id: agent.id, name: agent.name, email: agent.email },
    });
  } catch (e) {
    console.error("bdm-message:", e.message);
    return res.status(500).json({ error: e.message || "Could not send message" });
  }
}
