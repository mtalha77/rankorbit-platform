import { getAdmin, readJson, requireClient } from "../server/billing.js";
import { isBookingPast } from "../server/bookingTime.js";

/** Returns the client's assigned BDM + upcoming call bookings for Book a Call UI. */
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

  const agentId = auth.profile.assignedAgentId;
  let agent = null;
  if (agentId) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,name,email")
      .eq("id", agentId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (data) agent = { id: data.id, name: data.name, email: data.email };
  }

  let bookings = [];
  try {
    const { data: rows, error: bErr } = await admin
      .from("call_bookings")
      .select("*")
      .eq("clientId", auth.profile.id)
      .in("status", ["pending", "confirmed"])
      .order("createdAt", { ascending: false })
      .limit(20);
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
  } catch (e) {
    console.warn("my-bdm bookings:", e.message);
  }

  return res.status(200).json({ agent, bookings });
}
