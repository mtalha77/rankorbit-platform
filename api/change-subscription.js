import {
  getAdmin,
  getStripe,
  stripeConfigured,
  PLAN_IDS,
  priceIdForPlan,
  readJson,
  requireClient,
  resolveSubscriptionId,
  subscriptionFieldsFromStripe,
  logBillingActivity,
} from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const { token, planId } = await readJson(req);
  if (!PLAN_IDS.includes(planId)) return res.status(400).json({ error: "Invalid plan" });
  const priceId = priceIdForPlan(planId);
  if (!priceId) return res.status(500).json({ error: "Price ID missing for plan" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  try {
    const { subscriptionId, subscription: existing } = await resolveSubscriptionId(stripe, admin, profile);
    if (!subscriptionId) {
      return res.status(400).json({ error: "No active subscription to change. Subscribe first." });
    }

    const sub = existing || (await stripe.subscriptions.retrieve(subscriptionId));
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return res.status(500).json({ error: "Subscription has no items" });

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { ...(sub.metadata || {}), supabase_user_id: profile.id, plan_id: planId },
      cancel_at_period_end: false,
    });

    const fields = subscriptionFieldsFromStripe(updated, planId);
    fields.canceledAt = null;
    fields.cancelAtPeriodEnd = false;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    const { error } = await admin.from("profiles").update(clean).eq("id", profile.id);
    if (error) {
      console.error("change-subscription db:", error.message);
      return res.status(500).json({ error: "Stripe updated but DB save failed: " + error.message });
    }

    await logBillingActivity(admin, profile.id, `Plan changed to ${planId} via Stripe`);

    return res.status(200).json({ ok: true, plan: planId });
  } catch (e) {
    console.error("change-subscription:", e.message);
    return res.status(500).json({ error: e.message || "Could not change plan" });
  }
}
