// Stripe webhook → sync subscription + invoices into Supabase (service role).
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      STRIPE_PRICE_ESSENTIALS, STRIPE_PRICE_GROWTH, STRIPE_PRICE_PRO, STRIPE_PRICE_TEST_PLAN

import {
  getAdmin,
  getStripe,
  readRawBody,
  planFromPriceId,
  normalizePlanId,
  subscriptionFieldsFromStripe,
  updateProfileSubscriptionFields,
  upsertInvoice,
  syncInvoicesForCustomer,
} from "../server/billing.js";
import {
  notifyClient,
  notifyStaffRoute,
  notifySuperAdminsInApp,
  notifyManagersInApp,
  planLabel,
} from "../server/assign.js";
import {
  invoiceLooksPaid,
  notifyClientInvoicePaid,
  notifyStaffNewSubscription,
} from "../server/purchaseNotify.js";
import { onboardingHelpLine } from "../server/emailTemplate.js";
import { fulfillLandingCheckoutSession } from "../server/landingPayfirst.js";
import { SUPPORT_EMAIL } from "../server/legal.js";

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
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

/** Resolve client for invoice webhooks — includes Stripe customer fallback (race-safe). */
async function findProfileIdForInvoice(admin, stripe, invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  let metaUser =
    invoice.subscription_details?.metadata?.supabase_user_id || invoice.metadata?.supabase_user_id || null;
  let email = invoice.customer_email || null;

  if (!metaUser && invoice.subscription) {
    try {
      const subId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        metaUser = sub.metadata?.supabase_user_id || metaUser;
        email = email || sub.metadata?.email || null;
      }
    } catch {
      /* optional */
    }
  }

  let profileId = await findProfileId(admin, { userId: metaUser, customerId, email });
  if (profileId) return profileId;

  // invoice.paid often arrives before checkout writes stripeCustomerId — resolve via Stripe customer.
  if (customerId && stripe) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (cust && !cust.deleted) {
        const fromMeta = cust.metadata?.supabase_user_id || null;
        const fromEmail = cust.email || email || null;
        profileId = await findProfileId(admin, {
          userId: fromMeta,
          customerId,
          email: fromEmail,
        });
        if (profileId && customerId) {
          // Link for next webhooks so lookups are instant.
          await admin.from("profiles").update({ stripeCustomerId: customerId }).eq("id", profileId);
        }
      }
    } catch (e) {
      console.warn("findProfileIdForInvoice customer:", e.message);
    }
  }
  return profileId;
}

async function syncSubscription(admin, stripe, sub, hintPlan, { logActivity = false } = {}) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const metaUser = sub.metadata?.supabase_user_id;
  const planId = normalizePlanId(
    hintPlan || sub.metadata?.plan_id || planFromPriceId(sub.items?.data?.[0]?.price?.id)
  );
  const email = sub.metadata?.email || null;
  const profileId = await findProfileId(admin, { userId: metaUser, customerId, email });
  if (!profileId) {
    console.warn("No profile for subscription", sub.id);
    return null;
  }

  const fields = subscriptionFieldsFromStripe(sub, planId);
  fields.stripeCustomerId = customerId || undefined;

  // Scheduled switch lives only while Stripe still has an active subscription schedule.
  // After an on-the-spot upgrade we release the schedule — pendingPlanId must clear or
  // the UI keeps showing SCHEDULED even though Growth is already charged.
  const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
  const { data: existingRow } = await admin
    .from("profiles")
    .select("pendingPlanId")
    .eq("id", profileId)
    .maybeSingle();
  if (!scheduleId) {
    fields.pendingPlanId = null;
    fields.pendingPlanEffectiveAt = null;
  } else if (existingRow?.pendingPlanId && planId === normalizePlanId(existingRow.pendingPlanId)) {
    // Schedule rolled forward onto the pending price.
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

  const { error } = await updateProfileSubscriptionFields(admin, profileId, fields);
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

        const isLandingPayfirst = session.metadata?.source === "landing_payfirst";
        let userId = session.client_reference_id || session.metadata?.supabase_user_id || null;
        const planId = session.metadata?.plan_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        // Guest landing path: provision + attach plan (also claimable from success URL).
        if (isLandingPayfirst) {
          try {
            const fulfilled = await fulfillLandingCheckoutSession(admin, stripe, session);
            if (fulfilled.profileId) userId = fulfilled.profileId;
          } catch (e) {
            console.warn("landing_payfirst fulfill:", e.message);
          }
        }

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
              metadata: {
                ...(sub.metadata || {}),
                supabase_user_id: userId,
                plan_id: planId || "",
                ...(isLandingPayfirst ? { source: "landing_payfirst" } : {}),
              },
            });
          }
          if (userId) {
            sub.metadata = {
              ...(sub.metadata || {}),
              supabase_user_id: userId,
              plan_id: planId || sub.metadata?.plan_id || "",
            };
          }
          const profileId = await syncSubscription(admin, stripe, sub, planId, {
            logActivity: !isLandingPayfirst,
          });

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
            // Fresh retrieve — expanded copy at checkout is sometimes still open/unpaid.
            if (inv?.id) {
              try {
                inv = await stripe.invoices.retrieve(inv.id);
              } catch {
                /* keep prior */
              }
            }
            if (inv?.id) await upsertInvoice(admin, inv, profileId);
            else if (customerId) await syncInvoicesForCustomer(stripe, admin, customerId, profileId);
            // Staff FIRST (before client plan_subscribed) — avoids any dedupe confusion.
            try {
              await notifyStaffNewSubscription(admin, {
                clientId: profileId,
                planId,
                source: isLandingPayfirst ? "landing_payfirst" : "checkout",
              });
              if (isLandingPayfirst) {
                const { data: buyer } = await admin
                  .from("profiles")
                  .select("businessName,name,email,plan")
                  .eq("id", profileId)
                  .maybeSingle();
                const who = buyer?.businessName || buyer?.name || buyer?.email || "A client";
                const planName = planLabel(planId || buyer?.plan);
                const title = "Client details ready — payment complete";
                const body = `${who} completed landing checkout and paid for ${planName}.`;
                await notifyManagersInApp(admin, {
                  clientId: profileId,
                  type: "profile_complete",
                  title,
                  body,
                  meta: { source: "landing_payfirst", paymentPending: false },
                });
                await notifySuperAdminsInApp(admin, {
                  clientId: profileId,
                  type: "profile_complete",
                  title,
                  body,
                  meta: { source: "landing_payfirst", paymentPending: false },
                });
              }
            } catch (e) {
              console.warn("staff notify after checkout:", e.message);
            }
            try {
              await notifyClient(admin, {
                userId: profileId,
                clientId: profileId,
                type: "plan_subscribed",
                title: "Subscription active",
                body: `Your ${planLabel(planId)} is active. Thank you for subscribing — your dashboard is ready.\n\n${onboardingHelpLine()}`,
                meta: { planId: planId || null },
              });
            } catch (e) {
              console.warn("notify client after checkout:", e.message);
            }
            // Invoice receipt — force when Checkout already marked payment_status=paid
            // (latest_invoice status can still be open for a few seconds).
            try {
              const sessionPaid = session.payment_status === "paid";
              const sessionCents =
                typeof session.amount_total === "number" ? session.amount_total : null;
              if (inv?.id && (invoiceLooksPaid(inv) || sessionPaid)) {
                await notifyClientInvoicePaid(admin, inv, profileId, "checkout", {
                  force: sessionPaid && !invoiceLooksPaid(inv),
                  amountCents:
                    typeof inv.amount_paid === "number" && inv.amount_paid > 0
                      ? inv.amount_paid
                      : sessionCents,
                });
              } else if (sessionPaid && customerId) {
                const list = await stripe.invoices.list({
                  customer: customerId,
                  limit: 3,
                });
                const paidInv =
                  (list.data || []).find((x) => invoiceLooksPaid(x)) || list.data?.[0] || null;
                if (paidInv?.id) {
                  await upsertInvoice(admin, paidInv, profileId);
                  await notifyClientInvoicePaid(admin, paidInv, profileId, "checkout_list", {
                    force: true,
                    amountCents:
                      typeof paidInv.amount_paid === "number" && paidInv.amount_paid > 0
                        ? paidInv.amount_paid
                        : sessionCents,
                  });
                }
              }
            } catch (e) {
              console.warn("notify invoice after checkout:", e.message);
            }
          } else if (userId) {
            // syncSubscription missed profile — still alert staff so subscribe can't go silent.
            try {
              await notifyStaffNewSubscription(admin, {
                clientId: userId,
                planId,
                source: isLandingPayfirst ? "landing_payfirst" : "checkout_nolink",
              });
            } catch (e) {
              console.warn("staff notify checkout fallback:", e.message);
            }
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Sync profile; on *created*, also staff-notify if checkout alert was missed (deduped 24h).
        const sub = event.data.object;
        const syncedId = await syncSubscription(admin, stripe, sub, sub.metadata?.plan_id);
        if (event.type === "customer.subscription.created" && syncedId) {
          try {
            await notifyStaffNewSubscription(admin, {
              clientId: syncedId,
              planId: sub.metadata?.plan_id || null,
              source: "subscription.created",
            });
          } catch (e) {
            console.warn("staff notify subscription.created:", e.message);
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
      case "invoice.upcoming": {
        const invoice = event.data.object;
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
        const profileId = await findProfileId(admin, { userId: metaUser, customerId });
        if (profileId) {
          const amount =
            typeof invoice.amount_due === "number"
              ? `$${(invoice.amount_due / 100).toFixed(2)}`
              : "your subscription";
          const when = invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : invoice.period_end
              ? new Date(invoice.period_end * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "your next billing date";
          try {
            await notifyClient(admin, {
              userId: profileId,
              clientId: profileId,
              type: "renewal_reminder",
              title: "Upcoming renewal",
              body: `Reminder: your NAP Orbit subscription will renew for ${amount} on ${when}. Manage or cancel anytime under Plan & Billing. Questions: ${SUPPORT_EMAIL}.`,
              meta: { invoiceId: invoice.id || null, amountDue: invoice.amount_due ?? null },
            });
          } catch (e) {
            console.warn("notify invoice.upcoming:", e.message);
          }
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        let invoice = event.data.object;
        // Fresh retrieve so PDF / hosted URLs + paid status are present.
        if (invoice?.id) {
          try {
            invoice = await stripe.invoices.retrieve(invoice.id);
          } catch {
            /* keep event payload */
          }
        }
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const profileId = await findProfileIdForInvoice(admin, stripe, invoice);
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
            try {
              await notifyClientInvoicePaid(admin, invoice, profileId, "invoice.paid");
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
