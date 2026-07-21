import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyClient } from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "a") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

async function stampBookingNotifs(admin, { bookingId, notificationId, status, meetingUrl }) {
  const stamp = {
    status,
    meetingUrl: meetingUrl || null,
    respondedAt: new Date().toISOString(),
  };
  if (notificationId) {
    const { data: one } = await admin
      .from("notifications")
      .select("meta")
      .eq("id", notificationId)
      .maybeSingle();
    if (one) {
      await admin
        .from("notifications")
        .update({ read: true, meta: { ...(one.meta || {}), ...stamp } })
        .eq("id", notificationId);
    }
  }
  try {
    const { data: siblings } = await admin
      .from("notifications")
      .select("id,meta")
      .eq("type", "call_booked")
      .contains("meta", { bookingId });
    if (siblings?.length) {
      for (const n of siblings) {
        await admin
          .from("notifications")
          .update({ read: true, meta: { ...(n.meta || {}), ...stamp } })
          .eq("id", n.id);
      }
    }
  } catch {
    /* optional */
  }
}

/**
 * Agent confirms/cancels a booking, or shares a Zoom link after confirm.
 * Body: { token, bookingId, action: "confirm"|"cancel"|"share_link", notificationId?, meetingUrl? }
 * Confirm and share_link require a valid https meetingUrl so clients never wait without a link.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, bookingId, action, notificationId, meetingUrl } = await readJson(req);
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });
  if (!["confirm", "cancel", "share_link"].includes(action)) {
    return res.status(400).json({ error: "action must be confirm, cancel, or share_link" });
  }

  const cleanMeetingUrl = (() => {
    const raw = String(meetingUrl || "").trim();
    if (!raw) return null;
    if (raw.length > 500) return null;
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    } catch {
      return null;
    }
  })();
  if ((action === "confirm" || action === "share_link") && !cleanMeetingUrl) {
    return res.status(400).json({ error: "A Zoom / meeting link is required (https://…)" });
  }

  const auth = await requireStaff(admin, token, { roles: ["bdm", "agent", "manager", "super_admin"] });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: booking, error: bErr } = await admin
      .from("call_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr) return res.status(500).json({ error: bErr.message });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if ((auth.profile.role === "bdm" || auth.profile.role === "agent") && booking.agentId !== auth.profile.id) {
      return res.status(403).json({ error: "This booking is assigned to another BDM" });
    }

    const when = `${booking.slotDate} at ${booking.slotTime}`;
    const agentName = auth.profile.name || "Your BDM";

    if (action === "share_link") {
      if (booking.status !== "confirmed") {
        return res.status(409).json({ error: "Only confirmed meetings can receive a join link" });
      }
      const { error: upErr } = await admin
        .from("call_bookings")
        .update({ meetingUrl: cleanMeetingUrl })
        .eq("id", bookingId);
      if (upErr) return res.status(500).json({ error: upErr.message });

      await stampBookingNotifs(admin, {
        bookingId,
        notificationId,
        status: "confirmed",
        meetingUrl: cleanMeetingUrl,
      });
      await notifyClient(admin, {
        userId: booking.clientId,
        clientId: booking.clientId,
        type: "meeting_confirmed",
        title: "Your Zoom link is ready",
        body: `${agentName} shared the join link for your call on ${when}: ${cleanMeetingUrl}`,
        meta: {
          bookingId,
          slotDate: booking.slotDate,
          slotTime: booking.slotTime,
          status: "confirmed",
          meetingUrl: cleanMeetingUrl,
        },
      });
      return res.status(200).json({
        ok: true,
        status: "confirmed",
        bookingId,
        meetingUrl: cleanMeetingUrl,
      });
    }

    if (booking.status === "confirmed" || booking.status === "cancelled") {
      return res.status(409).json({ error: `Meeting already ${booking.status}` });
    }

    const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
    const update = { status: nextStatus };
    if (action === "confirm") update.meetingUrl = cleanMeetingUrl;
    const { error: upErr } = await admin
      .from("call_bookings")
      .update(update)
      .eq("id", bookingId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const link = action === "confirm" ? cleanMeetingUrl : null;
    await stampBookingNotifs(admin, {
      bookingId,
      notificationId,
      status: nextStatus,
      meetingUrl: link || booking.meetingUrl || null,
    });

    await notifyClient(admin, {
      userId: booking.clientId,
      clientId: booking.clientId,
      type: action === "confirm" ? "meeting_confirmed" : "meeting_cancelled",
      title: action === "confirm" ? "Your meeting is confirmed" : "Your meeting was cancelled",
      body:
        action === "confirm"
          ? `${agentName} confirmed your call for ${when}. Join link: ${link}`
          : `${agentName} cancelled your call for ${when}. Please book another time if you still need to talk.`,
      meta: {
        bookingId,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        status: nextStatus,
        meetingUrl: link,
      },
    });

    try {
      await admin.from("activity").insert({
        id: uid("a"),
        clientId: booking.clientId,
        type: "submitted",
        desc:
          action === "confirm"
            ? `Meeting confirmed · ${when}`
            : `Meeting cancelled · ${when}`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        by: agentName,
      });
    } catch {
      /* optional */
    }

    return res.status(200).json({
      ok: true,
      status: nextStatus,
      bookingId,
      meetingUrl: link || booking.meetingUrl || null,
    });
  } catch (e) {
    console.error("respond-call:", e.message);
    return res.status(500).json({ error: e.message || "Could not update meeting" });
  }
}
