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
  logBillingActivity,
  isPlanDowngrade,
} from "../server/billing.js";
import { notifyClient, notifyStaffRoute, planLabel } from "../server/assign.js";

async function releaseScheduleIfAny(stripe, sub) {
  const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
  if (!scheduleId) return;
  try {
    await stripe.subscriptionSchedules.release(scheduleId);
  } catch (e) {
    // Already released / completed — ignore
    if (!/released|canceled|not.*schedul/i.test(e.message || "")) {
      console.warn("release schedule:", e.message);
    }
  }
}

async function scheduleAtPeriodEnd(stripe, sub, priceId, planId, profileId) {
  const currentItem = sub.items?.data?.[0];
  const currentPriceId = currentItem?.price?.id;
  if (!currentPriceId) throw new Error("Subscription has no price");
  const periodEnd = sub.current_period_end || currentItem?.current_period_end;
  if (!periodEnd) throw new Error("Missing billing period end");

  let scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
  if (!scheduleId) {
    const created = await stripe.subscriptionSchedules.create({ from_subscription: sub.id });
    scheduleId = created.id;
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const phase0 = schedule.phases?.[0];
  if (!phase0) throw new Error("Could not read subscription schedule");

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentPriceId, quantity: 1 }],
        start_date: phase0.start_date,
        end_date: periodEnd,
      },
      {
        items: [{ price: priceId, quantity: 1 }],
        metadata: { plan_id: planId, supabase_user_id: profileId },
      },
    ],
    metadata: {
      ...(schedule.metadata || {}),
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

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { ...(sub.metadata || {}), supabase_user_id: profile.id, plan_id: planId },
      cancel_at_period_end: false,
    });

    const fields = subscriptionFieldsFromStripe(updated, planId);
    fields.canceledAt = null;
    fields.cancelAtPeriodEnd = false;
    fields.pendingPlanId = null;
    fields.pendingPlanEffectiveAt = null;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    const { error } = await admin.from("profiles").update(clean).eq("id", profile.id);
    if (error) {
      console.error("change-subscription db:", error.message);
      return res.status(500).json({ error: "Stripe updated but DB save failed: " + error.message });
    }

    await logBillingActivity(admin, profile.id, `Plan changed to ${planId} via Stripe`);

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
