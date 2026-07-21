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
import {
  autoAssignLeastLoadedAgent,
  notifyClient,
  notifyStaffRoute,
  notifySuperAdminsInApp,
  notifyManagersInApp,
  planLabel,
} from "../server/assign.js";

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

async function syncSubscription(admin, stripe, sub, hintPlan, { logActivity = false } = {}) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const metaUser = sub.metadata?.supabase_user_id;
  const planId = hintPlan || sub.metadata?.plan_id || planFromPriceId(sub.items?.data?.[0]?.price?.id);
  const profileId = await findProfileId(admin, { userId: metaUser, customerId });
  if (!profileId) {
    console.warn("No profile for subscription", sub.id);
    return null;
  }

  const fields = subscriptionFieldsFromStripe(sub, planId);
  fields.stripeCustomerId = customerId || undefined;

  // Clear scheduled switch only when Stripe is actually on the pending plan.
  const { data: existingRow } = await admin
    .from("profiles")
    .select("pendingPlanId")
    .eq("id", profileId)
    .maybeSingle();
  if (existingRow?.pendingPlanId && planId === existingRow.pendingPlanId) {
    fields.pendingPlanId = null;
    fields.pendingPlanEffectiveAt = null;
  }
  // Successful recovery — clear payment grace.
  if (sub.status === "active" || sub.status === "trialing") {
    fields.paymentFailedAt = null;
    fields.paymentGraceEndsAt = null;
  }

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

  if (logActivity) {
    await admin.from("activity").insert({
      id: `a${Date.now()}${Math.floor(Math.random() * 1000)}`,
      clientId: profileId,
      type: "submitted",
      desc: `Stripe: subscription ${sub.status}${planId ? ` · ${planId}` : ""}`,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      by: "Stripe",
    });
  }

  return profileId;
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
          const profileId = await syncSubscription(admin, stripe, sub, planId, { logActivity: true });

          // Persist the first invoice immediately (don't wait only on invoice.* webhooks).
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
              await notifyClient(admin, {
                userId: profileId,
                clientId: profileId,
                type: "plan_subscribed",
                title: "Subscription active",
                body: `Your ${planLabel(planId)} plan is active. Thank you for subscribing — your dashboard is ready.`,
                meta: { planId: planId || null },
              });
              await notifyStaffRoute(admin, {
                kind: "onboard",
                title: `New subscription · ${planLabel(planId)}`,
                body: `Client ${profileId} subscribed to ${planLabel(planId)}.`,
              });
            } catch (e) {
              console.warn("notify after checkout:", e.message);
            }
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
        // Profile sync only — assign/notify/activity stay on checkout to avoid duplicates.
        const sub = event.data.object;
        await syncSubscription(admin, stripe, sub, sub.metadata?.plan_id);
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
          try {
            await notifyClient(admin, {
              userId: profileId,
              clientId: profileId,
              type: "plan_cancelled",
              title: "Subscription ended",
              body: "Your subscription has ended. You can resubscribe anytime from Billing in your dashboard.",
              meta: {},
            });
            await notifyStaffRoute(admin, {
              kind: "cancel",
              title: "Subscription ended",
              body: `Client ${profileId} subscription fully canceled.`,
            });
          } catch (e) {
            console.warn("notify after subscription deleted:", e.message);
          }
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
            const { data: prof } = await admin
              .from("profiles")
              .select("id,businessName,name,email,paymentFailedAt,paymentGraceEndsAt")
              .eq("id", profileId)
              .maybeSingle();
            const now = new Date();
            const gracePatch = { subscriptionStatus: "past_due" };
            // Start 5-day grace once; Stripe retries must not reset the window.
            const hasActiveGrace =
              prof?.paymentGraceEndsAt && new Date(prof.paymentGraceEndsAt).getTime() >= now.getTime();
            if (!hasActiveGrace) {
              gracePatch.paymentFailedAt = now.toISOString();
              gracePatch.paymentGraceEndsAt = new Date(now.getTime() + 5 * 86400000).toISOString();
            }
            await admin.from("profiles").update(gracePatch).eq("id", profileId);

            const graceEnd = gracePatch.paymentGraceEndsAt || prof?.paymentGraceEndsAt;
            const graceLabel = graceEnd
              ? new Date(graceEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "in 5 days";
            const who = prof?.businessName || prof?.name || prof?.email || profileId;

            try {
              await notifyClient(admin, {
                userId: profileId,
                clientId: profileId,
                type: "payment_failed",
                title: "Payment failed",
                body: `We couldn't charge your card. Your plan stays active until ${graceLabel}. Update your payment method under Plan & Billing to avoid interruption.`,
                meta: { invoiceId: invoice.id || null, graceEndsAt: graceEnd || null },
              });
              await notifySuperAdminsInApp(admin, {
                clientId: profileId,
                type: "payment_failed",
                title: "Client payment failed",
                body: `${who} — payment failed. 5-day grace until ${graceLabel}.`,
                meta: { invoiceId: invoice.id || null, clientId: profileId },
              });
              await notifyManagersInApp(admin, {
                clientId: profileId,
                type: "payment_failed",
                title: "Client payment failed",
                body: `${who} — payment failed. Grace until ${graceLabel}.`,
                meta: { invoiceId: invoice.id || null, clientId: profileId },
              });
              await notifyStaffRoute(admin, {
                kind: "system",
                title: "Payment failed",
                body: `Payment failed for ${who}. Invoice ${invoice.id || ""}. Grace until ${graceLabel}.`,
              });
            } catch (e) {
              console.warn("notify payment_failed:", e.message);
            }
          }
          if (event.type === "invoice.paid") {
            await admin
              .from("profiles")
              .update({ paymentFailedAt: null, paymentGraceEndsAt: null })
              .eq("id", profileId);
            const amount =
              typeof invoice.amount_paid === "number"
                ? `$${(invoice.amount_paid / 100).toFixed(2)}`
                : "your invoice";
            const invUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
            try {
              await notifyClient(admin, {
                userId: profileId,
                clientId: profileId,
                type: "invoice_paid",
                title: "Payment received",
                body: `Thanks — we received ${amount}.${invUrl ? ` View invoice: ${invUrl}` : " You can download invoices from Billing anytime."}`,
                meta: { invoiceId: invoice.id || null, hostedInvoiceUrl: invUrl },
              });
            } catch (e) {
              console.warn("notify invoice_paid:", e.message);
            }
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
