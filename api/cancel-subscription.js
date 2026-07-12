import {
  getAdmin,
  getStripe,
  stripeConfigured,
  readJson,
  requireClient,
  subscriptionFieldsFromStripe,
} from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const { token, resume } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  if (!profile.stripeSubscriptionId) {
    return res.status(400).json({ error: "No Stripe subscription on this account" });
  }

  try {
    const updated = await stripe.subscriptions.update(profile.stripeSubscriptionId, {
      cancel_at_period_end: !resume,
    });
    const fields = subscriptionFieldsFromStripe(updated, profile.plan);
    if (resume) {
      fields.canceledAt = null;
      fields.cancelAtPeriodEnd = false;
    } else {
      fields.cancelAtPeriodEnd = true;
      fields.canceledAt = new Date().toISOString();
    }
    const { error } = await admin.from("profiles").update(fields).eq("id", profile.id);
    if (error) console.error("cancel-subscription db:", error.message);

    return res.status(200).json({
      ok: true,
      cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
      currentPeriodEnd: fields.currentPeriodEnd,
    });
  } catch (e) {
    console.error("cancel-subscription:", e.message);
    return res.status(500).json({ error: e.message || "Could not update subscription" });
  }
}
