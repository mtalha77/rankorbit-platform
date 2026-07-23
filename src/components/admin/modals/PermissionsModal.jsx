import { useState } from "react";
import { T } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { isBdmRole, isAgentRole, staffRoleLabel } from "../../../lib/helpers";
import { Modal, Btn } from "../../atoms";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

export function PermissionsModal({ member: memberProp, onClose }) {
  const { staff, user, allClients, audit, toast, reload, setModal, setTeamView, setPage, isStaffMgr, isAdmin } = useAdmin();

  const member = staff.find((x) => x.id === memberProp.id) || memberProp;
  const isSelf = member.id === user.id;
  const canEdit = !isSelf;
  const role = staffRoleLabel(member.role);
  const isBdmMember = isBdmRole(member.role);
  const isAgentMember = isAgentRole(member.role);
  const assignField = isAgentMember ? "assignedAgentId" : "assignedBdmId";
  const assignedCount = allClients.filter((c) => c[assignField] === member.id).length;

  const rolePerms =
    member.role === "super_admin"
      ? ["Full platform access", "Manage clients, listings, and GMB", "Manage team, finance, and settings", "Read-only client account view", "View activity logs"]
      : member.role === "manager"
        ? ["Manage clients, listings, and GMB", "Assign clients to BDMs", "View team activity logs"]
        : isBdmMember
          ? ["Client-facing chat, calls, meetings", "Listings / GMB only if Super Admin grants access below"]
          : ["Backend ops on assigned clients", "Listings, NAP, GMB for assigned accounts"];

  const agentPermDefs = [
    ["listings", "Update listings"],
    ["nap", "Update NAP score"],
    ["logEdit", "Log unauthorized edits"],
    ["gmb", "GMB changes"],
  ];
  // BDM: default off (must be granted). Agent: default on.
  const defPerms = isBdmMember
    ? { listings: false, nap: false, logEdit: false, gmb: false }
    : { listings: true, nap: true, logEdit: true, gmb: true };
  const [perms, setPerms] = useState({ ...defPerms, ...(member.perms || {}) });
  const [canViewAccounts, setCanViewAccounts] = useState(!!member.canImpersonate);
  const [saving, setSaving] = useState(false);
  const dirtyOps =
    (isBdmMember || isAgentMember) &&
    JSON.stringify(perms) !== JSON.stringify({ ...defPerms, ...(member.perms || {}) });
  const dirtyMgr = member.role === "manager" && canViewAccounts !== !!member.canImpersonate;
  const dirty = dirtyOps || dirtyMgr;
  const togglePerm = (k) => {
    if (!canEdit) return;
    setPerms((p) => ({ ...p, [k]: !p[k] }));
  };

  const canAssign =
    canEdit && ((isBdmMember && isStaffMgr) || (isAgentMember && isAdmin));

  const save = async () => {
    if (!canEdit || !dirty) return;
    setSaving(true);
    try {
      if ((isBdmMember || isAgentMember) && (isStaffMgr || isAdmin)) {
        await api.patchProfile(member.id, { perms });
        await audit("staff.perms", {
          targetType: "staff",
          targetId: member.id,
          targetName: member.name,
          detail: Object.entries(perms)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ") || "none",
        });
      }
      if (member.role === "manager" && isAdmin && canViewAccounts !== !!member.canImpersonate) {
        await api.setImpersonateGrant(member.id, canViewAccounts);
        await audit("grant.impersonate", {
          targetType: "staff",
          targetId: member.id,
          targetName: member.name,
          detail: canViewAccounts ? "granted" : "revoked",
        });
      }
      await reload();
      toast("Permissions saved");
      onClose?.();
    } catch (e) {
      console.error(e);
      toast(e.message || "Could not save permissions", "info");
    } finally {
      setSaving(false);
    }
  };

  const PermRow = ({ ok, label }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        background: ok ? T.greenSoft : T.surface2,
        borderRadius: 10,
        border: `1px solid ${ok ? T.green + "33" : T.line}`,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: ok ? T.green : T.faint, width: 18, textAlign: "center" }}>
        {ok ? "✓" : "–"}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: ok ? T.ink : T.sub }}>{label}</span>
    </div>
  );

  return (
    <Modal open onClose={onClose} title={`Permissions · ${member.name}`}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <UserAvatar user={member} size={42} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{member.name}</div>
          <div style={{ fontSize: 12, color: T.sub }}>
            {member.email} · {role}
          </div>
        </div>
      </div>
      {isSelf && (
        <div
          style={{
            padding: "10px 13px",
            background: T.amberSoft,
            borderRadius: 11,
            fontSize: 12,
            color: T.amber,
            fontWeight: 600,
            marginBottom: 14,
            lineHeight: 1.45,
          }}
        >
          You can view your permissions, but you can&apos;t edit your own access.
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".6px", marginBottom: 8 }}>ROLE ACCESS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
        {rolePerms.map((p) => (
          <PermRow key={p} ok label={p} />
        ))}
      </div>
      {(isBdmMember || isAgentMember) && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".6px", marginBottom: 8 }}>
            {isBdmMember ? "BDM" : "AGENT"} ACTION ACCESS · {assignedCount} clients assigned
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {agentPermDefs.map(([k, label]) => (
              <label
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 12px",
                  background: perms[k] ? T.brandSoft : T.surface2,
                  border: `1.5px solid ${perms[k] ? T.brand : T.line}`,
                  borderRadius: 10,
                  cursor: canEdit && (isStaffMgr || isAdmin) ? "pointer" : "default",
                  opacity: canEdit || perms[k] ? 1 : 0.85,
                  transition: "all .12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!perms[k]}
                  disabled={!canEdit || !(isStaffMgr || isAdmin)}
                  onChange={() => togglePerm(k)}
                  style={{ width: 15, height: 15, accentColor: T.brand }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: perms[k] ? T.brand : T.sub }}>{label}</span>
              </label>
            ))}
          </div>
        </>
      )}
      {member.role === "manager" && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".6px", marginBottom: 8 }}>ACCOUNT ACCESS</div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 13px",
              background: canViewAccounts ? T.greenSoft : T.surface2,
              border: `1.5px solid ${canViewAccounts ? T.green : T.line}`,
              borderRadius: 11,
              cursor: canEdit && isAdmin ? "pointer" : "default",
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={canViewAccounts}
              disabled={!canEdit || !isAdmin}
              onChange={() => canEdit && isAdmin && setCanViewAccounts((v) => !v)}
              style={{ width: 15, height: 15, accentColor: T.green }}
            />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: canViewAccounts ? T.green : T.sub }}>Can view client accounts</div>
              <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>Open client dashboards in read-only mode</div>
            </div>
          </label>
        </>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".6px", marginBottom: 8 }}>MORE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
        <Btn
          variant="ghost"
          onClick={() => {
            onClose();
            setPage("team");
            setTeamView(member.id);
          }}
        >
          View logs
        </Btn>
        {canAssign && (
          <Btn variant="ghost" onClick={() => setModal({ type: "assign", agent: member })}>
            Assign clients
          </Btn>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
        {canEdit && ((isBdmMember || isAgentMember) && (isStaffMgr || isAdmin) || (member.role === "manager" && isAdmin)) && (
          <Btn onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save permissions"}
          </Btn>
        )}
      </div>
    </Modal>
  );
}
