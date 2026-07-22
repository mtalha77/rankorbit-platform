import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyBdm, notifySuperAdmins, notifyClient, notifyUser } from "../server/assign.js";
import { isBdmRole, isAgentRole } from "../server/roles.js";

/**
 * Assign (or unassign) a client to a BDM or Agent.
 * Body: { token, clientId, staffId|null, kind?: "bdm"|"agent" }
 * - kind "bdm" (default): sets assignedBdmId — Super Admin + Manager
 * - kind "agent": sets assignedAgentId — Super Admin only
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const { token, clientId } = body;
  // Back-compat: older callers sent agentId for BDM assign.
  const staffId = body.staffId ?? body.agentId ?? null;
  const kind = body.kind === "agent" ? "agent" : "bdm";
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const allowedRoles = kind === "agent" ? ["super_admin"] : ["super_admin", "manager"];
  const auth = await requireStaff(admin, token, { roles: allowedRoles });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: client, error: cErr } = await admin
      .from("profiles")
      .select("id,email,name,businessName,plan,assignedAgentId,assignedBdmId,role")
      .eq("id", clientId)
      .maybeSingle();
    if (cErr) return res.status(500).json({ error: cErr.message });
    if (!client || client.role !== "client") {
      return res.status(404).json({ error: "Client not found" });
    }

    const field = kind === "agent" ? "assignedAgentId" : "assignedBdmId";
    const prevId = client[field] || null;

    let staff = null;
    if (staffId) {
      const { data: a, error: aErr } = await admin
        .from("profiles")
        .select("id,email,name,role,status,deletedAt")
        .eq("id", staffId)
        .maybeSingle();
      if (aErr) return res.status(500).json({ error: aErr.message });
      const okRole = kind === "agent" ? isAgentRole(a?.role) : isBdmRole(a?.role);
      if (!a || !okRole || a.deletedAt || a.status === "suspended") {
        return res.status(400).json({
          error: kind === "agent" ? "Agent not found or inactive" : "BDM not found or inactive",
        });
      }
      staff = a;
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ [field]: staff ? staff.id : null })
      .eq("id", clientId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    const business = client.businessName || client.name || client.email || "A client";
    const byWhom = auth.profile.name || auth.profile.email || "Staff";

    if (staff) {
      if (kind === "bdm") {
        await notifyBdm(admin, {
          agentId: staff.id,
          clientId,
          type: "client_assigned",
          title: "New client assigned to you",
          body: `${business} was assigned to you by ${byWhom}. Please review their account.`,
          meta: { source: "manual", assignedBy: auth.profile.id, kind: "bdm" },
        });
        if (prevId !== staff.id) {
          await notifyClient(admin, {
            userId: clientId,
            clientId,
            type: "bdm_assigned",
            title: "Your BDM has been assigned",
            body: `${staff.name || "A Business Development Manager"} is now your dedicated contact. You can book a call or send them a message anytime.`,
            meta: { agentId: staff.id },
          });
        }
      } else {
        await notifyUser(admin, {
          userId: staff.id,
          clientId,
          type: "client_assigned",
          title: "New client assigned to you",
          body: `${business} was assigned to you by ${byWhom}. You can update listings and GMB for this account.`,
          meta: { source: "manual", assignedBy: auth.profile.id, kind: "agent" },
        });
      }

      await notifySuperAdmins(admin, {
        clientId,
        type: "client_assigned",
        title: kind === "bdm" ? "Client assigned to BDM" : "Client assigned to Agent",
        body: `${business} was assigned to ${staff.name || staff.email} (${kind === "bdm" ? "BDM" : "Agent"}) by ${byWhom}.`,
        meta: {
          staffId: staff.id,
          staffName: staff.name || staff.email || null,
          kind,
          source: "manual",
          assignedBy: auth.profile.id,
          reportOnly: true,
        },
      });
    } else {
      await notifySuperAdmins(admin, {
        clientId,
        type: "client_unassigned",
        title: kind === "bdm" ? "Client unassigned from BDM" : "Client unassigned from Agent",
        body: `${business} was unassigned (${kind}) by ${byWhom}.`,
        meta: {
          previousStaffId: prevId,
          kind,
          source: "manual",
          assignedBy: auth.profile.id,
          reportOnly: true,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      clientId,
      kind,
      staffId: staff?.id || null,
      // Back-compat for older callers
      agentId: kind === "bdm" ? staff?.id || null : undefined,
      assignedBdmId: kind === "bdm" ? staff?.id || null : undefined,
      assignedAgentId: kind === "agent" ? staff?.id || null : undefined,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Assign failed" });
  }
}
