/**
 * After Stripe redirect: claim a landing_payfirst Checkout Session.
 * Creates/links account + plan even if the webhook is delayed/missing.
 * Body: { sessionId, resend?: boolean }
 * Set-password email is sent once per session (deduped); pass resend:true to force another.
 */
import { getAdmin, getStripe, stripeConfigured, readJson } from "../server/billing.js";
import {
  fulfillLandingCheckoutSession,
  sendLandingSetPasswordEmailOnce,
} from "../server/landingPayfirst.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  let sessionId = null;
  let resend = false;
  if (req.method === "GET") {
    sessionId = req.query?.session_id || req.query?.sessionId || null;
    resend = req.query?.resend === "1" || req.query?.resend === "true";
  } else {
    const body = await readJson(req);
    sessionId = body.sessionId || body.session_id || null;
    resend = !!body.resend;
  }
  sessionId = String(sessionId || "").trim();
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Missing checkout session id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillLandingCheckoutSession(admin, stripe, session);
    if (result.error) {
      return res.status(400).json({ error: result.error, email: result.email || null });
    }

    let passwordEmailSent = false;
    let passwordEmailSkipped = false;
    if (result.email) {
      try {
        const mail = await sendLandingSetPasswordEmailOnce(admin, sessionId, result.email, result.name, {
          force: resend,
        });
        passwordEmailSent = !!mail?.sent;
        passwordEmailSkipped = !!mail?.skipped;
      } catch (e) {
        console.warn("claim-landing-checkout password email:", e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      email: result.email,
      plan: result.plan,
      created: result.created,
      passwordEmailSent,
      passwordEmailSkipped,
      message: passwordEmailSent
        ? "Payment linked. Check your email to set your password, then sign in."
        : passwordEmailSkipped
          ? "Payment linked. We already sent your password email — check inbox/spam, or tap Resend."
          : "Payment linked. Sign in if you already have a password, or use Forgot password.",
    });
  } catch (e) {
    console.error("claim-landing-checkout:", e.message);
    return res.status(500).json({ error: e.message || "Could not claim checkout" });
  }
}
