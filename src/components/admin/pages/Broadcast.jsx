import { useEffect, useMemo, useState } from "react";
import { T, FONT_D } from "../../../lib/theme";
import { PLANS } from "../../../lib/constants";
import { api } from "../../../lib/api";
import { Badge, Card, Btn, Empty, ListToolbar, PageHead, Modal } from "../../atoms";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

export function canUseBroadcast(user) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.perms?.broadcastClients === true;
}

export function Broadcast() {
  const { isMobile, clients, toast, setConfirm, audit } = useAdmin();

  const [search, setSearch] = useState("");
  const [planF, setPlanF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [draftId, setDraftId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search && !`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (planF !== "all" && c.plan !== planF) return false;
      if (statusF !== "all" && (c.status || "active") !== statusF) return false;
      return true;
    });
  }, [clients, search, planF, statusF]);

  const loadDrafts = async () => {
    const r = await api.listBroadcastDrafts();
    if (r.error) {
      toast(r.error, "info");
      return;
    }
    setDrafts(r.drafts || []);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const canSend = selected.size > 0 && (sendEmail || sendInApp) && (title.trim() || body.trim()) && !sending;

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const c of filtered) next.delete(c.id);
      } else {
        for (const c of filtered) next.add(c.id);
      }
      return next;
    });
  };

  const resetCompose = () => {
    setDraftId(null);
    setDraftName("");
    setTitle("");
    setBody("");
    setSendEmail(true);
    setSendInApp(true);
  };

  const loadDraft = (d) => {
    setDraftId(d.id);
    setDraftName(d.name || "");
    setTitle(d.title || "");
    setBody(d.body || "");
    setSendEmail(d.sendEmail !== false);
    setSendInApp(d.sendInApp !== false);
  };

  const saveDraft = async () => {
    if (!title.trim() && !body.trim()) {
      toast("Add a title or body before saving a draft", "info");
      return;
    }
    setSavingDraft(true);
    try {
      const r = await api.saveBroadcastDraft({
        id: draftId || undefined,
        name: draftName,
        title,
        body,
        sendEmail,
        sendInApp,
      });
      if (r.error) {
        toast(r.error, "info");
        return;
      }
      setDraftId(r.draft?.id || draftId);
      toast("Draft saved");
      await loadDrafts();
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteDraft = (id) => {
    setConfirm({
      title: "Delete draft?",
      msg: "This cannot be undone.",
      danger: true,
      yes: "Delete",
      onYes: async () => {
        const r = await api.deleteBroadcastDraft(id);
        if (r.error) toast(r.error, "info");
        else {
          toast("Draft deleted");
          if (draftId === id) resetCompose();
          await loadDrafts();
        }
      },
    });
  };

  const openPreview = async () => {
    if (!title.trim() && !body.trim()) {
      toast("Add a title or body to preview", "info");
      return;
    }
    setPreviewBusy(true);
    try {
      const r = await api.previewNotifyEmail({ title, body });
      if (r.error) {
        toast(r.error, "info");
        return;
      }
      setPreviewHtml(r.html || "");
    } finally {
      setPreviewBusy(false);
    }
  };

  const doSend = async () => {
    const ids = [...selected];
    if (!ids.length || !(sendEmail || sendInApp)) return;
    setSending(true);
    let ok = 0;
    let fail = 0;
    try {
      for (let i = 0; i < ids.length; i++) {
        const clientId = ids[i];
        const r = await api.notifyClient({
          clientId,
          type: "info",
          title: title.trim() || "NAP Orbit update",
          body: body.trim() || "You have a new update in your dashboard.",
          sendEmail,
          sendInApp,
          meta: { source: "admin_broadcast" },
        });
        if (r.ok) ok++;
        else fail++;
        if (i < ids.length - 1) await new Promise((res) => setTimeout(res, 80));
      }
      await audit("broadcast.send", {
        targetType: "clients",
        targetId: null,
        targetName: `${ok} clients`,
        detail: `${title.trim() || "(no title)"} · email=${sendEmail} inApp=${sendInApp}${fail ? ` · ${fail} failed` : ""}`,
      });
      toast(fail ? `Sent to ${ok}, failed ${fail}` : `Sent to ${ok} client${ok === 1 ? "" : "s"}`);
      setSelected(new Set());
    } finally {
      setSending(false);
    }
  };

  const requestSend = () => {
    if (!canSend) return;
    const n = selected.size;
    if (n >= 10) {
      setConfirm({
        title: `Send to ${n} clients?`,
        msg: `This will deliver to ${n} selected clients (${[sendEmail && "email", sendInApp && "in-app"].filter(Boolean).join(" + ")}).`,
        yes: "Send",
        onYes: () => doSend(),
      });
      return;
    }
    doSend();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${T.line}`,
    background: T.surface,
    color: T.ink,
    fontSize: 13.5,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="Broadcast"
        sub="Message selected clients — same email template as other notifications"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Card>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Recipients · {selected.size} selected</div>
          <ListToolbar
            search={search}
            setSearch={setSearch}
            placeholder="🔍  Search clients…"
            filters={[
              { value: planF, set: setPlanF, options: [{ value: "all", label: "All plans" }, ...Object.entries(PLANS).map(([id, p]) => ({ value: id, label: p.name }))] },
              {
                value: statusF,
                set: setStatusF,
                options: [
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ],
              },
            ]}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 4px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              color: T.sub,
              cursor: filtered.length ? "pointer" : "default",
            }}
          >
            <input
              type="checkbox"
              checked={allFilteredSelected}
              disabled={!filtered.length}
              onChange={toggleAllFiltered}
              style={{ width: 15, height: 15, accentColor: T.brand }}
            />
            Select all filtered ({filtered.length})
          </label>
          {filtered.length === 0 ? (
            <Empty icon="🔍" title="No clients" sub="Try a different filter." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: isMobile ? 320 : 480, overflowY: "auto" }}>
              {filtered.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${selected.has(c.id) ? T.brand : T.line}`,
                    background: selected.has(c.id) ? T.brandSoft : T.surface2,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    style={{ width: 15, height: 15, accentColor: T.brand }}
                  />
                  <UserAvatar user={c} size={36} style={{ borderRadius: 10 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT_D }}>{c.businessName || c.name}</div>
                    <div style={{ fontSize: 11.5, color: T.sub }}>
                      {c.email}
                      {c.plan ? ` · ${PLANS[c.plan]?.name || c.plan}` : " · No plan"}
                    </div>
                  </div>
                  {c.status === "suspended" && <Badge type="suspended" />}
                </label>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Compose</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 4 }}>Draft name (optional)</div>
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. March reminder" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 4 }}>Title</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Email subject / in-app title" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 4 }}>Body</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message body…"
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${sendEmail ? T.brand : T.line}`,
                  background: sendEmail ? T.brandSoft : T.surface2,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <input type="checkbox" checked={sendEmail} onChange={() => setSendEmail((v) => !v)} style={{ accentColor: T.brand }} />
                Send email
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${sendInApp ? T.brand : T.line}`,
                  background: sendInApp ? T.brandSoft : T.surface2,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <input type="checkbox" checked={sendInApp} onChange={() => setSendInApp((v) => !v)} style={{ accentColor: T.brand }} />
                In-app notification
              </label>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={resetCompose} disabled={sending}>
                Clear
              </Btn>
              <Btn variant="soft" onClick={openPreview} disabled={previewBusy || (!title.trim() && !body.trim())}>
                {previewBusy ? "Preview…" : "Preview email"}
              </Btn>
              <Btn variant="soft" onClick={saveDraft} disabled={savingDraft || (!title.trim() && !body.trim())}>
                {savingDraft ? "Saving…" : "Save draft"}
              </Btn>
              <Btn onClick={requestSend} disabled={!canSend}>
                {sending ? "Sending…" : `Send${selected.size ? ` (${selected.size})` : ""}`}
              </Btn>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Saved drafts</div>
            {drafts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: T.sub }}>No drafts yet. Save compose content for later (recipients are not stored).</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 11,
                      border: `1px solid ${draftId === d.id ? T.brand : T.line}`,
                      background: draftId === d.id ? T.brandSoft : T.surface2,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{d.name || d.title || "(untitled)"}</div>
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                        {[d.sendEmail !== false && "email", d.sendInApp !== false && "in-app"].filter(Boolean).join(" · ") || "no channels"}
                      </div>
                    </div>
                    <Btn size="sm" variant="soft" onClick={() => loadDraft(d)}>
                      Load
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => deleteDraft(d.id)}>
                      Delete
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {previewHtml != null && (
        <Modal open onClose={() => setPreviewHtml(null)} title="Email preview" width={640}>
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            style={{ width: "100%", height: isMobile ? 420 : 560, border: `1px solid ${T.line}`, borderRadius: 12, background: "#fff" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => setPreviewHtml(null)}>
              Close
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
