import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { isBookingPast, parseBookingSlot } from "../server/bookingTime.js";
import { isBdmRole } from "../server/roles.js";

/**
 * Staff list of scheduled call bookings.
 * BDM/agent → only their meetings. Manager/super_admin → all upcoming.
 * Body: { token, includePast?: boolean }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, includePast } = await readJson(req);
  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const mineOnly = isBdmRole(auth.profile.role);

  try {
    const run = async (withKind) => {
      const cols = withKind
        ? "id,clientId,agentId,slotDate,slotTime,note,status,meetingUrl,kind,createdAt"
        : "id,clientId,agentId,slotDate,slotTime,note,status,meetingUrl,createdAt";
      let q = admin
        .from("call_bookings")
        .select(cols)
        .in("status", ["pending", "confirmed"])
        .order("createdAt", { ascending: false })
        .limit(200);
      if (mineOnly) q = q.eq("agentId", auth.profile.id);
      return q;
    };

    let { data: rows, error } = await run(true);
    if (error && /kind/i.test(error.message || "")) {
      ({ data: rows, error } = await run(false));
    }
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Meetings table missing. Run supabase/notifications.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    let list = rows || [];
    if (!includePast) {
      list = list.filter((b) => !isBookingPast(b.slotDate, b.slotTime));
    }

    list.sort((a, b) => {
      const ta = parseBookingSlot(a.slotDate, a.slotTime)?.getTime() || 0;
      const tb = parseBookingSlot(b.slotDate, b.slotTime)?.getTime() || 0;
      return ta - tb;
    });

    const clientIds = [...new Set(list.map((b) => b.clientId).filter(Boolean))];
    const agentIds = [...new Set(list.map((b) => b.agentId).filter(Boolean))];
    const profileIds = [...new Set([...clientIds, ...agentIds])];
    let byId = {};
    if (profileIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,name,email,businessName,role")
        .in("id", profileIds);
      byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    const meetings = list.map((b) => {
      const client = byId[b.clientId];
      const agent = b.agentId ? byId[b.agentId] : null;
      return {
        id: b.id,
        clientId: b.clientId,
        agentId: b.agentId || null,
        slotDate: b.slotDate,
        slotTime: b.slotTime,
        note: b.note || null,
        status: b.status,
        kind: b.kind === "guidance" ? "guidance" : "regular",
        meetingUrl: b.meetingUrl || null,
        createdAt: b.createdAt,
        client: client
          ? {
              id: client.id,
              name: client.name || null,
              email: client.email || null,
              businessName: client.businessName || null,
            }
          : null,
        agent: agent
          ? { id: agent.id, name: agent.name || null, email: agent.email || null }
          : null,
      };
    });

    return res.status(200).json({
      ok: true,
      meetings,
      counts: {
        total: meetings.length,
        pending: meetings.filter((m) => m.status === "pending").length,
        confirmed: meetings.filter((m) => m.status === "confirmed").length,
      },
    });
  } catch (e) {
    console.error("my-meetings:", e.message);
    return res.status(500).json({ error: e.message || "Could not load meetings" });
  }
}
