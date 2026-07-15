import { getAdmin, readJson, requireStaff, requireClient } from "../server/billing.js";
import { notifyClient, notifyStaffRoute } from "../server/assign.js";

const STAFF_TYPES = new Set([
  "listing_live",
  "rejected",
  "flagged",
  "nap_fix",
  "welcome",
  "info",
  "agent_edit",
]);

const CLIENT_SELF_TYPES = new Set(["welcome"]);

const DEFAULTS = {
  welcome: {
    title: "Welcome to NAP Orbit",
    body: "Your account is ready. Choose a plan from Billing when you're set, then track listings and NAP health from your dashboard.",
  },
  listing_live: { title: "Listing went live", body: "One of your directory listings is now live." },
  rejected: { title: "Listing update", body: "A listing was rejected. Check your dashboard for details." },
  flagged: { title: "Listing flagged", body: "A listing was flagged for review. Check your dashboard." },
  nap_fix: { title: "NAP score updated", body: "Your NAP consistency score was updated." },
  info: { title: "NAP Orbit update", body: "You have a new update in your dashboard." },
  agent_edit: { title: "Agent listing change", body: "An agent edited or deleted a listing." },
};

/**
 * Create an in-app + email notification for a client.
 * Staff: any STAFF_TYPES for a clientId.
 * Client: welcome only (self).
 * Body: { token, clientId?, type, title?, body?, meta? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const payload = await readJson(req);
  const { token, type, title, body, meta } = payload || {};
  if (!type || typeof type !== "string") {
    return res.status(400).json({ error: "type is required" });
  }

  // Prefer staff auth; fall back to client for welcome-self.
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });
  let targetClientId = payload.clientId || null;
  let isStaff = false;

  if (!staff.error) {
    isStaff = true;
    if (!STAFF_TYPES.has(type)) {
      return res.status(400).json({ error: `Unsupported notification type: ${type}` });
    }
    if (!targetClientId) {
      return res.status(400).json({ error: "clientId required" });
    }
  } else {
    const clientAuth = await requireClient(admin, token);
    if (clientAuth.error) {
      return res.status(staff.status || clientAuth.status).json({
        error: staff.error || clientAuth.error,
      });
    }
    if (!CLIENT_SELF_TYPES.has(type)) {
      return res.status(403).json({ error: "Clients can only send welcome notifications to themselves" });
    }
    targetClientId = clientAuth.profile.id;
  }

  const { data: client, error: cErr } = await admin
    .from("profiles")
    .select("id,email,name,businessName,role")
    .eq("id", targetClientId)
    .maybeSingle();
  if (cErr) return res.status(500).json({ error: cErr.message });
  if (!client || client.role !== "client") {
    return res.status(404).json({ error: "Client not found" });
  }

  const defaults = DEFAULTS[type] || DEFAULTS.info;
  const finalTitle = (title && String(title).trim()) || defaults.title;
  const finalBody = (body && String(body).trim()) || defaults.body;

  // Agent edits: email managers only (no client notification).
  if (type === "agent_edit" && isStaff) {
    try {
      const emailResult = await notifyStaffRoute(admin, {
        kind: "agentEdit",
        title: finalTitle,
        body: finalBody,
      });
      return res.status(200).json({ ok: true, staffOnly: true, email: emailResult });
    } catch (e) {
      console.error("notify-client agent_edit:", e.message);
      return res.status(500).json({ error: e.message || "Could not notify staff" });
    }
  }

  try {
    const result = await notifyClient(admin, {
      userId: client.id,
      clientId: client.id,
      type,
      title: finalTitle,
      body: finalBody,
      meta: { ...(meta && typeof meta === "object" ? meta : {}), source: isStaff ? "staff" : "self" },
    });

    if (type === "welcome" && isStaff === false) {
      try {
        await notifyStaffRoute(admin, {
          kind: "signup",
          title: "New client signup",
          body: `${client.businessName || client.name || client.email} created an account.`,
        });
      } catch (e) {
        console.warn("notify staff signup:", e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      notificationId: result?.notificationId || null,
      email: result?.emailResult || null,
    });
  } catch (e) {
    console.error("notify-client:", e.message);
    return res.status(500).json({ error: e.message || "Could not notify client" });
  }
}
