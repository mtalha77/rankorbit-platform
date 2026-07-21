import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { resolveClientChatPeer } from "../server/assign.js";
import { isBookingPast, isSlotStillOpen, slotKey } from "../server/bookingTime.js";
import {
  getEntitlements,
  billingPeriodWindow,
  countMeetingsInPeriod,
} from "../server/planEntitlements.js";

/** Returns BDM or support peer, upcoming bookings, taken slots, and meeting quotas. */
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = req.method === "POST" ? await readJson(req) : {};
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token =
    body.token ||
    (header.startsWith("Bearer ") ? header.slice(7) : null);

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  let agent = null;
  let support = false;
  let needsBdm = false;
  try {
    const peerInfo = await resolveClientChatPeer(admin, auth.profile.id);
    if (peerInfo.peer) {
      agent = {
        id: peerInfo.peer.id,
        name: peerInfo.peer.name,
        email: peerInfo.peer.email,
      };
      support = peerInfo.kind === "support";
      needsBdm = !!peerInfo.needsBdm;
    }
  } catch (e) {
    console.warn("my-bdm peer:", e.message);
  }

  let bookings = [];
  let takenSlots = [];
  let quota = null;
  try {
    let { data: rows, error: bErr } = await admin
      .from("call_bookings")
      .select("*")
      .eq("clientId", auth.profile.id)
      .in("status", ["pending", "confirmed"])
      .order("createdAt", { ascending: false })
      .limit(40);
    if (bErr && /kind/i.test(bErr.message || "")) {
      ({ data: rows, error: bErr } = await admin
        .from("call_bookings")
        .select("id,clientId,agentId,slotDate,slotTime,note,status,meetingUrl,createdAt")
        .eq("clientId", auth.profile.id)
        .in("status", ["pending", "confirmed"])
        .order("createdAt", { ascending: false })
        .limit(40));
    }
    if (!bErr && rows?.length) {
      const upcoming = rows.filter((b) => !isBookingPast(b.slotDate, b.slotTime));
      const agentIds = [...new Set(upcoming.map((r) => r.agentId).filter(Boolean))];
      let agentsById = {};
      if (agentIds.length) {
        const { data: agents } = await admin
          .from("profiles")
          .select("id,name,email")
          .in("id", agentIds);
        agentsById = Object.fromEntries((agents || []).map((a) => [a.id, a]));
      }
      bookings = upcoming.map((b) => ({
        id: b.id,
        slotDate: b.slotDate,
        slotTime: b.slotTime,
        note: b.note,
        status: b.status,
        kind: b.kind === "guidance" ? "guidance" : "regular",
        meetingUrl: b.meetingUrl || null,
        createdAt: b.createdAt,
        agent: b.agentId
          ? {
              id: b.agentId,
              name: agentsById[b.agentId]?.name || agent?.name || null,
              email: agentsById[b.agentId]?.email || agent?.email || null,
            }
          : agent,
      }));
    }

    const planId = auth.profile.plan || "essentials";
    const entitlements = getEntitlements(planId);
    const { periodStart, periodEnd } = billingPeriodWindow(auth.profile);
    let periodRows = [];
    {
      const pr = await admin
        .from("call_bookings")
        .select("id,status,kind,createdAt")
        .eq("clientId", auth.profile.id)
        .in("status", ["pending", "confirmed"])
        .gte("createdAt", periodStart.toISOString())
        .lt("createdAt", periodEnd.toISOString());
      if (pr.error && /kind/i.test(pr.error.message || "")) {
        const pr2 = await admin
          .from("call_bookings")
          .select("id,status,createdAt")
          .eq("clientId", auth.profile.id)
          .in("status", ["pending", "confirmed"])
          .gte("createdAt", periodStart.toISOString())
          .lt("createdAt", periodEnd.toISOString());
        periodRows = (pr2.data || []).map((b) => ({ ...b, kind: "regular" }));
      } else {
        periodRows = pr.data || [];
      }
    }
    const regularUsed = countMeetingsInPeriod(periodRows, "regular", periodStart, periodEnd);
    const guidanceUsed = countMeetingsInPeriod(periodRows, "guidance", periodStart, periodEnd);
    quota = {
      planId,
      messaging: entitlements.messaging,
      regular: {
        used: regularUsed,
        limit: entitlements.regularMeetings,
        remaining: Math.max(0, entitlements.regularMeetings - regularUsed),
      },
      guidance: {
        used: guidanceUsed,
        limit: entitlements.guidanceMeetings,
        remaining: Math.max(0, entitlements.guidanceMeetings - guidanceUsed),
      },
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      leadHours: 24,
    };

    const busyAgentId = agent?.id;
    if (busyAgentId) {
      const { data: agentRows } = await admin
        .from("call_bookings")
        .select("slotDate,slotTime,status,clientId")
        .eq("agentId", busyAgentId)
        .in("status", ["pending", "confirmed"])
        .order("createdAt", { ascending: false })
        .limit(200);
      const seen = new Set();
      for (const b of agentRows || []) {
        if (!isSlotStillOpen(b.slotDate, b.slotTime)) continue;
        const k = slotKey(b.slotDate, b.slotTime);
        if (seen.has(k)) continue;
        seen.add(k);
        takenSlots.push({ slotDate: b.slotDate, slotTime: b.slotTime });
      }
    }
  } catch (e) {
    console.warn("my-bdm bookings:", e.message);
  }

  return res.status(200).json({
    agent,
    bookings,
    takenSlots,
    support,
    needsBdm,
    quota,
    minBookableAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}
