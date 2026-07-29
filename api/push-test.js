/**
 * Send a test web-push to the signed-in user's devices (client or staff).
 * Body: { token }
 */
import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { createNotification } from "../server/assign.js";
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

  const userId = auth.profile.id;
  const title = "Test notification";
  const bodyText = "Push is working on this device. You’re all set.";

  const { data: rows, error: selErr } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("userId", userId);
  if (selErr) {
    const missing = /does not exist|schema cache|push_subscriptions/i.test(selErr.message || "");
    return res.status(400).json({
      error: missing
        ? "Push table missing. Run supabase/push-subscriptions.sql in the Supabase SQL editor."
        : selErr.message,
    });
  }
  if (!rows?.length) {
    return res.status(400).json({
      error: "No push subscription for this account. Enable browser notifications first, then try again.",
    });
  }

  const push = await sendPushToUser(admin, userId, {
    title,
    body: bodyText,
    type: "info",
  });

  try {
    await createNotification(admin, {
      userId,
      clientId: auth.profile.role === "client" ? userId : null,
      type: "info",
      title,
      body: bodyText,
      meta: { source: "push_test" },
      push: false, // already sent above — avoid double push
    });
  } catch (e) {
    console.warn("push-test in-app:", e.message);
  }

  if (!push.sent) {
    return res.status(400).json({
      error:
        push.reason === "not_configured"
          ? "Push is not configured on the server."
          : "Push send failed (subscription may be stale or VAPID keys mismatch). Turn push off/on, then try again.",
      push,
    });
  }

  return res.status(200).json({ ok: true, sent: push.sent, devices: push.total || rows.length });
}
