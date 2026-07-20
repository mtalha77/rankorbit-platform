import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { Modal, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function LogEditModal({ client, onClose }) {
  const { audit, addActivity, reload, toast } = useAdmin();

  const [note, setNote] = useState("");
  const [shareWithClient, setShare] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const base = "Unauthorized edit blocked and reverted";
      const desc = note.trim() ? `${base}: ${note.trim()}` : base;
      // Always attach to the real client id (DB-safe). Internal-only uses a
      // separate type so it stays off the client activity feed.
      const type = shareWithClient ? "edit_blocked" : "edit_blocked_internal";
      await addActivity(client.id, type, desc);
      await audit("edit.revert", {
        targetType: "client",
        targetId: client.id,
        targetName: client.businessName || client.name,
        detail: note.trim() || "no note",
      });
      if (typeof reload === "function") await reload();
      if (typeof toast === "function") toast("Unauthorized edit logged & reverted");
      onClose();
    } catch (e) {
      console.error(e);
      if (typeof toast === "function") toast(e.message || "Could not log", "info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Log unauthorized edit">
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>
        Record an unauthorized change you caught and reverted. Add a note describing what was found.
      </div>
      <label style={{ fontSize: 11.5, color: T.sub, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: ".4px" }}>
        NOTES (what was changed?)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Business hours changed on Google without authorization, reverted to correct hours."
        rows={3}
        style={{
          width: "100%",
          padding: "11px 14px",
          background: T.surface,
          border: `1.5px solid ${T.line}`,
          borderRadius: 11,
          fontSize: 13,
          fontFamily: FONT_B,
          boxSizing: "border-box",
          resize: "vertical",
          marginBottom: 12,
        }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={shareWithClient}
          onChange={(e) => setShare(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: T.brand }}
        />
        <span style={{ fontSize: 12.5, color: T.sub }}>Show this note to the client in their activity feed</span>
      </label>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={save} disabled={saving}>
          {saving ? "Logging…" : "Log & revert"}
        </Btn>
      </div>
    </Modal>
  );
}
