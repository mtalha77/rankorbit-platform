import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { resolveClientAgent, notifyBdm, notifyClient, notifySuperAdmins } from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "bk") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/** Client books a 30-min call with their assigned BDM (auto-assigns if needed). */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, slotDate, slotTime, note } = await readJson(req);
  if (!slotDate || !slotTime) return res.status(400).json({ error: "Pick a date and time" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { client, agent } = await resolveClientAgent(admin, auth.profile.id);
    if (!agent) {
      return res.status(503).json({
        error: "No BDM is available yet. Please try again shortly or contact support.",
      });
    }

    const bookingId = uid("bk");
    const { error: bErr } = await admin.from("call_bookings").insert({
      id: bookingId,
      clientId: client.id,
      agentId: agent.id,
      slotDate: String(slotDate),
      slotTime: String(slotTime),
      note: note ? String(note).slice(0, 1000) : null,
      status: "pending",
    });
    if (bErr) {
      console.error("call_bookings insert:", bErr.message);
      const missing = /does not exist|Could not find the table|schema cache/i.test(bErr.message || "");
      return res.status(500).json({
        error: missing
          ? "Bookings table is missing. Run supabase/notifications.sql in the Supabase SQL editor."
          : `Could not save booking: ${bErr.message}`,
      });
    }

    const who = client.businessName || client.name || client.email;
    const notified = await notifyBdm(admin, {
      agentId: agent.id,
      clientId: client.id,
      type: "call_booked",
      title: "Meeting scheduled — confirm or cancel",
      body: `${who} requested a 30-min call on ${slotDate} at ${slotTime}.${note ? ` Note: ${note}` : ""} Open Notifications to confirm or cancel.`,
      meta: { bookingId, slotDate, slotTime, status: "pending" },
    });

    await notifySuperAdmins(admin, {
      clientId: client.id,
      type: "call_booked",
      title: "Client booked a meeting",
      body: `${who} requested a 30-min call with ${agent.name || "their BDM"} on ${slotDate} at ${slotTime}.${note ? ` Note: ${note}` : ""}`,
      meta: {
        bookingId,
        slotDate,
        slotTime,
        status: "pending",
        agentId: agent.id,
        agentName: agent.name || agent.email || null,
        reportOnly: true,
      },
    });

    // Client: in-app + email — pending until BDM confirms/cancels.
    await notifyClient(admin, {
      userId: client.id,
      clientId: client.id,
      type: "meeting_pending",
      title: "Meeting request sent",
      body: `You requested a 30-min call with ${agent.name || "your BDM"} on ${slotDate} at ${slotTime}. We'll notify you when they confirm or cancel.`,
      meta: { bookingId, slotDate, slotTime, status: "pending", agentId: agent.id },
    });

    try {
      await admin.from("activity").insert({
        id: uid("a"),
        clientId: client.id,
        type: "submitted",
        desc: `Call booked with ${agent.name || "BDM"} · ${slotDate} ${slotTime}`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        by: client.name || "Client",
      });
    } catch {
      /* optional */
    }

    return res.status(200).json({
      ok: true,
      bookingId,
      agent: { id: agent.id, name: agent.name, email: agent.email },
      notificationId: notified?.notificationId || null,
      slotDate,
      slotTime,
    });
  } catch (e) {
    console.error("book-call:", e.message);
    return res.status(500).json({ error: e.message || "Could not book call" });
  }
}
