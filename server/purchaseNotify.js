/**
 * Shared first-purchase notify helpers (webhook + client confirm-purchase backup).
 */
import {
  notifyClient,
  notifyStaffRoute,
  notifySuperAdminsInApp,
  notifyManagersInApp,
  emailManagersAndSuperAdmins,
  planLabel,
} from "./assign.js";

/** True when Stripe invoice is (or was) successfully charged. */
export function invoiceLooksPaid(inv) {
  if (!inv?.id) return false;
  if (inv.status === "paid" || inv.paid === true) return true;
  if (
    typeof inv.amount_paid === "number" &&
    inv.amount_paid > 0 &&
    inv.status !== "void" &&
    inv.status !== "uncollectible" &&
    inv.status !== "draft"
  ) {
    return true;
  }
  return false;
}

/**
 * In-app + email "Payment received" for a paid invoice.
 * Deduped in notifyClient by meta.invoiceId.
 */
export async function notifyClientInvoicePaid(admin, invoice, profileId, source = "stripe", opts = {}) {
  const { force = false, amountCents = null } = opts;
  if (!admin || !profileId || !invoice?.id) {
    return { notified: false, reason: "not_paid_or_missing" };
  }
  if (!force && !invoiceLooksPaid(invoice)) {
    return { notified: false, reason: "not_paid_or_missing" };
  }
  const cents =
    typeof amountCents === "number"
      ? amountCents
      : typeof invoice.amount_paid === "number" && invoice.amount_paid > 0
        ? invoice.amount_paid
        : typeof invoice.amount_due === "number"
          ? invoice.amount_due
          : null;
  const amount = cents != null ? `$${(cents / 100).toFixed(2)}` : "your invoice";
  const invUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
  return notifyClient(admin, {
    userId: profileId,
    clientId: profileId,
    type: "invoice_paid",
    title: "Payment received",
    body: invUrl
      ? `Thanks — we received ${amount}. Open Billing anytime for the receipt, or use View invoice from your notifications.`
      : `Thanks — we received ${amount}. You can view the invoice from Billing anytime.`,
    meta: {
      invoiceId: invoice.id,
      hostedInvoiceUrl: invUrl,
      source,
      billingReason: invoice.billing_reason || null,
    },
  });
}

/**
 * Managers + super admins: in-app + emails on first subscribe.
 * Dedupes only STAFF rows — never the client's own plan_subscribed.
 * Uses stripe_events claim so checkout + subscription.created + confirm-purchase
 * cannot race into duplicate "Assign a BDM" rows for the same purchase.
 */
export async function notifyStaffNewSubscription(admin, { clientId, planId, source = "checkout", subscriptionId = null }) {
  if (!admin || !clientId) return { notified: false, reason: "no_client" };

  // One shared key for checkout + subscription.created + confirm-purchase (same day).
  // Day bucket allows a later re-subscribe to notify again.
  const day = new Date().toISOString().slice(0, 10);
  const claimId = `staff_purchase_${clientId}_${day}`;

  try {
    const { error: claimErr } = await admin.from("stripe_events").insert({
      id: claimId,
      type: "staff_purchase_notify",
    });
    const claimedDup =
      claimErr && (claimErr.code === "23505" || /duplicate|unique/i.test(claimErr.message || ""));
    if (claimedDup) {
      return { notified: true, skipped: "already_staff_purchase" };
    }
    if (claimErr) {
      console.warn("notifyStaffNewSubscription claim:", claimErr.message);
    }
  } catch (e) {
    console.warn("notifyStaffNewSubscription claim:", e.message);
  }

  // Soft backup (covers claim table missing / non-unique errors).
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: prior } = await admin
      .from("notifications")
      .select("id,meta")
      .eq("clientId", clientId)
      .in("type", ["needs_bdm", "plan_subscribed"])
      .gte("createdAt", since)
      .limit(40);
    const staffHit = (prior || []).some(
      (n) => n?.meta?.audience === "manager" || n?.meta?.audience === "super_admin"
    );
    if (staffHit) {
      return { notified: true, skipped: "already_staff_purchase" };
    }
  } catch (e) {
    console.warn("notifyStaffNewSubscription dedupe:", e.message);
  }

  const { data: buyer } = await admin
    .from("profiles")
    .select("id,email,name,businessName,plan,assignedBdmId")
    .eq("id", clientId)
    .maybeSingle();
  const who = buyer?.businessName || buyer?.name || buyer?.email || "A client";
  const planName = planLabel(planId || buyer?.plan);
  const purchasePayload = {
    clientId,
    type: buyer?.assignedBdmId ? "plan_subscribed" : "needs_bdm",
    title: buyer?.assignedBdmId
      ? `New subscription · ${planName}`
      : "Assign a BDM — new plan purchase",
    body: buyer?.assignedBdmId
      ? `${who} purchased ${planName}.`
      : `${who} purchased ${planName}. Assign a BDM from the client page.`,
    meta: {
      planId: planId || buyer?.plan || null,
      source,
      ...(subscriptionId ? { subscriptionId } : {}),
      claimId,
    },
  };

  await notifyManagersInApp(admin, purchasePayload);
  await notifySuperAdminsInApp(admin, purchasePayload);

  // Same path that works for plan-change emails (control panel recipients).
  try {
    await notifyStaffRoute(admin, {
      kind: "planChange",
      title: `New subscription · ${planName}`,
      body: `${who} purchased ${planName}.`,
    });
  } catch (e) {
    console.warn("notifyStaffRoute planChange (subscribe):", e.message);
  }

  try {
    await emailManagersAndSuperAdmins(admin, {
      routeKey: "routeOnboard",
      title: `New subscription · ${planName}`,
      body: `${who} purchased ${planName}.`,
    });
  } catch (e) {
    console.warn("emailManagersAndSuperAdmins purchase:", e.message);
  }

  return { notified: true, planName, who };
}
