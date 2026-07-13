import {
  getAdmin,
  getStripe,
  stripeConfigured,
  readJson,
  requireClient,
  syncInvoicesForCustomer,
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

  if (!profile.stripeCustomerId) {
    return res.status(200).json({ synced: 0, invoices: [] });
  }

  try {
    await syncInvoicesForCustomer(stripe, admin, profile.stripeCustomerId, profile.id);
    const { data, error } = await admin
      .from("invoices")
      .select("*")
      .eq("clientId", profile.id)
      .order("createdAt", { ascending: false })
      .limit(24);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ synced: (data || []).length, invoices: data || [] });
  } catch (e) {
    console.error("sync-invoices:", e.message);
    return res.status(500).json({ error: e.message || "Could not sync invoices" });
  }
}
