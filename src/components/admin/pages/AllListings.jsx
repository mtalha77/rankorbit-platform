import { useState, useMemo } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { listingInDateWindow, LISTING_DATE_FILTER_OPTS } from "../../../lib/helpers";
import { Badge, Card, Btn, Empty, ListToolbar, PageHead } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function AllListings() {
  const { isMobile, isAgent, isBdm, clients, flat, labelForClientId, setSelClient, setPage } = useAdmin();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [timeF, setTimeF] = useState("all");

  // BDM / Agent only see listings for their assigned clients; managers/SA see all.
  const scopedIds = useMemo(() => new Set(clients.map((c) => String(c.id))), [clients]);
  const withNames = useMemo(() => {
    const scopedFlat = isAgent || isBdm ? flat.filter((l) => scopedIds.has(String(l.clientId))) : flat;
    return scopedFlat.map((l) => ({ ...l, _name: labelForClientId(l.clientId) }));
  }, [flat, isAgent, isBdm, scopedIds, labelForClientId]);

  const dated = useMemo(
    () => withNames.filter((l) => listingInDateWindow(l, timeF)),
    [withNames, timeF]
  );

  let filtered =
    filter === "all"
      ? dated
      : filter === "action"
        ? dated.filter((l) => l.actionNeeded)
        : dated.filter((l) => l.status === filter);
  if (search) {
    filtered = filtered.filter((l) =>
      `${l._name} ${l.directory} ${l.status}`.toLowerCase().includes(search.toLowerCase())
    );
  }

  const cnt = (s) =>
    s === "all"
      ? dated.length
      : s === "action"
        ? dated.filter((l) => l.actionNeeded).length
        : dated.filter((l) => l.status === s).length;

  const exportCols = [
    { key: "_name", label: "Client" },
    { key: "directory", label: "Directory" },
    { key: "status", label: "Status" },
    { key: "da", label: "DA" },
    { key: "submitted", label: "Submitted" },
    { key: "liveDate", label: "Live Date" },
    { key: "napMatch", label: "NAP" },
    { label: "Action Needed", get: (l) => (l.actionNeeded ? "Yes" : "No") },
    { key: "actionNote", label: "Action Note" },
  ];

  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="All Listings"
        sub={`${dated.length}${timeF !== "all" ? ` in range · ` : " "}${withNames.length} total across ${clients.length} clients`}
      />
      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="🔍  Search client, directory, status…"
        filters={[{ value: timeF, set: setTimeF, options: LISTING_DATE_FILTER_OPTS }]}
        rows={filtered}
        cols={exportCols}
        exportName="naporbit-listings"
        exportTitle="All Listings"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {["all", "live", "pending", "submitted", "flagged", "rejected", "action"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "7px 15px",
              borderRadius: 20,
              border: `1.5px solid ${filter === s ? T.brand : T.line}`,
              background: filter === s ? T.brandSoft : T.surface,
              color: filter === s ? T.brand : T.sub,
              fontSize: 12.5,
              fontWeight: filter === s ? 800 : 600,
              cursor: "pointer",
              fontFamily: FONT_B,
            }}
          >
            {s === "action" ? "⚠️ Client action" : s[0].toUpperCase() + s.slice(1)} ({cnt(s)})
          </button>
        ))}
      </div>
      <Card style={{ overflowX: "auto", padding: isMobile ? 14 : 22 }}>
        {filtered.length === 0 ? (
          <Empty icon="📋" title="Nothing here" sub={`No ${filter === "all" ? "" : filter + " "}listings in this date range.`} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr>
                {["Client", "Directory", "Status", "DA", "Submitted", "Live", "NAP", "Flag", "Action"].map((h) => (
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
              {filtered.map((d) => (
                <tr key={d.id} className="hoverRow">
                  <td style={{ padding: "11px 12px", fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>
                    {d._name}
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${T.line}` }}>{d.directory}</td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${T.line}` }}>
                    <Badge type={d.status} />
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: d.da >= 80 ? T.green : d.da >= 60 ? T.amber : T.sub,
                      borderBottom: `1px solid ${T.line}`,
                    }}
                  >
                    {d.da || "–"}
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>
                    {d.submitted || "–"}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 12,
                      color: d.liveDate === "–" ? T.faint : T.green,
                      fontWeight: 700,
                      borderBottom: `1px solid ${T.line}`,
                    }}
                  >
                    {d.liveDate}
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${T.line}` }}>
                    {d.napMatch === "–" ? <span style={{ fontSize: 11, color: T.faint }}>–</span> : <Badge type={d.napMatch} />}
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${T.line}` }}>
                    {d.actionNeeded ? (
                      <span title={d.actionNote} style={{ fontSize: 14 }}>
                        ⚠️
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: T.faint }}>–</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: `1px solid ${T.line}` }}>
                    <Btn
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setSelClient(d.clientId);
                        setPage("clientDetail");
                      }}
                    >
                      Open
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
