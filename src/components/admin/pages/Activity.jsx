import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { actIcon } from "../../../lib/helpers";
import { Card, Empty, ListToolbar, PageHead, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

function PlatformActivity() {
  const { activity, clients } = useAdmin();
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [byF, setByF] = useState("all");
  const [timeF, setTimeF] = useState("all");
  const types = [...new Set(activity.map((a) => a.type))];
  const people = [...new Set(activity.map((a) => a.by).filter(Boolean))];
  const inWindow = (dateStr) => {
    if (timeF === "all") return true;
    const d = new Date(dateStr);
    if (isNaN(d)) return true;
    const days = (Date.now() - d.getTime()) / 86400000;
    return timeF === "7" ? days <= 7 : timeF === "30" ? days <= 30 : timeF === "90" ? days <= 90 : true;
  };
  const filtered = activity.filter((a) => {
    if (typeF !== "all" && a.type !== typeF) return false;
    if (byF !== "all" && a.by !== byF) return false;
    if (!inWindow(a.date)) return false;
    if (search) {
      const cn = clients.find((c) => c.id === a.clientId)?.businessName || "";
      if (!`${a.desc} ${a.by} ${cn}`.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });
  const cols = [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "desc", label: "Event" },
    { label: "Client", get: (a) => clients.find((c) => c.id === a.clientId)?.businessName || "–" },
    { key: "by", label: "By" },
  ];
  return (
    <>
      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="🔍  Search event, person, client…"
        filters={[
          { value: typeF, set: setTypeF, options: [{ value: "all", label: "All types" }, ...types.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))] },
          { value: byF, set: setByF, options: [{ value: "all", label: "All people" }, ...people.map((p) => ({ value: p, label: p }))] },
          {
            value: timeF,
            set: setTimeF,
            options: [
              { value: "all", label: "All time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ],
          },
        ]}
        rows={filtered}
        cols={cols}
        exportName="naporbit-activity"
        exportTitle="Activity Log"
      />
      <Card>
        {filtered.length === 0 ? (
          <Empty icon="📜" title="No matching activity" sub="Try a different search or filter." />
        ) : (
          filtered.map((a, i) => (
            <div
              key={a.id}
              className="hoverRow"
              style={{
                display: "flex",
                gap: 13,
                padding: "11px 8px",
                borderRadius: 10,
                borderBottom: i < filtered.length - 1 ? `1px solid ${T.line}` : "none",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  background: T.surface2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {actIcon(a.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.desc}</div>
                  <div style={{ fontSize: 11, color: T.faint }}>{a.date}</div>
                </div>
                <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>
                  {clients.find((c) => c.id === a.clientId)?.businessName || "–"} · by {a.by}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function StaffAudit() {
  const { data } = useAdmin();
  const [search, setSearch] = useState("");
  const [actionF, setActionF] = useState("all");
  const auditRows = data.audit || [];
  const actions = [...new Set(auditRows.map((a) => a.action))];
  let filtered = auditRows;
  if (actionF !== "all") filtered = filtered.filter((a) => a.action === actionF);
  if (search) {
    filtered = filtered.filter((a) =>
      `${a.actorName} ${a.action} ${a.targetName} ${a.detail}`.toLowerCase().includes(search.toLowerCase())
    );
  }
  const cols = [
    { key: "createdAt", label: "When", get: (a) => new Date(a.createdAt).toLocaleString() },
    { key: "actorName", label: "Staff" },
    { key: "actorRole", label: "Role" },
    { key: "action", label: "Action" },
    { key: "targetName", label: "Target" },
    { key: "detail", label: "Detail" },
  ];
  return (
    <>
      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="🔍  Search staff, action, target…"
        filters={[
          {
            value: actionF,
            set: setActionF,
            options: [{ value: "all", label: "All actions" }, ...actions.map((a) => ({ value: a, label: a }))],
          },
        ]}
        rows={filtered}
        cols={cols}
        exportName="naporbit-audit"
        exportTitle="Audit Trail"
      />
      <Card style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <Empty icon="🛡️" title="No audit records yet" sub="Staff actions like edits, deletes, and suspensions are logged here." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                {["When", "Staff", "Action", "Target", "Detail"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: T.faint,
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      borderBottom: `1.5px solid ${T.line}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="hoverRow">
                  <td style={{ padding: "10px 12px", fontSize: 11.5, color: T.faint, borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, borderBottom: `1px solid ${T.line}` }}>
                    <b>{a.actorName}</b>
                    <br />
                    <span style={{ fontSize: 10.5, color: T.faint }}>{a.actorRole}</span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.line}` }}>
                    <Badge
                      type={a.action.includes("delete") ? "rejected" : a.action.includes("suspend") ? "pending" : "submitted"}
                      label={a.action}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>
                    {a.targetName || "–"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: T.sub, borderBottom: `1px solid ${T.line}` }}>
                    {a.detail || "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

export function Activity() {
  const { isMobile, isAdmin } = useAdmin();
  const [tab, setTab] = useState("platform"); // platform | audit

  const tabs = isAdmin
    ? [
        { id: "platform", label: "Platform activity" },
        { id: "audit", label: "Staff audit" },
      ]
    : [{ id: "platform", label: "Platform activity" }];

  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="Activity Logs"
        sub={
          isAdmin
            ? "Platform events and staff audit actions in one place"
            : "Every platform event, newest first"
        }
      />
      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: `1.5px solid ${tab === t.id ? T.brand : T.line}`,
                background: tab === t.id ? T.brandSoft : T.surface,
                color: tab === t.id ? T.brand : T.sub,
                fontFamily: FONT_B,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {tab === "audit" && isAdmin ? <StaffAudit /> : <PlatformActivity />}
    </div>
  );
}
