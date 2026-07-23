import {
  getAdmin,
  getStripe,
  stripeConfigured,
  PLAN_IDS,
  priceIdForPlan,
  readJson,
  requireClient,
  resolveSubscriptionId,
  subscriptionFieldsFromStripe,
  updateProfileSubscriptionFields,
  logBillingActivity,
  isPlanDowngrade,
  syncInvoicesForCustomer,
} from "../server/billing.js";
import { notifyClient, notifyStaffRoute, planLabel } from "../server/assign.js";

async function releaseScheduleIfAny(stripe, sub) {
  const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
  if (!scheduleId) return;
  try {
    const sch = await stripe.subscriptionSchedules.retrieve(scheduleId);
    if (["released", "canceled", "completed"].includes(sch.status)) return;
    await stripe.subscriptionSchedules.release(scheduleId);
  } catch (e) {
    // Already released / completed — ignore; try cancel as fallback
    try {
      await stripe.subscriptionSchedules.cancel(scheduleId);
    } catch (e2) {
      const msg = `${e.message || ""} ${e2.message || ""}`;
      if (!/released|canceled|completed|not.*schedul/i.test(msg)) {
        console.warn("release schedule:", e.message);
      }
    }
  }
}

/**
 * Schedule a price change at current_period_end.
 * Always rebuilds the schedule: after renewals / test-clock advances, updating
 * an existing schedule's phase 0 fails with "phase that has already ended".
 */
async function scheduleAtPeriodEnd(stripe, sub, priceId, planId, profileId) {
  const currentItem = sub.items?.data?.[0];
  const currentPriceId = currentItem?.price?.id;
  if (!currentPriceId) throw new Error("Subscription has no price");
  const periodEnd = sub.current_period_end || currentItem?.current_period_end;
  if (!periodEnd) throw new Error("Missing billing period end");

  const nowSec = Math.floor(Date.now() / 1000);
  if (periodEnd <= nowSec) {
    throw new Error("Current billing period has already ended. Refresh billing and try again.");
  }

  // Drop any stale schedule (ended phases from prior renewals), then create fresh.
  await releaseScheduleIfAny(stripe, sub);
  const fresh = await stripe.subscriptions.retrieve(sub.id);
  const created = await stripe.subscriptionSchedules.create({ from_subscription: fresh.id });
  const scheduleId = created.id;

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentPriceId, quantity: 1 }],
        start_date: "now",
        end_date: periodEnd,
      },
      {
        items: [{ price: priceId, quantity: 1 }],
        metadata: { plan_id: planId, supabase_user_id: profileId },
      },
    ],
    metadata: {
      ...(created.metadata || {}),
      pending_plan_id: planId,
      supabase_user_id: profileId,
    },
  });

  return new Date(periodEnd * 1000).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured yet" });

  const admin = getAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const { token, planId, when = "now", action } = body;

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { profile } = auth;

  try {
    const { subscriptionId, subscription: existing } = await resolveSubscriptionId(stripe, admin, profile);
    if (!subscriptionId) {
      return res.status(400).json({ error: "No active subscription to change. Subscribe first." });
    }
    const sub = existing || (await stripe.subscriptions.retrieve(subscriptionId));

    if (["unpaid", "incomplete", "incomplete_expired"].includes(sub.status)) {
      return res.status(400).json({ error: "Fix your payment method before changing plans." });
    }

    // Cancel a scheduled (next-period) plan change
    if (action === "cancel_pending") {
      await releaseScheduleIfAny(stripe, sub);
      await admin
        .from("profiles")
        .update({ pendingPlanId: null, pendingPlanEffectiveAt: null })
        .eq("id", profile.id);
      await logBillingActivity(admin, profile.id, "Canceled scheduled plan change");
      return res.status(200).json({ ok: true, canceledPending: true });
    }

    if (!PLAN_IDS.includes(planId)) return res.status(400).json({ error: "Invalid plan" });
    const priceId = priceIdForPlan(planId);
    if (!priceId) return res.status(500).json({ error: "Price ID missing for plan" });

    const currentPriceId = sub.items?.data?.[0]?.price?.id;
    if (currentPriceId === priceId && !profile.pendingPlanId) {
      return res.status(400).json({ error: "You are already on this plan." });
    }

    // Downgrades cannot apply on the spot — always next billing period.
    const downgrade = isPlanDowngrade(profile.plan, planId);
    let timing = when === "period_end" ? "period_end" : "now";
    if (downgrade) timing = "period_end";

    if (timing === "period_end") {
      const effectiveAt = await scheduleAtPeriodEnd(stripe, sub, priceId, planId, profile.id);
      await admin
        .from("profiles")
        .update({
          pendingPlanId: planId,
          pendingPlanEffectiveAt: effectiveAt,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        })
        .eq("id", profile.id);

      await logBillingActivity(admin, profile.id, `Plan change to ${planId} scheduled for period end`);

      try {
        await notifyClient(admin, {
          userId: profile.id,
          clientId: profile.id,
          type: "plan_changed",
          title: "Plan change scheduled",
          body: `You'll switch to ${planLabel(planId)} on ${new Date(effectiveAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Until then you keep your current plan.`,
          meta: { planId, when: "period_end", effectiveAt },
        });
        await notifyStaffRoute(admin, {
          kind: "planChange",
          title: `Plan scheduled → ${planLabel(planId)}`,
          body: `${profile.businessName || profile.name || profile.email} scheduled ${planLabel(planId)} for next billing period.`,
        });
      } catch (e) {
        console.warn("notify scheduled plan:", e.message);
      }

      return res.status(200).json({ ok: true, plan: profile.plan, pendingPlanId: planId, when: "period_end", effectiveAt });
    }

    // Change now (proration)
    await releaseScheduleIfAny(stripe, await stripe.subscriptions.retrieve(subscriptionId));

    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return res.status(500).json({ error: "Subscription has no items" });

    // always_invoice = create prorations AND finalize/charge a separate invoice now
    // (create_prorations alone only parks items until the next renewal — history looks "stuck").
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "always_invoice",
      metadata: { ...(sub.metadata || {}), supabase_user_id: profile.id, plan_id: planId },
      cancel_at_period_end: false,
    });

    const fields = subscriptionFieldsFromStripe(updated, planId);
    fields.canceledAt = null;
    fields.cancelAtPeriodEnd = false;
    fields.pendingPlanId = null;
    fields.pendingPlanEffectiveAt = null;
    const { error } = await updateProfileSubscriptionFields(admin, profile.id, fields);
    if (error) {
      console.error("change-subscription db:", error.message);
      return res.status(500).json({ error: "Stripe updated but DB save failed: " + error.message });
    }

    await logBillingActivity(admin, profile.id, `Plan changed to ${planId} via Stripe`);

    // Mirror newest invoices (incl. prorated plan-change charge) into Supabase.
    try {
      await syncInvoicesForCustomer(stripe, admin, profile.stripeCustomerId, profile.id);
    } catch (e) {
      console.warn("change-subscription sync invoices:", e.message);
    }

    try {
      await notifyClient(admin, {
        userId: profile.id,
        clientId: profile.id,
        type: "plan_changed",
        title: "Plan updated",
        body: `Your plan is now ${planLabel(planId)}. Unused time on your previous plan was credited; any difference is prorated on your invoice.`,
        meta: { planId, when: "now" },
      });
      await notifyStaffRoute(admin, {
        kind: "planChange",
        title: `Plan changed → ${planLabel(planId)}`,
        body: `${profile.businessName || profile.name || profile.email} switched to ${planLabel(planId)}.`,
      });
    } catch (e) {
      console.warn("notify plan change:", e.message);
    }

    return res.status(200).json({ ok: true, plan: planId, when: "now" });
  } catch (e) {
    console.error("change-subscription:", e.message);
    return res.status(500).json({ error: e.message || "Could not change plan" });
  }
}
