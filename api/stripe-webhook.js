// Stripe webhook → sync subscription + invoices into Supabase (service role).
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      STRIPE_PRICE_ESSENTIALS, STRIPE_PRICE_GROWTH, STRIPE_PRICE_GMB

import {
  getAdmin,
  getStripe,
  readRawBody,
  planFromPriceId,
  subscriptionFieldsFromStripe,
  upsertInvoice,
  syncInvoicesForCustomer,
} from "../server/billing.js";
import { autoAssignLeastLoadedAgent } from "../server/assign.js";

export const config = { api: { bodyParser: false } };

async function findProfileId(admin, { userId, customerId, email }) {
  if (userId) {
    const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (data?.id) return data.id;
  }
  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripeCustomerId", customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (email) {
    const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

async function syncSubscription(admin, stripe, sub, hintPlan) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const metaUser = sub.metadata?.supabase_user_id;
  const planId = hintPlan || sub.metadata?.plan_id || planFromPriceId(sub.items?.data?.[0]?.price?.id);
  const profileId = await findProfileId(admin, { userId: metaUser, customerId });
  if (!profileId) {
    console.warn("No profile for subscription", sub.id);
    return;
  }

  const fields = subscriptionFieldsFromStripe(sub, planId);
  fields.stripeCustomerId = customerId || undefined;

  // Enrich card last4 from default payment method when available.
  try {
    const pmId =
      typeof sub.default_payment_method === "string"
        ? sub.default_payment_method
        : sub.default_payment_method?.id;
    if (pmId) {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm.card) {
        fields.cardBrand = pm.card.brand || null;
        fields.cardLast4 = pm.card.last4 || null;
      }
    }
  } catch {
    /* optional */
  }

  // Clear subscription linkage when fully deleted/canceled without period access.
  if (sub.status === "canceled" && !sub.cancel_at_period_end) {
    const ended =
      !sub.current_period_end || sub.current_period_end * 1000 <= Date.now();
    if (ended) {
      fields.plan = null;
      fields.stripeSubscriptionId = null;
      fields.stripePriceId = null;
      fields.subscriptionStatus = "canceled";
      fields.cancelAtPeriodEnd = false;
    }
  }

  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  const { error } = await admin.from("profiles").update(clean).eq("id", profileId);
  if (error) throw new Error(error.message);

  await admin.from("activity").insert({
    id: `a${Date.now()}${Math.floor(Math.random() * 1000)}`,
    clientId: profileId,
    type: "submitted",
    desc: `Stripe: subscription ${sub.status}${planId ? ` · ${planId}` : ""}`,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    by: "Stripe",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const stripe = getStripe();
  const admin = getAdmin();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !admin || !webhookSecret) {
    console.error("Missing Stripe/Supabase env for webhook");
    return res.status(500).send("Server not configured");
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: skip if we already processed this event id.
  const { error: insertErr } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (insertErr) {
    if (insertErr.code === "23505" || /duplicate|unique/i.test(insertErr.message || "")) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    console.error("stripe_events insert:", insertErr.message);
    return res.status(500).send("Event log failed");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (userId && customerId) {
          await admin
            .from("profiles")
            .update({ stripeCustomerId: customerId })
            .eq("id", userId);
        }

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ["default_payment_method", "latest_invoice"],
          });
          if (userId && !sub.metadata?.supabase_user_id) {
            await stripe.subscriptions.update(subId, {
              metadata: { ...(sub.metadata || {}), supabase_user_id: userId, plan_id: planId || "" },
            });
          }
          await syncSubscription(admin, stripe, sub, planId);

          // Persist the first invoice immediately (don't wait only on invoice.* webhooks).
          const profileId = await findProfileId(admin, {
            userId: userId || sub.metadata?.supabase_user_id,
            customerId,
          });
          if (profileId) {
            let inv = sub.latest_invoice;
            if (typeof inv === "string") {
              try {
                inv = await stripe.invoices.retrieve(inv);
              } catch {
                inv = null;
              }
            }
            if (inv?.id) await upsertInvoice(admin, inv, profileId);
            else if (customerId) await syncInvoicesForCustomer(stripe, admin, customerId, profileId);
            try {
              await autoAssignLeastLoadedAgent(admin, profileId);
            } catch (e) {
              console.warn("auto-assign after checkout:", e.message);
            }
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        await syncSubscription(admin, stripe, sub, sub.metadata?.plan_id);
        // Safety net: assign BDM whenever a paid subscription becomes active.
        if (sub.status === "active" || sub.status === "trialing") {
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          const profileId = await findProfileId(admin, {
            userId: sub.metadata?.supabase_user_id,
            customerId,
          });
          if (profileId) {
            try {
              await autoAssignLeastLoadedAgent(admin, profileId);
            } catch (e) {
              console.warn("auto-assign after subscription event:", e.message);
            }
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const profileId = await findProfileId(admin, {
          userId: sub.metadata?.supabase_user_id,
          customerId,
        });
        if (profileId) {
          await admin
            .from("profiles")
            .update({
              plan: null,
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionStatus: "canceled",
              cancelAtPeriodEnd: false,
              canceledAt: new Date().toISOString(),
            })
            .eq("id", profileId);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        let invoice = event.data.object;
        // Fresh retrieve so PDF / hosted URLs are present (some event payloads omit them).
        if (invoice?.id && (!invoice.invoice_pdf || !invoice.hosted_invoice_url)) {
          try {
            invoice = await stripe.invoices.retrieve(invoice.id);
          } catch {
            /* keep event payload */
          }
        }
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        let metaUser =
          invoice.subscription_details?.metadata?.supabase_user_id || invoice.metadata?.supabase_user_id;
        if (!metaUser && invoice.subscription) {
          try {
            const subId =
              typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              metaUser = sub.metadata?.supabase_user_id;
            }
          } catch {
            /* optional */
          }
        }
        const profileId = await findProfileId(admin, {
          userId: metaUser,
          customerId,
        });
        if (profileId) {
          await upsertInvoice(admin, invoice, profileId);
          if (event.type === "invoice.payment_failed") {
            await admin
              .from("profiles")
              .update({ subscriptionStatus: "past_due" })
              .eq("id", profileId);
          }
        } else {
          console.warn("No profile for invoice", invoice.id, customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handler error:", e.message);
    // Delete event row so Stripe retry can reprocess
    await admin.from("stripe_events").delete().eq("id", event.id);
    return res.status(500).send("Handler error");
  }

  return res.status(200).json({ received: true });
}
