/** Per-plan meeting quotas + messaging (server). Keep in sync with src/lib/constants.js */

export const PLAN_ENTITLEMENTS = {
  essentials: { regularMeetings: 1, guidanceMeetings: 1, messaging: false },
  growth: { regularMeetings: 2, guidanceMeetings: 1, messaging: true },
  gmb: { regularMeetings: 3, guidanceMeetings: 1, messaging: true },
};

export function getEntitlements(planId) {
  return PLAN_ENTITLEMENTS[planId] || PLAN_ENTITLEMENTS.essentials;
}

export function planAllowsMessaging(planId) {
  return !!getEntitlements(planId).messaging;
}

/** Billing period window for quota resets. */
export function billingPeriodWindow(profile, now = new Date()) {
  const endRaw = profile?.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
  const startRaw = profile?.currentPeriodStart ? new Date(profile.currentPeriodStart) : null;
  const endOk = endRaw && !Number.isNaN(endRaw.getTime());
  const startOk = startRaw && !Number.isNaN(startRaw.getTime());
  if (startOk && endOk) return { periodStart: startRaw, periodEnd: endRaw };
  if (endOk) {
    const s = new Date(endRaw.getTime());
    s.setUTCMonth(s.getUTCMonth() - 1);
    return { periodStart: s, periodEnd: endRaw };
  }
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart: s, periodEnd: e };
}

/**
 * Count pending/confirmed bookings of a kind created in [periodStart, periodEnd).
 * Cancelled do not count. Pass excludeId when rescheduling so the old row is ignored.
 */
export function countMeetingsInPeriod(bookings, kind, periodStart, periodEnd, excludeId = null) {
  const k = kind === "guidance" ? "guidance" : "regular";
  const t0 = periodStart.getTime();
  const t1 = periodEnd.getTime();
  return (bookings || []).filter((b) => {
    if (excludeId && b.id === excludeId) return false;
    if (b.status !== "pending" && b.status !== "confirmed") return false;
    const bk = b.kind === "guidance" ? "guidance" : "regular";
    if (bk !== k) return false;
    const created = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!created || Number.isNaN(created)) return false;
    return created >= t0 && created < t1;
  }).length;
}

export function meetingCapForKind(planId, kind) {
  const e = getEntitlements(planId);
  return kind === "guidance" ? e.guidanceMeetings : e.regularMeetings;
}
