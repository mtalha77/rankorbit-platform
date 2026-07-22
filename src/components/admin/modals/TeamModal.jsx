import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { staffRoleLabel } from "../../../lib/helpers";
import { Modal, Input, Select, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function TeamModal({ onClose }) {
  const { isAdmin, audit, toast, reload } = useAdmin();

  const [f, setF] = useState({ role: isAdmin ? "manager" : "bdm" });
  const [errs, setErrs] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    if (errs[k]) setErrs((e) => ({ ...e, [k]: "" }));
  };

  const invite = async () => {
    const next = { name: "", email: "" };
    if (!String(f.name || "").trim()) next.name = "This field is required";
    if (!String(f.email || "").trim()) next.email = "This field is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) next.email = "Enter a valid email address";
    setErrs(next);
    if (next.name || next.email) return;
    setSaving(true);
    try {
      const r = await api.createStaff({ name: f.name, email: f.email, role: f.role });
      if (r.error) {
        toast(r.error, "info");
        return;
      }
      await audit("staff.create", { targetType: "staff", targetName: f.name, detail: staffRoleLabel(f.role) });
      await reload();
      toast(`Invite sent to ${f.email}. They set a password from the email link.`);
      onClose();
    } catch (e) {
      console.error(e);
      toast(e.message || "Could not invite team member", "info");
    } finally {
      setSaving(false);
    }
  };

  const roleOpts = isAdmin
    ? [
        { value: "super_admin", label: "Super Admin" },
        { value: "manager", label: "Manager" },
        { value: "bdm", label: "BDM" },
        { value: "agent", label: "Agent" },
      ]
    : [{ value: "bdm", label: "BDM" }];

  return (
    <Modal open onClose={onClose} title="Invite Team Member">
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 16, lineHeight: 1.5 }}>
        Sends a staff invite email. They accept the link, set a password, and sign in at the staff portal. Clients never receive this invite — they create accounts via signup.
      </div>
      <Input label="Full Name" value={f.name} onChange={(v) => set("name", v)} placeholder="Team member name" required error={errs.name} />
      <Input label="Email" value={f.email} onChange={(v) => set("email", v)} placeholder="name@naporbit.com" validate="email" required error={errs.email} />
      <Select label="Role" value={f.role} onChange={(v) => set("role", v)} options={roleOpts} />
      <div style={{ padding: "11px 14px", background: T.amberSoft, borderRadius: 11, fontSize: 11.5, color: T.amber, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>
        Staff invites send via Resend (accept link + set password). Clients never get this — they use signup + confirm only.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="green" onClick={invite} disabled={saving}>
          {saving ? "Sending…" : "Send invite"}
        </Btn>
      </div>
    </Modal>
  );
}
