import {
  getAdmin,
  getStripe,
  stripeConfigured,
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

  const { token, returnOrigin } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  try {
    const customerId = await ensureStripeCustomer(stripe, admin, profile);
    const base = returnBase(req, returnOrigin);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/dashboard?billing=portal`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("create-portal-session:", e.message);
    return res.status(500).json({ error: e.message || "Could not open billing portal" });
  }
}
