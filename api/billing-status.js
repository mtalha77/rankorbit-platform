import { stripeConfigured } from "../server/billing.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const configured = stripeConfigured();
  return res.status(200).json({
    configured,
    demo: false,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}
