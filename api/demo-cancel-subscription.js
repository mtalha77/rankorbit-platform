import {
  getAdmin,
  stripeConfigured,
  readJson,
  requireClient,
  nextMonthFirstIso,
} from "../server/billing.js";

/** Cancel/resume without Stripe — only when Stripe env is not configured. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (stripeConfigured()) {
    return res.status(403).json({ error: "Use /api/cancel-subscription while Stripe is configured" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, resume } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const fields = resume
    ? { cancelAtPeriodEnd: false, canceledAt: null }
    : {
        cancelAtPeriodEnd: true,
        canceledAt: new Date().toISOString(),
        currentPeriodEnd: auth.profile.currentPeriodEnd || nextMonthFirstIso(),
      };

  const { error } = await admin.from("profiles").update(fields).eq("id", auth.profile.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, ...fields });
}
