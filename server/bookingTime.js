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
