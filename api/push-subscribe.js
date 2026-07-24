/**
 * Save browser PushSubscription for the signed-in user (client or staff).
 * Body: { token, subscription }
 */
import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { savePushSubscription, vapidConfigured, vapidPublicKey } from "../server/push.js";

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
    return res.status(503).json({ error: "Push notifications are not configured on this server" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireAnyUser(admin, body.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const result = await savePushSubscription(
    admin,
    auth.profile.id,
    body.subscription,
    req.headers?.["user-agent"] || null
  );
  if (result.error) return res.status(400).json({ error: result.error });

  return res.status(200).json({ ok: true, id: result.id, publicKey: vapidPublicKey() });
}
