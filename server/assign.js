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
  const assignBody = `${business} subscribed${client.plan ? ` (${client.plan})` : ""} and was assigned to ${agent.name || agent.email || "an agent"}.`;
  await notifyBdm(admin, {
    agentId: agent.id,
    clientId,
    type: "client_assigned",
    title: "New client assigned to you",
    body: `${business} subscribed${client.plan ? ` (${client.plan})` : ""} and was assigned to you. Please review their account.`,
  });

  await notifySuperAdmins(admin, {
    clientId,
    type: "client_assigned",
    title: "Client assigned to agent",
    body: assignBody,
    meta: { agentId: agent.id, agentName: agent.name || agent.email || null, source: "auto" },
  });

  await notifyClient(admin, {
    userId: clientId,
    clientId,
    type: "bdm_assigned",
    title: "Your BDM has been assigned",
    body: `${agent.name || "A Business Development Manager"} is now your dedicated contact. You can book a call or send them a message anytime.`,
    meta: { agentId: agent.id },
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
      .select("id,email,name,role")
      .eq("id", client.assignedAgentId)
      .maybeSingle();
    return { client, agent };
  }

  const result = await autoAssignLeastLoadedAgent(admin, clientId);
  return { client, agent: result?.agent || null };
}

/** Active manager with the fewest assigned clients (for chat support fallback). */
export async function pickLeastLoadedManager(admin) {
  const { data: managers, error } = await admin
    .from("profiles")
    .select("id,email,name,createdAt,status,deletedAt")
    .eq("role", "manager");
  if (error) throw new Error(error.message);
  const active = (managers || []).filter((m) => !m.deletedAt && m.status !== "suspended");
  if (!active.length) return null;

  const { data: clients } = await admin
    .from("profiles")
    .select("assignedAgentId,deletedAt,role")
    .eq("role", "client");
  const counts = Object.fromEntries(active.map((m) => [m.id, 0]));
  for (const c of clients || []) {
    if (c.deletedAt) continue;
    if (c.assignedAgentId && counts[c.assignedAgentId] != null) counts[c.assignedAgentId]++;
  }
  active.sort((a, b) => {
    const d = (counts[a.id] || 0) - (counts[b.id] || 0);
    if (d !== 0) return d;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
  return active[0] || null;
}

/**
 * Staff peer for client chat / Book a Call: assigned/auto BDM, else a manager (support).
 * Does not set assignedAgentId to a manager — a real agent can still be assigned later.
 */
export async function resolveClientChatPeer(admin, clientId) {
  const { client, agent } = await resolveClientAgent(admin, clientId);
  if (!client) return { client: null, peer: null, kind: "none", needsBdm: true };

  if (agent) {
    return {
      client,
      peer: agent,
      kind: agent.role === "manager" ? "support" : "bdm",
      needsBdm: agent.role === "manager",
    };
  }

  const manager = await pickLeastLoadedManager(admin);
  if (manager) {
    return {
      client,
      peer: { id: manager.id, email: manager.email, name: manager.name, role: "manager" },
      kind: "support",
      needsBdm: true,
    };
  }

  return { client, peer: null, kind: "none", needsBdm: true };
}

/** Ping every active manager that a client needs a BDM / support reply. */
export async function notifyManagersInApp(admin, { clientId, type, title, body, meta }) {
  const { data: managers } = await admin
    .from("profiles")
    .select("id,status,deletedAt")
    .eq("role", "manager");
  const targets = (managers || []).filter((m) => m.id && !m.deletedAt && m.status !== "suspended");
  for (const m of targets) {
    try {
      await createNotification(admin, {
        userId: m.id,
        clientId: clientId || null,
        type: type || "info",
        title,
        body,
        meta: { ...(meta || {}), audience: "manager" },
      });
    } catch (e) {
      console.warn("notifyManagersInApp:", e.message);
    }
  }
  return targets.length;
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
    console.error("notifications insert:", error.message);
    const missing =
      /does not exist|Could not find the table|schema cache/i.test(error.message || "");
    throw new Error(
      missing
        ? "Notifications table is missing. Run supabase/notifications.sql in the Supabase SQL editor."
        : `Could not save notification: ${error.message}`
    );
  }
  return payload;
}

/** Notify any user (client or staff) in-app only. */
export async function notifyUser(admin, { userId, clientId, type, title, body, meta }) {
  if (!userId) return null;
  // Super admins only get peer team-chat pings — never client/agent ops copies.
  if (type && type !== "staff_message") {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role === "super_admin") {
      return null;
    }
  }
  return createNotification(admin, { userId, clientId, type, title, body, meta });
}

function appBaseUrl() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  return raw || "https://www.naporbit.com";
}

function emailBodyWithCta(body) {
  const link = `${appBaseUrl()}/dashboard`;
  const text = String(body || "").trim();
  return `${text}\n\nOpen your dashboard: ${link}\n\n— NAP Orbit`;
}

const PLAN_LABELS = {
  essentials: "Essentials",
  growth: "Growth",
  gmb: "GMB Pro",
};

export function planLabel(planId) {
  return PLAN_LABELS[planId] || planId || "your plan";
}

/**
 * Client-facing: in-app notification + email to profiles.email (Resend when configured).
 * Without RESEND_API_KEY, in-app still works; email is logged and skipped.
 */
export async function notifyClient(admin, { userId, clientId, type, title, body, meta }) {
  if (!userId) return { notified: false };

  const row = await createNotification(admin, {
    userId,
    clientId: clientId || userId,
    type,
    title,
    body,
    meta,
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("email,name")
    .eq("id", userId)
    .maybeSingle();

  const email = profile?.email?.trim()?.toLowerCase();
  if (!email) {
    return { notified: true, notificationId: row?.id, emailResult: { sent: false, reason: "no_email" } };
  }

  const emailResult = await sendNotifyEmails([email], title, emailBodyWithCta(body));
  return { notified: true, notificationId: row?.id, email, emailResult };
}

/**
 * Email staff/ops addresses from Settings routing (in-app is handled separately).
 * kind: signup | cancel | planChange | system | agentEdit | onboard | suspend | report
 */
export async function notifyStaffRoute(admin, { kind, title, body }) {
  if (!admin || !kind) return { sent: false, reason: "bad_args" };

  let cfg = {};
  try {
    const { data: settingsRow } = await admin.from("settings").select("data").eq("id", 1).maybeSingle();
    cfg = settingsRow?.data?.config || {};
  } catch {
    return { sent: false, reason: "no_settings" };
  }

  const map = {
    signup: { toggle: "notifySignup", route: "routeSignup", on: "routeSignupOn" },
    cancel: { toggle: "notifyCancel", route: "routeCancel", on: "routeCancelOn" },
    planChange: { toggle: "notifyPlanChange", route: "routeOnboard", on: "routeOnboardOn" },
    onboard: { toggle: "notifyPlanChange", route: "routeOnboard", on: "routeOnboardOn" },
    system: { toggle: null, route: "routeSystem", on: "routeSystemOn" },
    agentEdit: { toggle: "notifyAgentEdit", route: "routeAgentEdit", on: "routeAgentEditOn" },
    suspend: { toggle: null, route: "routeSuspend", on: "routeSuspendOn" },
    report: { toggle: "monthlyReport", route: "routeReport", on: "routeReportOn" },
  };

  const spec = map[kind];
  if (!spec) return { sent: false, reason: "unknown_kind" };

  if (spec.toggle && cfg[spec.toggle] === false) {
    return { sent: false, reason: "toggle_off" };
  }
  if (cfg[spec.on] === false) {
    return { sent: false, reason: "route_off" };
  }

  const emails = new Set();
  const routeVal = cfg[spec.route];
  if (routeVal) {
    String(routeVal)
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => emails.add(e));
  }
  // Fall back to control-panel notifyEmail when route field empty.
  if (!emails.size && cfg.notifyEmail) {
    String(cfg.notifyEmail)
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => emails.add(e));
  }

  if (!emails.size) return { sent: false, reason: "no_recipients" };
  return sendNotifyEmails([...emails], title, body);
}

/**
 * Super admins intentionally do not receive client/agent ops notifications
 * (assignments, meetings, chat copies, staff-created alerts, etc.).
 * Kept as a no-op so existing call sites stay safe.
 */
export async function notifySuperAdmins(_admin, _payload) {
  return [];
}

/** In-app notification + optional email to agent and routeBdm addresses. */
export async function notifyBdm(admin, { agentId, clientId, type, title, body, meta }) {
  if (!agentId) return { notified: false };

  const { data: agent } = await admin
    .from("profiles")
    .select("email,name,role")
    .eq("id", agentId)
    .maybeSingle();

  // Never deliver client/agent workflow alerts to a super_admin inbox.
  if (agent?.role === "super_admin") {
    return { notified: false, reason: "super_admin_skipped" };
  }

  const row = await createNotification(admin, {
    userId: agentId,
    clientId,
    type,
    title,
    body,
    meta,
  });

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
  return { notified: true, notificationId: row?.id, emails: [...emails], emailResult };
}

/** Send plain-text email via Resend. Safe no-op when RESEND_API_KEY is unset. */
export async function sendNotifyEmails(toList, subject, text) {
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
