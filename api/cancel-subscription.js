import {
  getAdmin,
  getStripe,
  stripeConfigured,
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

  const { token, resume } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  try {
    const { subscriptionId } = await resolveSubscriptionId(stripe, admin, profile);
    if (!subscriptionId) {
      return res.status(400).json({
        error: profile.plan
          ? "No live Stripe subscription found for this account. Open Manage billing or re-subscribe."
          : "No Stripe subscription on this account",
      });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !resume,
      metadata: {
        supabase_user_id: profile.id,
        plan_id: profile.plan || "",
        cancel_requested: resume ? "" : "true",
      },
    });

    const fields = subscriptionFieldsFromStripe(updated, profile.plan);
    fields.stripeSubscriptionId = subscriptionId;
    if (resume) {
      fields.canceledAt = null;
      fields.cancelAtPeriodEnd = false;
    } else {
      fields.cancelAtPeriodEnd = true;
      fields.canceledAt = new Date().toISOString();
    }

    // Drop undefined keys so PostgREST doesn't reject the patch.
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    const { error } = await admin.from("profiles").update(clean).eq("id", profile.id);
    if (error) {
      console.error("cancel-subscription db:", error.message);
      return res.status(500).json({
        error: "Stripe was updated but saving to your account failed: " + error.message,
        stripeUpdated: true,
        cancelAtPeriodEnd: !!updated.cancel_at_period_end,
      });
    }

    await logBillingActivity(
      admin,
      profile.id,
      resume
        ? "Subscription resumed (cancel at period end cleared)"
        : `Subscription set to cancel at period end · Stripe ${subscriptionId}`
    );

    return res.status(200).json({
      ok: true,
      cancelAtPeriodEnd: clean.cancelAtPeriodEnd,
      currentPeriodEnd: clean.currentPeriodEnd,
      stripeSubscriptionId: subscriptionId,
    });
  } catch (e) {
    console.error("cancel-subscription:", e.message);
    return res.status(500).json({ error: e.message || "Could not update subscription" });
  }
}
