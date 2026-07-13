import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyUser } from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "a") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Agent confirms or cancels a client call booking.
 * Body: { token, bookingId, action: "confirm"|"cancel", notificationId? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, bookingId, action, notificationId } = await readJson(req);
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });
  if (!["confirm", "cancel"].includes(action)) {
    return res.status(400).json({ error: "action must be confirm or cancel" });
  }

  const auth = await requireStaff(admin, token, { roles: ["agent", "manager", "super_admin"] });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: booking, error: bErr } = await admin
      .from("call_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr) return res.status(500).json({ error: bErr.message });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Agents may only act on their own bookings.
    if (auth.profile.role === "agent" && booking.agentId !== auth.profile.id) {
      return res.status(403).json({ error: "This booking is assigned to another agent" });
    }

    if (booking.status === "confirmed" || booking.status === "cancelled") {
      return res.status(409).json({ error: `Meeting already ${booking.status}` });
    }

    const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
    const { error: upErr } = await admin
      .from("call_bookings")
      .update({ status: nextStatus })
      .eq("id", bookingId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    // Mark related agent notifications as responded.
    if (notificationId) {
      const { data: one } = await admin
        .from("notifications")
        .select("meta")
        .eq("id", notificationId)
        .maybeSingle();
      await admin
        .from("notifications")
        .update({
          read: true,
          meta: {
            ...(one?.meta || {}),
            bookingId,
            slotDate: booking.slotDate,
            slotTime: booking.slotTime,
            status: nextStatus,
            respondedAt: new Date().toISOString(),
          },
        })
        .eq("id", notificationId)
        .eq("userId", auth.profile.id);
    }

    try {
      const { data: related } = await admin
        .from("notifications")
        .select("id,meta")
        .eq("userId", booking.agentId)
        .eq("type", "call_booked");
      for (const n of related || []) {
        if (n.meta?.bookingId === bookingId) {
          await admin
            .from("notifications")
            .update({
              read: true,
              meta: { ...n.meta, status: nextStatus, respondedAt: new Date().toISOString() },
            })
            .eq("id", n.id);
        }
      }
    } catch {
      /* optional */
    }

    const when = `${booking.slotDate} at ${booking.slotTime}`;
    const agentName = auth.profile.name || "Your BDM";
    await notifyUser(admin, {
      userId: booking.clientId,
      clientId: booking.clientId,
      type: action === "confirm" ? "meeting_confirmed" : "meeting_cancelled",
      title: action === "confirm" ? "Your meeting is confirmed" : "Your meeting was cancelled",
      body:
        action === "confirm"
          ? `${agentName} confirmed your call for ${when}.`
          : `${agentName} cancelled your call for ${when}. Please book another time if you still need to talk.`,
      meta: { bookingId, slotDate: booking.slotDate, slotTime: booking.slotTime, status: nextStatus },
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

    return res.status(200).json({ ok: true, status: nextStatus, bookingId });
  } catch (e) {
    console.error("respond-call:", e.message);
    return res.status(500).json({ error: e.message || "Could not update meeting" });
  }
}
