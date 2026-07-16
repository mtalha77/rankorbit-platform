/** Free / no-Stripe plan activation removed — all plans require Stripe Checkout. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  return res.status(410).json({
    error: "There is no free plan. Configure Stripe and use Checkout to subscribe.",
  });
}
