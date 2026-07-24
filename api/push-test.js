/**
 * Send a test web-push to the signed-in user's devices (client or staff).
 * Body: { token }
 * Use after Enable to verify Windows/desktop receives server push.
 */
import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { sendPushToUser, vapidConfigured } from "../server/push.js";

async function requireAnyUser(admin, token) {
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (!staff.error) return { profile: staff.profile };
  const client = await requireClient(admin, token);
  if (client.error) return { error: client.error, status: client.status };
  return { profile: client.profile };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!vapidConfigured()) {
    return res.status(503).json({ error: "Push is not configured (VAPID keys missing on server)" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireAnyUser(admin, body.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const role = auth.profile.role;
  const isStaff = role && role !== "client";
  const result = await sendPushToUser(admin, auth.profile.id, {
    type: "push_test",
    title: "NAP Orbit test notification",
    body: isStaff
      ? "Staff push works on this device. Team messages will alert here too."
      : "Client push works on this device.",
    url: isStaff ? "/admin" : "/dashboard",
  });

  if (!result.sent) {
    return res.status(200).json({
      ok: false,
      ...result,
      error:
        result.reason === "no_subscriptions"
          ? "No push subscription for this account on any device. Open Account → Enable browser notifications on this PC."
          : result.reason === "not_configured"
            ? "VAPID keys missing on server"
            : "Push send failed — check server logs / re-enable notifications",
    });
  }

  return res.status(200).json({ ok: true, ...result });
}
