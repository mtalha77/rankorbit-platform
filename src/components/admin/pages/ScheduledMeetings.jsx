import { useState, useEffect, useCallback } from "react";
import { T, FONT_D, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { isBookingPast } from "../../../lib/helpers";
import { Badge, Card, Btn, Empty, PageHead, StatCard } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function ScheduledMeetings() {
  const { isMobile, isAdmin, isBdm, toast, setSelClient, setPage, labelForClientId } = useAdmin();
  const [meetings, setMeetings] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | confirmed
  const [openId, setOpenId] = useState(null);
  const [zoomById, setZoomById] = useState({});
  const [zoomErr, setZoomErr] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.listMyMeetings();
    setLoading(false);
    if (r.error) {
      toast(r.error, "info");
      setMeetings([]);
      setCounts({ total: 0, pending: 0, confirmed: 0 });
      return;
    }
    setMeetings(r.meetings || []);
    setCounts(r.counts || { total: 0, pending: 0, confirmed: 0 });
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = meetings.filter((m) => {
    if (filter === "pending") return m.status === "pending";
    if (filter === "confirmed") return m.status === "confirmed";
    return true;
  });

  const respond = async (m, action) => {
    const meetingUrl = (zoomById[m.id] || "").trim();
    if (action === "confirm" || action === "share_link") {
      if (!meetingUrl) {
        setZoomErr((prev) => ({ ...prev, [m.id]: "Zoom / meeting link is required" }));
        setOpenId(m.id);
        return;
      }
      try {
        new URL(meetingUrl);
      } catch {
        setZoomErr((prev) => ({ ...prev, [m.id]: "Enter a valid URL (https://…)" }));
        setOpenId(m.id);
        return;
      }
    }
    setBusyId(m.id + action);
    const r = await api.respondCall({
      bookingId: m.id,
      action,
      meetingUrl: action === "confirm" || action === "share_link" ? meetingUrl : undefined,
    });
    setBusyId(null);
    if (r.error) {
      toast(r.error, "info");
      return;
    }
    toast(
      action === "confirm"
        ? "Meeting confirmed"
        : action === "cancel"
          ? "Meeting cancelled"
          : "Zoom link shared"
    );
    await load();
  };

  const canAct = !isAdmin;
  const statusBadge = (s) =>
    s === "confirmed" ? { type: "live", label: "Confirmed" } : { type: "pending", label: "Awaiting confirmation" };

  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="Scheduled Meetings"
        sub={
          isBdm
            ? "Upcoming calls booked with you — confirm pending requests and share Zoom links"
            : "Upcoming client ↔ BDM meetings across the team"
        }
        right={
          <Btn variant="soft" size="sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Btn>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatCard label="Upcoming" value={counts.total} icon="📅" color={T.brand} soft={T.brandSoft} />
        <StatCard label="Pending" value={counts.pending} icon="⏳" color={T.amber} soft={T.amberSoft} />
        <StatCard label="Confirmed" value={counts.confirmed} icon="✅" color={T.green} soft={T.greenSoft} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "confirmed", label: "Confirmed" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${filter === f.id ? T.brand : T.line}`,
              background: filter === f.id ? T.brandSoft : T.surface,
              color: filter === f.id ? T.brand : T.sub,
              fontFamily: FONT_B,
              fontWeight: 800,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 28, textAlign: "center", color: T.faint, fontSize: 13 }}>Loading meetings…</div>
        ) : filtered.length === 0 ? (
          <Empty
            icon="📅"
            title="No scheduled meetings"
            sub={
              filter === "pending"
                ? "No pending requests right now."
                : filter === "confirmed"
                  ? "No confirmed meetings upcoming."
                  : "When a client books a call with you, it shows up here."
            }
          />
        ) : (
          filtered.map((m, i) => {
            const clientLabel =
              m.client?.businessName || m.client?.name || labelForClientId?.(m.clientId) || "Client";
            const badge = statusBadge(m.status);
            const past = isBookingPast(m.slotDate, m.slotTime);
            const open = openId === m.id;
            return (
              <div
                key={m.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.line}` : "none",
                  opacity: past ? 0.7 : 1,
                }}
              >
                <div
                  onClick={() => setOpenId(open ? null : m.id)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "14px 6px",
                    cursor: "pointer",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: m.status === "confirmed" ? T.greenSoft : T.amberSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {m.status === "confirmed" ? "✅" : "⏳"}
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 800 }}>{clientLabel}</span>
                      <Badge type={badge.type} label={badge.label} />
                      <Badge type="submitted" label={m.kind === "guidance" ? "Guidance" : "Regular"} />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginTop: 4 }}>
                      {m.slotDate} · {m.slotTime}
                    </div>
                    <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>
                      {m.client?.email || ""}
                      {!isBdm && m.agent?.name ? ` · BDM: ${m.agent.name}` : ""}
                      {m.note ? ` · Note: ${m.note}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: T.brand, fontWeight: 800, alignSelf: "center" }}>
                    {open ? "Hide" : "Details"} →
                  </span>
                </div>

                {open && (
                  <div style={{ padding: "0 6px 16px 60px" }}>
                    {m.meetingUrl && (
                      <div style={{ marginBottom: 10, fontSize: 12.5 }}>
                        <span style={{ fontWeight: 700, color: T.sub }}>Join link: </span>
                        <a href={m.meetingUrl} target="_blank" rel="noreferrer" style={{ color: T.brand, fontWeight: 700 }}>
                          {m.meetingUrl}
                        </a>
                      </div>
                    )}

                    {canAct && m.status === "pending" && !past && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.sub, marginBottom: 6 }}>
                          Zoom / meeting link (required to confirm)
                        </div>
                        <input
                          value={zoomById[m.id] || ""}
                          onChange={(e) => {
                            setZoomById((prev) => ({ ...prev, [m.id]: e.target.value }));
                            setZoomErr((prev) => ({ ...prev, [m.id]: "" }));
                          }}
                          placeholder="https://zoom.us/j/…"
                          style={{
                            width: "100%",
                            maxWidth: 420,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1.5px solid ${zoomErr[m.id] ? T.red : T.line}`,
                            background: T.surface,
                            color: T.ink,
                            fontSize: 13,
                            fontFamily: FONT_B,
                            boxSizing: "border-box",
                          }}
                        />
                        {zoomErr[m.id] && (
                          <div style={{ fontSize: 11, color: T.red, marginTop: 5, fontWeight: 600 }}>{zoomErr[m.id]}</div>
                        )}
                      </div>
                    )}

                    {canAct && m.status === "confirmed" && !m.meetingUrl && !past && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12.5, color: T.amber, fontWeight: 700, marginBottom: 8 }}>
                          Confirmed without a join link — share one so the client can join.
                        </div>
                        <input
                          value={zoomById[m.id] || ""}
                          onChange={(e) => {
                            setZoomById((prev) => ({ ...prev, [m.id]: e.target.value }));
                            setZoomErr((prev) => ({ ...prev, [m.id]: "" }));
                          }}
                          placeholder="https://zoom.us/j/…"
                          style={{
                            width: "100%",
                            maxWidth: 420,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1.5px solid ${zoomErr[m.id] ? T.red : T.line}`,
                            background: T.surface,
                            color: T.ink,
                            fontSize: 13,
                            fontFamily: FONT_B,
                            boxSizing: "border-box",
                          }}
                        />
                        {zoomErr[m.id] && (
                          <div style={{ fontSize: 11, color: T.red, marginTop: 5, fontWeight: 600 }}>{zoomErr[m.id]}</div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {m.clientId && (
                        <Btn
                          variant="soft"
                          size="sm"
                          onClick={() => {
                            setSelClient(m.clientId);
                            setPage("clientDetail");
                          }}
                        >
                          Open client →
                        </Btn>
                      )}
                      {m.meetingUrl && (
                        <Btn size="sm" onClick={() => window.open(m.meetingUrl, "_blank", "noopener,noreferrer")}>
                          Join meeting
                        </Btn>
                      )}
                      {canAct && m.status === "pending" && !past && (
                        <>
                          <Btn variant="green" size="sm" disabled={!!busyId} onClick={() => respond(m, "confirm")}>
                            {busyId === m.id + "confirm" ? "Confirming…" : "Confirm + share link"}
                          </Btn>
                          <Btn variant="danger" size="sm" disabled={!!busyId} onClick={() => respond(m, "cancel")}>
                            {busyId === m.id + "cancel" ? "Cancelling…" : "Cancel"}
                          </Btn>
                        </>
                      )}
                      {canAct && m.status === "confirmed" && !m.meetingUrl && !past && (
                        <Btn variant="green" size="sm" disabled={!!busyId} onClick={() => respond(m, "share_link")}>
                          {busyId === m.id + "share_link" ? "Sharing…" : "Share Zoom link"}
                        </Btn>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
