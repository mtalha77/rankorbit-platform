/**
 * Guest landing pay-first checkout (no JWT).
 * Body: planId + profile fields (name, email, businessName, phone, address, city, state, zip, category, …)
 * Creates Stripe Checkout; account is created on webhook after payment.
 */
import {
  getAdmin,
  getStripe,
  stripeConfigured,
  isValidPlanId,
  normalizePlanId,
  priceIdForPlan,
  returnBase,
  readJson,
} from "../server/billing.js";
import { metaFromLandingFields, validateLandingFields } from "../server/landingPayfirst.js";
import { clientIp, clientUserAgent, logAccessEvent, recordConsent } from "../server/accessLog.js";
import { TOS_VERSION, PRIVACY_VERSION } from "../server/legal.js";
import {
  notifyManagersInApp,
  notifySuperAdminsInApp,
  emailManagersAndSuperAdmins,
  notifyStaffRoute,
  planLabel,
} from "../server/assign.js";

/** Staff alert when landing form is submitted (before Stripe payment). Never throws to caller. */
async function notifyStaffLandingFormPending(admin, { clientId, email, business, planId }) {
  if (!admin || !email) return;
  const emailNorm = String(email).trim().toLowerCase();
  const planName = planLabel(planId);
  const who = business || emailNorm;
  const title = "Client details ready — payment pending";
  const body = `${who} filled the landing checkout form for ${planName}. Payment is still pending.`;

  // Dedupe: same email (guest) or same clientId within 24h.
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: prior } = await admin
      .from("notifications")
      .select("id,clientId,meta")
      .eq("type", "profile_complete")
      .gte("createdAt", since)
      .limit(60);
    const hit = (prior || []).some((n) => {
      if (clientId && n.clientId === clientId) return true;
      const metaEmail = String(n?.meta?.email || "").trim().toLowerCase();
      return metaEmail && metaEmail === emailNorm && n?.meta?.paymentPending === true;
    });
    if (hit) return { skipped: "already_notified" };
  } catch (e) {
    console.warn("landing-checkout staff dedupe:", e.message);
  }

  const payload = {
    clientId: clientId || null,
    type: "profile_complete",
    title,
    body,
    meta: {
      source: "landing_checkout",
      paymentPending: true,
      email: emailNorm,
      planId: planId || null,
    },
  };

  try {
    await notifyManagersInApp(admin, payload);
    await notifySuperAdminsInApp(admin, payload);
  } catch (e) {
    console.warn("landing-checkout staff in-app:", e.message);
  }

  // Same email route that works for plan-change (control panel recipients).
  try {
    await notifyStaffRoute(admin, { kind: "planChange", title, body });
  } catch (e) {
    console.warn("landing-checkout notifyStaffRoute:", e.message);
  }

  try {
    await emailManagersAndSuperAdmins(admin, {
      routeKey: "routeOnboard",
      title,
      body,
    });
  } catch (e) {
    console.warn("landing-checkout staff email:", e.message);
  }

  return { notified: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  if (!body?.acceptedTerms) {
    return res.status(400).json({ error: "You must accept the Terms & Conditions before checkout." });
  }
  const planId = normalizePlanId(body.planId);
  if (!isValidPlanId(body.planId)) return res.status(400).json({ error: "Invalid plan" });
  const priceId = priceIdForPlan(planId);
  if (!priceId) return res.status(500).json({ error: "Price ID missing for plan" });

  const fields = validateLandingFields(body);
  if (fields.error) return res.status(400).json({ error: fields.error });

  const emailNorm = fields.email;
  const ip = clientIp(req);
  const ua = clientUserAgent(req);

  try {
    const { data: existing } = await admin
      .from("profiles")
      .select("id,role,subscriptionStatus,stripeSubscriptionId,stripeCustomerId,plan")
      .eq("email", emailNorm)
      .maybeSingle();

    if (existing && existing.role && existing.role !== "client") {
      return res.status(409).json({
        error: "This email belongs to a staff account. Use a different email or the staff portal.",
      });
    }

    if (
      existing &&
      existing.stripeSubscriptionId &&
      ["active", "trialing", "past_due"].includes(existing.subscriptionStatus)
    ) {
      return res.status(409).json({
        error: "An account with this email already has a subscription. Please sign in.",
        accountExists: true,
      });
    }

    const meta = metaFromLandingFields(fields, planId);
    const base = returnBase(req, body.returnOrigin);
    const sessionParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/?billing=success&plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?focus=pricing&billing=cancel&plan=${encodeURIComponent(planId)}`,
      metadata: meta,
      subscription_data: {
        metadata: {
          source: "landing_payfirst",
          plan_id: planId,
          email: emailNorm,
        },
      },
      allow_promotion_codes: true,
    };

    if (existing?.stripeCustomerId) {
      sessionParams.customer = existing.stripeCustomerId;
      sessionParams.client_reference_id = existing.id;
      sessionParams.metadata.supabase_user_id = existing.id;
      sessionParams.subscription_data.metadata.supabase_user_id = existing.id;
    } else {
      sessionParams.customer_email = emailNorm;
      if (existing?.id) {
        sessionParams.client_reference_id = existing.id;
        sessionParams.metadata.supabase_user_id = existing.id;
        sessionParams.subscription_data.metadata.supabase_user_id = existing.id;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await recordConsent(admin, {
      userId: existing?.id || null,
      email: emailNorm,
      ip,
      userAgent: ua,
      source: "checkout",
      checkboxConfirmed: true,
      tosVersion: TOS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      meta: { planId, stripeSessionId: session.id, source: "landing_payfirst" },
    });
    await logAccessEvent(admin, {
      userId: existing?.id || null,
      email: emailNorm,
      eventType: "checkout",
      ip,
      userAgent: ua,
      meta: { planId, stripeSessionId: session.id, source: "landing_payfirst" },
    });

    // Form filled → Stripe redirect: alert SA/managers (payment still pending).
    // Must not block checkout URL if notify fails.
    try {
      await notifyStaffLandingFormPending(admin, {
        clientId: existing?.id || null,
        email: emailNorm,
        business: fields.businessName || fields.name || emailNorm,
        planId,
      });
    } catch (e) {
      console.warn("landing-checkout staff notify:", e.message);
    }

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("landing-checkout:", e.message);
    return res.status(500).json({ error: e.message || "Checkout failed" });
  }
}
