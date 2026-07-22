/** Shared Book-a-Call slot helpers (server). */

export const CALL_SLOT_TIMES = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];

/** Parse Book-a-Call slot ("July 15, 2026" + "9:00 AM") → Date, or null. */
export function parseBookingSlot(slotDate, slotTime) {
  if (!slotDate || !slotTime) return null;
  const d = new Date(`${String(slotDate).trim()} ${String(slotTime).trim()}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the 30-min meeting slot has already ended. */
export function isBookingPast(slotDate, slotTime, now = new Date()) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() + 30 * 60 * 1000 <= now.getTime();
}

/** True when the slot start is still in the future (with a small buffer). */
export function isSlotStillOpen(slotDate, slotTime, now = new Date(), bufferMs = 5 * 60 * 1000) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() > now.getTime() + bufferMs;
}

/** Minimum lead time before a slot can be booked (all plans). */
export const BOOKING_LEAD_MS = 24 * 60 * 60 * 1000;

/** True when slot starts at least `leadMs` from now. */
export function isSlotBeyondLead(slotDate, slotTime, now = new Date(), leadMs = BOOKING_LEAD_MS) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() >= now.getTime() + leadMs;
}

/** Client meetings are Mon–Fri only (local calendar day of the slot). */
export function isBookingWeekday(slotDate, slotTime = "12:00 PM") {
  const start = parseBookingSlot(slotDate, slotTime) || parseBookingSlot(slotDate, "12:00 PM");
  if (!start) return false;
  const day = start.getDay();
  return day >= 1 && day <= 5;
}

/** Open for booking: weekday, not past buffer, AND meets 24h lead. */
export function isSlotBookable(slotDate, slotTime, now = new Date()) {
  return (
    isBookingWeekday(slotDate, slotTime) &&
    isSlotStillOpen(slotDate, slotTime, now) &&
    isSlotBeyondLead(slotDate, slotTime, now)
  );
}

export function slotKey(slotDate, slotTime) {
  return `${String(slotDate || "").trim()}|${String(slotTime || "").trim()}`;
}
