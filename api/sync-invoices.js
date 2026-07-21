import {
  getAdmin,
  getStripe,
  stripeConfigured,
  readJson,
  requireClient,
  resolveSubscriptionId,
  syncInvoicesForCustomer,
  subscriptionFieldsFromStripe,
  updateProfileSubscriptionFields,
} from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  try {
    // Refresh subscription period / status from Stripe (fixes missing currentPeriodEnd).
    const { subscriptionId, subscription: existing } = await resolveSubscriptionId(stripe, admin, profile);
    if (subscriptionId) {
      const sub = existing || (await stripe.subscriptions.retrieve(subscriptionId));
      const fields = subscriptionFieldsFromStripe(sub, profile.plan);
      const { error: upErr } = await updateProfileSubscriptionFields(admin, profile.id, fields);
      if (upErr) console.error("sync-invoices profile:", upErr.message);
    }

    if (profile.stripeCustomerId) {
      await syncInvoicesForCustomer(stripe, admin, profile.stripeCustomerId, profile.id);
    }

    const { data: invoices, error } = await admin
      .from("invoices")
      .select("*")
      .eq("clientId", profile.id)
      .order("createdAt", { ascending: false })
      .limit(24);
    if (error) return res.status(500).json({ error: error.message });

    const { data: fresh } = await admin.from("profiles").select("*").eq("id", profile.id).maybeSingle();
    return res.status(200).json({
      synced: (invoices || []).length,
      invoices: invoices || [],
      profile: fresh || null,
      currentPeriodEnd: fresh?.currentPeriodEnd || null,
    });
  } catch (e) {
    console.error("sync-invoices:", e.message);
    return res.status(500).json({ error: e.message || "Could not sync invoices" });
  }
}
