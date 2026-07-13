// Auto-assign clients to least-loaded agents + notify BDMs.
import { randomUUID } from "crypto";

function uid(prefix = "n") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Pick the active agent with the fewest assigned clients. Ties → earliest created. */
export async function pickLeastLoadedAgent(admin) {
  const { data: agents, error } = await admin
    .from("profiles")
    .select("id,email,name,createdAt,status,deletedAt")
    .eq("role", "agent");
  if (error) throw new Error(error.message);
  const activeAgents = (agents || []).filter((a) => !a.deletedAt && a.status !== "suspended");
  if (!activeAgents.length) return null;

  const { data: clients } = await admin
    .from("profiles")
    .select("id,assignedAgentId,deletedAt,role")
    .eq("role", "client");

  const counts = Object.fromEntries(activeAgents.map((a) => [a.id, 0]));
  for (const c of clients || []) {
    if (c.deletedAt) continue;
    if (c.assignedAgentId && counts[c.assignedAgentId] != null) counts[c.assignedAgentId]++;
  }

  const sorted = [...activeAgents].sort((a, b) => {
    const d = (counts[a.id] || 0) - (counts[b.id] || 0);
    if (d !== 0) return d;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
  return sorted[0] || null;
}

/**
 * Assign client to least-loaded agent if they don't already have one.
 * Notifies the agent (in-app + optional email).
 * @returns {{ agent, assigned: boolean, skipped?: string } | null}
 */
export async function autoAssignLeastLoadedAgent(admin, clientId, opts = {}) {
  if (!admin || !clientId) return null;

  const { data: client, error } = await admin
    .from("profiles")
    .select("id,email,name,businessName,plan,assignedAgentId")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) return null;

  if (client.assignedAgentId && !opts.force) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id,email,name")
      .eq("id", client.assignedAgentId)
      .maybeSingle();
    return { agent: existing, assigned: false, skipped: "already_assigned" };
  }

  const agent = await pickLeastLoadedAgent(admin);
  if (!agent) {
    console.warn("autoAssign: no agents available");
    return { agent: null, assigned: false, skipped: "no_agents" };
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({ assignedAgentId: agent.id })
    .eq("id", clientId);
  if (upErr) throw new Error(upErr.message);

  const business = client.businessName || client.name || client.email || "A client";
  await notifyBdm(admin, {
    agentId: agent.id,
    clientId,
    type: "client_assigned",
    title: "New client assigned to you",
    body: `${business} subscribed${client.plan ? ` (${client.plan})` : ""} and was assigned to you. Please review their account.`,
  });

  try {
    await admin.from("activity").insert({
      id: uid("a"),
      clientId,
      type: "client",
      desc: `Assigned to BDM ${agent.name || agent.email}`,
      date: todayLabel(),
      by: "System",
    });
  } catch (e) {
    console.warn("activity assign log:", e.message);
  }

  return { agent, assigned: true };
}

/** Ensure client has an agent (auto-assign if missing), then return agent profile. */
export async function resolveClientAgent(admin, clientId) {
  const { data: client } = await admin
    .from("profiles")
    .select("id,assignedAgentId,email,name,businessName,plan")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { client: null, agent: null };

  if (client.assignedAgentId) {
    const { data: agent } = await admin
      .from("profiles")
      .select("id,email,name")
      .eq("id", client.assignedAgentId)
      .maybeSingle();
    return { client, agent };
  }

  const result = await autoAssignLeastLoadedAgent(admin, clientId);
  return { client, agent: result?.agent || null };
}

export async function createNotification(admin, row) {
  const payload = {
    id: row.id || uid("n"),
    userId: row.userId,
    clientId: row.clientId || null,
    type: row.type || "info",
    title: row.title,
    body: row.body || null,
    read: false,
    meta: row.meta || {},
    createdAt: new Date().toISOString(),
  };
  const { error } = await admin.from("notifications").insert(payload);
  if (error) {
    // Table may not exist yet — log and continue so booking still works.
    console.warn("notifications insert:", error.message);
    return null;
  }
  return payload;
}

/** Notify any user (client or staff) in-app. */
export async function notifyUser(admin, { userId, clientId, type, title, body, meta }) {
  if (!userId) return null;
  return createNotification(admin, { userId, clientId, type, title, body, meta });
}

/** In-app notification + optional email to agent and routeBdm addresses. */
export async function notifyBdm(admin, { agentId, clientId, type, title, body, meta }) {
  if (!agentId) return { notified: false };

  await createNotification(admin, {
    userId: agentId,
    clientId,
    type,
    title,
    body,
    meta,
  });

  const { data: agent } = await admin
    .from("profiles")
    .select("email,name")
    .eq("id", agentId)
    .maybeSingle();

  const emails = new Set();
  if (agent?.email) emails.add(agent.email.toLowerCase());

  try {
    const { data: settingsRow } = await admin.from("settings").select("data").eq("id", 1).maybeSingle();
    const cfg = settingsRow?.data?.config || {};
    if (cfg.routeBdmOn !== false && cfg.routeBdm) {
      String(cfg.routeBdm)
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .forEach((e) => emails.add(e));
    }
  } catch {
    /* optional */
  }

  const emailResult = await sendNotifyEmails([...emails], title, body);
  return { notified: true, emails: [...emails], emailResult };
}

async function sendNotifyEmails(toList, subject, text) {
  if (!toList.length) return { sent: false, reason: "no_recipients" };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL || "NAP Orbit <onboarding@resend.dev>";
  if (!apiKey) {
    console.info("[notify] RESEND_API_KEY missing — in-app notification only. Would email:", toList.join(", "));
    return { sent: false, reason: "no_resend_key", to: toList };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: toList,
        subject: subject || "NAP Orbit notification",
        text: text || "",
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.warn("[notify] Resend error:", j);
      return { sent: false, reason: j.message || "resend_failed" };
    }
    return { sent: true, id: j.id };
  } catch (e) {
    console.warn("[notify] email failed:", e.message);
    return { sent: false, reason: e.message };
  }
}
