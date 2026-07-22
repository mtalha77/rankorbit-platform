import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { resolveClientChatPeer } from "../server/assign.js";
import { isBdmRole } from "../server/roles.js";

/**
 * Mark peer messages as read in the current client↔BDM thread only.
 * Body: { token, clientId? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId } = await readJson(req);

  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });

  let myId = null;
  let targetClientId = null;

  if (!staff.error) {
    myId = staff.profile.id;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    targetClientId = clientId;

    if (staff.profile.role === "agent") {
      return res.status(403).json({ error: "Agents do not access client chat" });
    }
    if (isBdmRole(staff.profile.role)) {
      const { data: client } = await admin
        .from("profiles")
        .select("assignedBdmId,role")
        .eq("id", targetClientId)
        .maybeSingle();
      if (!client || client.role !== "client" || client.assignedBdmId !== myId) {
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
    const { peer } = await resolveClientChatPeer(admin, targetClientId);
    if (!peer?.id) {
      return res.status(200).json({ ok: true, marked: 0 });
    }

    const now = new Date().toISOString();
    // Mark unread messages in the current BDM thread only (never prior assignees).
    const { data, error } = await admin
      .from("messages")
      .update({ readAt: now })
      .eq("clientId", targetClientId)
      .eq("agentId", peer.id)
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
