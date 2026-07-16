import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { notifyBdm, notifyClient } from "../server/assign.js";
import { isBookingPast } from "../server/bookingTime.js";
import { randomUUID } from "crypto";

function uid(prefix = "a") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Client cancels their own pending/confirmed booking.
 * Body: { token, bookingId }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, bookingId } = await readJson(req);
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: booking, error: bErr } = await admin
      .from("call_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr) return res.status(500).json({ error: bErr.message });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.clientId !== auth.profile.id) {
      return res.status(403).json({ error: "This booking is not yours" });
    }
    if (booking.status === "cancelled") {
      return res.status(409).json({ error: "Meeting already cancelled" });
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(409).json({ error: "This meeting cannot be cancelled" });
    }
    if (isBookingPast(booking.slotDate, booking.slotTime)) {
      return res.status(409).json({ error: "This meeting has already ended" });
    }

    const { error: upErr } = await admin
      .from("call_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const when = `${booking.slotDate} at ${booking.slotTime}`;
    const who = auth.profile.businessName || auth.profile.name || auth.profile.email || "Client";

    try {
      const { data: notifs } = await admin
        .from("notifications")
        .select("id,meta")
        .eq("type", "call_booked")
        .contains("meta", { bookingId });
      for (const n of notifs || []) {
        await admin
          .from("notifications")
          .update({
            read: true,
            meta: {
              ...(n.meta || {}),
              status: "cancelled",
              cancelledBy: "client",
              respondedAt: new Date().toISOString(),
            },
          })
          .eq("id", n.id);
      }
    } catch {
      /* optional */
    }

    await notifyBdm(admin, {
      agentId: booking.agentId,
      clientId: booking.clientId,
      type: "meeting_cancelled",
      title: "Client cancelled the meeting",
      body: `${who} cancelled the call for ${when}.`,
      meta: {
        bookingId,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        status: "cancelled",
        cancelledBy: "client",
      },
    });

    await notifyClient(admin, {
      userId: booking.clientId,
      clientId: booking.clientId,
      type: "meeting_cancelled",
      title: "Meeting cancelled",
      body: `You cancelled your call for ${when}. You can book a new time anytime.`,
      meta: {
        bookingId,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        status: "cancelled",
        cancelledBy: "client",
      },
    });

    try {
      await admin.from("activity").insert({
        id: uid("a"),
        clientId: booking.clientId,
        type: "submitted",
        desc: `Meeting cancelled by client · ${when}`,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        by: who,
      });
    } catch {
      /* optional */
    }

    return res.status(200).json({ ok: true, status: "cancelled", bookingId });
  } catch (e) {
    console.error("cancel-call:", e.message);
    return res.status(500).json({ error: e.message || "Could not cancel meeting" });
  }
}
