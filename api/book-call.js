import { getAdmin, readJson, requireClient } from "../server/billing.js";
import {
  resolveClientChatPeer,
  notifyBdm,
  notifyClient,
  notifyManagersInApp,
  notifyStaffRoute,
} from "../server/assign.js";
import {
  CALL_SLOT_TIMES,
  isSlotBookable,
  isBookingPast,
  slotKey,
} from "../server/bookingTime.js";
import {
  getEntitlements,
  billingPeriodWindow,
  countMeetingsInPeriod,
  meetingCapForKind,
} from "../server/planEntitlements.js";
import { randomUUID } from "crypto";

function uid(prefix = "bk") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/** Client books a 30-min call with BDM, or a manager if no agent is available yet. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, slotDate, slotTime, note, replaceBookingId, kind: kindRaw } = await readJson(req);
  if (!slotDate || !slotTime) return res.status(400).json({ error: "Pick a date and time" });
  if (!CALL_SLOT_TIMES.includes(String(slotTime).trim())) {
    return res.status(400).json({ error: "That time slot is not available" });
  }
  if (!isSlotBookable(slotDate, slotTime)) {
    return res.status(400).json({
      error: "Pick a time at least 24 hours from now.",
    });
  }

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { client, peer, kind: peerKind, needsBdm } = await resolveClientChatPeer(admin, auth.profile.id);
    const agent = peer;
    if (!agent) {
      return res.status(503).json({
        error: "Our team is briefly unavailable. Please try again in a few minutes or use Messages.",
      });
    }
    const support = peerKind === "support";

    // One active upcoming booking per client — unless replacing that booking (reschedule).
    let { data: mine, error: mineErr } = await admin
      .from("call_bookings")
      .select("id,slotDate,slotTime,status,kind,createdAt")
      .eq("clientId", client.id)
      .in("status", ["pending", "confirmed"]);
    if (mineErr && /kind/i.test(mineErr.message || "")) {
      ({ data: mine } = await admin
        .from("call_bookings")
        .select("id,slotDate,slotTime,status,createdAt")
        .eq("clientId", client.id)
        .in("status", ["pending", "confirmed"]));
      mine = (mine || []).map((b) => ({ ...b, kind: "regular" }));
    }
    const activeMine = (mine || []).filter(
      (b) => !isBookingPast(b.slotDate, b.slotTime)
    );

    let meetingKind = kindRaw === "guidance" ? "guidance" : "regular";

    if (replaceBookingId) {
      const target = activeMine.find((b) => b.id === replaceBookingId);
      if (!target) {
        return res.status(409).json({
          error: "Nothing to reschedule. Cancelled or past meetings cannot be replaced.",
        });
      }
      // Reschedule keeps the same kind and does not consume an extra quota slot.
      meetingKind = target.kind === "guidance" ? "guidance" : "regular";
      await admin
        .from("call_bookings")
        .update({ status: "cancelled" })
        .eq("id", replaceBookingId)
        .eq("clientId", client.id);
      try {
        const { data: oldNotifs } = await admin
          .from("notifications")
          .select("id,meta")
          .eq("type", "call_booked")
          .contains("meta", { bookingId: replaceBookingId });
        for (const n of oldNotifs || []) {
          await admin
            .from("notifications")
            .update({
              read: true,
              meta: {
                ...(n.meta || {}),
                status: "cancelled",
                cancelledBy: "client_reschedule",
                respondedAt: new Date().toISOString(),
              },
            })
            .eq("id", n.id);
        }
      } catch {
        /* optional */
      }
    } else if (activeMine.length) {
      return res.status(409).json({
        error: "You already have an upcoming meeting. Cancel or reschedule it first.",
      });
    }

    // Period quota (skip increase check on reschedule — same kind, cancelled old first).
    if (!replaceBookingId) {
      const planId = client.plan || "essentials";
      const entitlements = getEntitlements(planId);
      const cap = meetingCapForKind(planId, meetingKind);
      const { periodStart, periodEnd } = billingPeriodWindow(client);
      let periodRows = [];
      {
        const pr = await admin
          .from("call_bookings")
          .select("id,status,kind,createdAt")
          .eq("clientId", client.id)
          .in("status", ["pending", "confirmed"])
          .gte("createdAt", periodStart.toISOString())
          .lt("createdAt", periodEnd.toISOString());
        if (pr.error && /kind/i.test(pr.error.message || "")) {
          const pr2 = await admin
            .from("call_bookings")
            .select("id,status,createdAt")
            .eq("clientId", client.id)
            .in("status", ["pending", "confirmed"])
            .gte("createdAt", periodStart.toISOString())
            .lt("createdAt", periodEnd.toISOString());
          periodRows = (pr2.data || []).map((b) => ({ ...b, kind: "regular" }));
        } else {
          periodRows = pr.data || [];
        }
      }
      const used = countMeetingsInPeriod(periodRows, meetingKind, periodStart, periodEnd);
      if (used >= cap) {
        const label = meetingKind === "guidance" ? "guidance" : "regular";
        const limit =
          meetingKind === "guidance" ? entitlements.guidanceMeetings : entitlements.regularMeetings;
        return res.status(403).json({
          error: `You've used all ${limit} ${label} meeting${limit === 1 ? "" : "s"} for this billing period. Quota renews on your next billing date.`,
          kind: meetingKind,
          used,
          limit: cap,
        });
      }
    }

    const { data: conflicts } = await admin
      .from("call_bookings")
      .select("id,slotDate,slotTime,status")
      .eq("agentId", agent.id)
      .eq("slotDate", String(slotDate).trim())
      .eq("slotTime", String(slotTime).trim())
      .in("status", ["pending", "confirmed"])
      .limit(5);
    const busy = (conflicts || []).some(
      (b) =>
        b.id !== replaceBookingId &&
        slotKey(b.slotDate, b.slotTime) === slotKey(slotDate, slotTime) &&
        !isBookingPast(b.slotDate, b.slotTime)
    );
    if (busy) {
      return res.status(409).json({
        error: "That time was just taken. Please pick another available slot.",
      });
    }

    const bookingId = uid("bk");
    const row = {
      id: bookingId,
      clientId: client.id,
      agentId: agent.id,
      slotDate: String(slotDate),
      slotTime: String(slotTime),
      note: note ? String(note).slice(0, 1000) : null,
      status: "pending",
      kind: meetingKind,
    };
    let { error: bErr } = await admin.from("call_bookings").insert(row);
    // Older DBs may not have kind yet — retry without it.
    if (bErr && /kind/i.test(bErr.message || "")) {
      const { kind: _k, ...basic } = row;
      ({ error: bErr } = await admin.from("call_bookings").insert(basic));
    }
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
    const peerLabel = support ? agent.name || "a team member" : agent.name || "your BDM";
    const kindLabel = meetingKind === "guidance" ? "guidance call" : "call";
    const notified = await notifyBdm(admin, {
      agentId: agent.id,
      clientId: client.id,
      type: "call_booked",
      title: support
        ? "Support meeting — confirm or cancel (no BDM yet)"
        : `Meeting scheduled (${kindLabel}) — confirm or cancel`,
      body: `${who} requested a 30-min ${kindLabel} on ${slotDate} at ${slotTime}.${note ? ` Note: ${note}` : ""} Open Notifications to confirm or cancel.${support ? " Assign a BDM when ready." : ""}`,
      meta: { bookingId, slotDate, slotTime, status: "pending", support, kind: meetingKind },
    });

    if (support) {
      await notifyManagersInApp(admin, {
        clientId: client.id,
        type: "call_booked",
        title: `Call request from ${who}`,
        body: `${who} booked ${slotDate} at ${slotTime} with support — assign a BDM when ready.`,
        meta: { bookingId, slotDate, slotTime, status: "pending", support: true, peerId: agent.id, kind: meetingKind },
      });
      try {
        await notifyStaffRoute(admin, {
          kind: "system",
          title: "Client booked a call — no BDM assigned",
          body: `${who} booked ${slotDate} at ${slotTime}. A manager should confirm and assign a BDM.`,
        });
      } catch {
        /* optional */
      }
    }

    await notifyClient(admin, {
      userId: client.id,
      clientId: client.id,
      type: "meeting_pending",
      title: "Meeting request sent",
      body: support
        ? `You requested a 30-min ${kindLabel} on ${slotDate} at ${slotTime}. A team member will confirm — your dedicated BDM is being assigned.`
        : `You requested a 30-min ${kindLabel} with ${peerLabel} on ${slotDate} at ${slotTime}. We'll notify you when they confirm or cancel.`,
      meta: {
        bookingId,
        slotDate,
        slotTime,
        status: "pending",
        agentId: agent.id,
        support,
        needsBdm: !!needsBdm,
        kind: meetingKind,
      },
    });

    try {
      await admin.from("activity").insert({
        id: uid("a"),
        clientId: client.id,
        type: "submitted",
        desc: support
          ? `${meetingKind === "guidance" ? "Guidance call" : "Call"} booked with support (${agent.name || "manager"}) · ${slotDate} ${slotTime}`
          : `${meetingKind === "guidance" ? "Guidance call" : "Call"} booked with ${agent.name || "BDM"} · ${slotDate} ${slotTime}`,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        by: client.name || "Client",
      });
    } catch {
      /* optional */
    }

    return res.status(200).json({
      ok: true,
      bookingId,
      kind: meetingKind,
      agent: { id: agent.id, name: agent.name, email: agent.email },
      support,
      needsBdm: !!needsBdm,
      notificationId: notified?.notificationId || null,
      slotDate,
      slotTime,
    });
  } catch (e) {
    console.error("book-call:", e.message);
    return res.status(500).json({ error: e.message || "Could not book call" });
  }
}
