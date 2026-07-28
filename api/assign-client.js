import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyBdm, notifySuperAdmins, notifyClient, notifyUser, notifyMeetingOps } from "../server/assign.js";
import { isBdmRole, isAgentRole } from "../server/roles.js";
import { isBookingPast } from "../server/bookingTime.js";

/**
 * Assign (or unassign) a client to a BDM or Agent.
 * Body: { token, clientId, staffId|null, kind?: "bdm"|"agent" }
 * - kind "bdm" (default): sets assignedBdmId — Super Admin + Manager
 * - kind "agent": sets assignedAgentId — Super Admin + Manager
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

  const allowedRoles = ["super_admin", "manager"];
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

    const update = { [field]: staff ? staff.id : null };
    // Assigning a BDM clears any pending "Connect with your BDM" request.
    if (kind === "bdm" && staff) update.bdmConnectRequestedAt = null;
    const { error: upErr } = await admin
      .from("profiles")
      .update(update)
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
            title: "You are connected with your BDM",
            body: `You are now connected with ${staff.name || "your Business Development Manager"}. You can chat with your BDM anytime from Messages, or book a call.`,
            meta: { agentId: staff.id },
          });
        }

        // Shift open meetings to the new BDM (pending + confirmed).
        try {
          const { data: openMeetings } = await admin
            .from("call_bookings")
            .select("id,agentId,slotDate,slotTime,status,meetingUrl,kind")
            .eq("clientId", clientId)
            .in("status", ["pending", "confirmed"]);
          const toMove = (openMeetings || []).filter(
            (m) =>
              m.agentId !== staff.id &&
              !isBookingPast(m.slotDate, m.slotTime)
          );
          for (const m of toMove) {
            const when = `${m.slotDate} at ${m.slotTime}`;

            // Don't break assign if the BDM already has this slot — keep meeting on prior peer.
            const { data: slotClash } = await admin
              .from("call_bookings")
              .select("id")
              .eq("agentId", staff.id)
              .eq("slotDate", m.slotDate)
              .eq("slotTime", m.slotTime)
              .in("status", ["pending", "confirmed"])
              .neq("id", m.id)
              .limit(1);
            if (slotClash?.length) {
              await notifyMeetingOps(admin, {
                agentId: staff.id,
                clientId,
                type: "meeting_transferred",
                title: "Meeting transfer skipped — slot busy",
                body: `${business}'s meeting on ${when} could not move to ${staff.name || "the BDM"} because that slot is already booked. Rebook or free the slot, then re-assign if needed.`,
                meta: {
                  bookingId: m.id,
                  slotDate: m.slotDate,
                  slotTime: m.slotTime,
                  status: m.status,
                  transferSkipped: true,
                  transferredBy: auth.profile.id,
                },
              });
              continue;
            }

            const { error: moveErr } = await admin
              .from("call_bookings")
              .update({ agentId: staff.id })
              .eq("id", m.id);
            if (moveErr) {
              console.warn("assign-client meeting transfer update:", moveErr.message);
              continue;
            }

            const needsZoom = m.status === "confirmed" && !m.meetingUrl;
            const bdmLabel = staff.name || staff.email || "BDM";
            await notifyMeetingOps(admin, {
              agentId: staff.id,
              clientId,
              type: "meeting_transferred",
              // Peer (BDM) copy
              title: needsZoom
                ? "Meeting transferred — add Zoom link"
                : "Meeting transferred to you",
              body: needsZoom
                ? `${business}'s ${m.status} meeting on ${when} is now yours. Please add a Zoom / join link.`
                : `${business}'s ${m.status} meeting on ${when} was moved to you by ${byWhom}.`,
              // Manager / super admin copy (not "moved to you")
              opsTitle: needsZoom
                ? "Meeting transferred — Zoom link needed"
                : "Meeting transferred to BDM",
              opsBody: needsZoom
                ? `${business}'s ${m.status} meeting on ${when} was assigned to ${bdmLabel} by ${byWhom}. They need to add a Zoom / join link.`
                : `${business}'s ${m.status} meeting on ${when} was assigned to ${bdmLabel} by ${byWhom}.`,
              meta: {
                bookingId: m.id,
                slotDate: m.slotDate,
                slotTime: m.slotTime,
                status: m.status,
                meetingUrl: m.meetingUrl || null,
                needsZoom: !!needsZoom,
                transferredBy: auth.profile.id,
                transferredTo: staff.id,
                transferredToName: bdmLabel,
              },
            });

            try {
              const { data: notifs } = await admin
                .from("notifications")
                .select("id,meta")
                .eq("type", "call_booked")
                .contains("meta", { bookingId: m.id });
              for (const n of notifs || []) {
                await admin
                  .from("notifications")
                  .update({
                    meta: {
                      ...(n.meta || {}),
                      agentId: staff.id,
                      transferredAt: new Date().toISOString(),
                      transferredTo: staff.id,
                    },
                  })
                  .eq("id", n.id);
              }
            } catch {
              /* optional */
            }
          }
        } catch (e) {
          console.warn("assign-client meeting transfer:", e.message);
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
