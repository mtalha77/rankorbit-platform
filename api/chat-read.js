import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";

/**
 * Mark peer messages as read in a thread.
 * Body: { token, clientId? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId } = await readJson(req);

  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });

  let myId = null;
  let targetClientId = null;

  if (!staff.error) {
    myId = staff.profile.id;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    targetClientId = clientId;

    if (staff.profile.role === "agent") {
      const { data: client } = await admin
        .from("profiles")
        .select("assignedAgentId,role")
        .eq("id", targetClientId)
        .maybeSingle();
      if (!client || client.role !== "client" || client.assignedAgentId !== myId) {
        return res.status(403).json({ error: "This client is not assigned to you" });
      }
    }
  } else {
    const clientAuth = await requireClient(admin, token);
    if (clientAuth.error) {
      return res.status(clientAuth.status || 401).json({ error: clientAuth.error });
    }
    myId = clientAuth.profile.id;
    targetClientId = myId;
  }

  try {
    const now = new Date().toISOString();
    // Mark messages I didn't send as read
    const { data, error } = await admin
      .from("messages")
      .update({ readAt: now })
      .eq("clientId", targetClientId)
      .is("readAt", null)
      .neq("senderId", myId)
      .select("id");

    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Chat table missing. Run supabase/chat-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    return res.status(200).json({ ok: true, marked: (data || []).length });
  } catch (e) {
    console.error("chat-read:", e.message);
    return res.status(500).json({ error: e.message || "Could not mark read" });
  }
}
