import { useEffect, useState } from "react";
import { T } from "../../lib/theme";
import { api } from "../../lib/api";
import { Card, Btn, Input, SectionTitle } from "../atoms";
import { useClient } from "./ClientContext";

const norm = (v) => String(v || "").trim().toLowerCase();

export function ReportCard({ user, reload, toast, readOnly = false }) {
  const { onUserUpdate } = useClient() || {};
  const [email, setEmail] = useState(user.reportEmail || user.email || "");
  const [committed, setCommitted] = useState(norm(user.reportEmail));
  const [saving, setSaving] = useState(false);
  const sent = user.reportSentMonth;
  const savedEmail = committed || norm(user.reportEmail);
  const draft = norm(email);
  const unchanged = !!draft && draft === savedEmail;
  const invalid = !draft || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft);

  useEffect(() => {
    const next = norm(user.reportEmail);
    if (next) setCommitted(next);
    setEmail(user.reportEmail || user.email || "");
  }, [user.id, user.reportEmail, user.email]);

  const save = async () => {
    if (readOnly) {
      toast("View-only — changes are disabled", "info");
      return;
    }
    if (invalid) {
      toast("Enter a valid email address", "info");
      return;
    }
    if (unchanged) {
      toast("This report email is already saved.", "info");
      return;
    }
    setSaving(true);
    try {
      await api.patchProfile(user.id, { reportEmail: draft });
      setCommitted(draft);
      setEmail(draft);
      onUserUpdate?.({ reportEmail: draft });
      await reload();
      toast("Report email saved");
    } catch (e) {
      toast("Could not save", "info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <SectionTitle sub="Your detailed monthly GMB performance report, delivered to your inbox by your account manager.">
        Monthly Report
      </SectionTitle>
      {sent && (
        <div
          style={{
            padding: "11px 14px",
            background: T.greenSoft,
            borderRadius: 11,
            marginBottom: 14,
            fontSize: 12.5,
            color: T.green,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Report sent for {sent}
        </div>
      )}
      {savedEmail && unchanged && (
        <div style={{ fontSize: 12, color: T.green, fontWeight: 700, marginBottom: 8 }}>
          Saved: {savedEmail}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <Input
            label="Send my report to"
            value={email}
            onChange={readOnly ? () => {} : setEmail}
            placeholder="you@business.com"
            validate="email"
          />
        </div>
        {unchanged ? (
          <Btn variant="soft" disabled style={{ marginBottom: 14 }}>
            Saved
          </Btn>
        ) : (
          <Btn onClick={save} disabled={saving || readOnly || invalid} style={{ marginBottom: 14 }}>
            {readOnly ? "View-only" : saving ? "Saving…" : "Save email"}
          </Btn>
        )}
      </div>
    </Card>
  );
}
