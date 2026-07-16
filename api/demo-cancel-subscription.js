import {
  getAdmin,
  stripeConfigured,
  readJson,
  requireClient,
} from "../server/billing.js";

/**
 * Cancel/resume when Stripe is not configured (legacy local profiles only).
 * New subscriptions always go through Stripe Checkout — there is no free plan.
 */
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
        // Keep existing period end only — never invent +1 month.
        ...(auth.profile.currentPeriodEnd
          ? { currentPeriodEnd: auth.profile.currentPeriodEnd }
          : {}),
      };

  const { error } = await admin.from("profiles").update(fields).eq("id", auth.profile.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, ...fields });
}
