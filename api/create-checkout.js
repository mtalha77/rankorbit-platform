import {
  getAdmin,
  getStripe,
  stripeConfigured,
  PLAN_IDS,
  priceIdForPlan,
  returnBase,
  readJson,
  requireClient,
  ensureStripeCustomer,
} from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const { token, planId, returnOrigin } = await readJson(req);
  if (!PLAN_IDS.includes(planId)) return res.status(400).json({ error: "Invalid plan" });
  const priceId = priceIdForPlan(planId);
  if (!priceId) return res.status(500).json({ error: "Price ID missing for plan" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  if (profile.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(profile.subscriptionStatus)) {
    return res.status(409).json({ error: "You already have a subscription. Use Switch plan instead." });
  }

  try {
    const customerId = await ensureStripeCustomer(stripe, admin, profile);
    const base = returnBase(req, returnOrigin);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: profile.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/login?billing=success`,
      cancel_url: `${base}/login?billing=cancel&plan=${planId}`,
      metadata: { supabase_user_id: profile.id, plan_id: planId },
      subscription_data: {
        metadata: { supabase_user_id: profile.id, plan_id: planId },
      },
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("create-checkout:", e.message);
    return res.status(500).json({ error: e.message || "Checkout failed" });
  }
}
