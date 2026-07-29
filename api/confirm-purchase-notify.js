/**
 * Client backup after Checkout return (?billing=success) or first plan sync.
 * Ensures staff (SA/manager) + client invoice "Payment received" even if Stripe
 * webhooks were late/missed. All paths are deduped.
 * Body: { token }
 */
import {
  getAdmin,
  getStripe,
  stripeConfigured,
  readJson,
  requireClient,
  syncInvoicesForCustomer,
} from "../server/billing.js";
import { linkStripeSubscriptionByEmail } from "../server/landingPayfirst.js";
import { notifyClient, planLabel } from "../server/assign.js";
import { onboardingHelpLine } from "../server/emailTemplate.js";
import {
  invoiceLooksPaid,
  notifyClientInvoicePaid,
  notifyStaffNewSubscription,
} from "../server/purchaseNotify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token } = await readJson(req);
  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  let profile = auth.profile;
  const stripe = stripeConfigured() ? getStripe() : null;

  // Attach plan from Stripe if webhook hasn't written it yet.
  if (stripe && (!profile.plan || !profile.stripeCustomerId)) {
    try {
      await linkStripeSubscriptionByEmail(admin, stripe, profile.id, profile.email);
      const { data: refreshed } = await admin
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .maybeSingle();
      if (refreshed) profile = refreshed;
    } catch (e) {
      console.warn("confirm-purchase link:", e.message);
    }
  }

  if (!profile.plan && !profile.stripeCustomerId && !profile.stripeSubscriptionId) {
    return res.status(200).json({ ok: true, skipped: "no_plan_yet" });
  }

  const out = { ok: true, staff: null, invoice: null, plan: null };

  // Client "Subscription active" (deduped inside notifyClient).
  try {
    out.plan = await notifyClient(admin, {
      userId: profile.id,
      clientId: profile.id,
      type: "plan_subscribed",
      title: "Subscription active",
      body: `Your ${planLabel(profile.plan)} is active. Thank you for subscribing — your dashboard is ready.\n\n${onboardingHelpLine()}`,
      meta: { planId: profile.plan || null, source: "confirm_purchase" },
      allowEmailRetry: false,
    });
  } catch (e) {
    console.warn("confirm-purchase plan:", e.message);
  }

  // Staff in-app + email (deduped on staff audience only).
  try {
    out.staff = await notifyStaffNewSubscription(admin, {
      clientId: profile.id,
      planId: profile.plan,
      source: "confirm_purchase",
      subscriptionId: profile.stripeSubscriptionId || null,
    });
  } catch (e) {
    console.warn("confirm-purchase staff:", e.message);
    out.staff = { notified: false, reason: e.message };
  }

  // Invoice receipt from Stripe (force — status lag safe).
  if (stripe && profile.stripeCustomerId) {
    try {
      await syncInvoicesForCustomer(stripe, admin, profile.stripeCustomerId, profile.id);
      const list = await stripe.invoices.list({
        customer: profile.stripeCustomerId,
        limit: 5,
      });
      const paidInv =
        (list.data || []).find((x) => invoiceLooksPaid(x)) ||
        (list.data || []).find((x) => x.status === "open" || x.status === "paid") ||
        null;
      if (paidInv?.id) {
        out.invoice = await notifyClientInvoicePaid(admin, paidInv, profile.id, "confirm_purchase", {
          force: true,
          amountCents:
            typeof paidInv.amount_paid === "number" && paidInv.amount_paid > 0
              ? paidInv.amount_paid
              : typeof paidInv.amount_due === "number"
                ? paidInv.amount_due
                : null,
        });
      } else {
        out.invoice = { notified: false, reason: "no_invoice" };
      }
    } catch (e) {
      console.warn("confirm-purchase invoice:", e.message);
      out.invoice = { notified: false, reason: e.message };
    }
  } else {
    out.invoice = { notified: false, reason: "no_stripe_customer" };
  }

  return res.status(200).json(out);
}
