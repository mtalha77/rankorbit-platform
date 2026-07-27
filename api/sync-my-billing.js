/**
 * Logged-in client: if profile has no plan, try to attach an active Stripe subscription
 * for the same email (covers pay-first → later signup/login without webhook).
 * Body: { token }
 */
import { getAdmin, getStripe, stripeConfigured, readJson, requireClient } from "../server/billing.js";
import { linkStripeSubscriptionByEmail } from "../server/landingPayfirst.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const result = await linkStripeSubscriptionByEmail(
      admin,
      stripe,
      auth.profile.id,
      auth.profile.email
    );
    if (result.linked) {
      const { data: prof } = await admin.from("profiles").select("*").eq("id", auth.profile.id).maybeSingle();
      return res.status(200).json({ ok: true, linked: true, plan: result.plan, profile: prof });
    }
    return res.status(200).json({
      ok: true,
      linked: false,
      already: !!result.already,
      plan: result.plan || auth.profile.plan || null,
    });
  } catch (e) {
    console.error("sync-my-billing:", e.message);
    return res.status(500).json({ error: e.message || "Sync failed" });
  }
}
