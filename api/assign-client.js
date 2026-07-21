import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyBdm, notifySuperAdmins, notifyClient } from "../server/assign.js";
import { isBdmRole } from "../server/roles.js";

/**
 * Staff assigns (or unassigns) a client to a BDM.
 * Body: { token, clientId, agentId|null }
 * Notifies the BDM.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId, agentId } = await readJson(req);
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const auth = await requireStaff(admin, token, { roles: ["super_admin", "manager"] });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: client, error: cErr } = await admin
      .from("profiles")
      .select("id,email,name,businessName,plan,assignedAgentId,role")
      .eq("id", clientId)
      .maybeSingle();
    if (cErr) return res.status(500).json({ error: cErr.message });
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "Client not found" });
    }

    let agent = null;
    if (agentId) {
      const { data: a, error: aErr } = await admin
        .from("profiles")
        .select("id,email,name,role,status,deletedAt")
        .eq("id", agentId)
        .maybeSingle();
      if (aErr) return res.status(500).json({ error: aErr.message });
      if (!a || !isBdmRole(a.role) || a.deletedAt || a.status === "suspended") {
        return res.status(400).json({ error: "BDM not found or inactive" });
      }
      agent = a;
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ assignedAgentId: agent ? agent.id : null })
      .eq("id", clientId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const business = client.businessName || client.name || client.email || "A client";
    const byWhom = auth.profile.name || auth.profile.email || "Staff";

    if (agent) {
      await notifyBdm(admin, {
        agentId: agent.id,
        clientId,
        type: "client_assigned",
        title: "New client assigned to you",
        body: `${business} was assigned to you by ${byWhom}. Please review their account.`,
        meta: { source: "manual", assignedBy: auth.profile.id },
      });

      await notifySuperAdmins(admin, {
        clientId,
        type: "client_assigned",
        title: "Client assigned to agent",
        body: `${business} was assigned to ${agent.name || agent.email} by ${byWhom}.`,
        meta: {
          agentId: agent.id,
          agentName: agent.name || agent.email || null,
          source: "manual",
          assignedBy: auth.profile.id,
          reportOnly: true,
        },
      });

      // Client-facing notice when they gain a BDM (or change BDM).
      if (client.assignedAgentId !== agent.id) {
        await notifyClient(admin, {
          userId: clientId,
          clientId,
          type: "bdm_assigned",
          title: "Your BDM has been assigned",
          body: `${agent.name || "A Business Development Manager"} is now your dedicated contact. You can book a call or send them a message anytime.`,
          meta: { agentId: agent.id },
        });
      }
    } else {
      await notifySuperAdmins(admin, {
        clientId,
        type: "client_unassigned",
        title: "Client unassigned from agent",
        body: `${business} was unassigned by ${byWhom}.`,
        meta: {
          previousAgentId: client.assignedAgentId || null,
          source: "manual",
          assignedBy: auth.profile.id,
          reportOnly: true,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      clientId,
      agentId: agent?.id || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Assign failed" });
  }
}
