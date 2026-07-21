import { isPastMeetingNotif } from "../../lib/helpers";

/** Super admin: team-chat, payment_failed, plan purchase / needs BDM. Others: all live staff notifs. */
export function filterVisibleStaffNotifs(rows, role) {
  const live = (rows || []).filter((x) => !isPastMeetingNotif(x));
  if (role !== "super_admin") return live;
  return live.filter((x) =>
    x.type === "staff_message" ||
    x.type === "payment_failed" ||
    x.type === "plan_subscribed" ||
    x.type === "needs_bdm"
  );
}

/** Client payment-fail badge helper for admin lists. */
export function clientPaymentBadge(c) {
  if (!c) return null;
  if (c.subscriptionStatus !== "past_due" && !c.paymentFailedAt) return null;
  const ends = c.paymentGraceEndsAt ? new Date(c.paymentGraceEndsAt).getTime() : null;
  const expired = ends != null && ends < Date.now();
  return expired
    ? { type: "rejected", label: "Grace expired" }
    : { type: "pending", label: "Payment failed" };
}
