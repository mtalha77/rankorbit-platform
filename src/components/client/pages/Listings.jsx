import { useState, useMemo } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { listingInDateWindow, LISTING_DATE_FILTER_OPTS } from "../../../lib/helpers";
import { Badge, Card, StatCard, SectionTitle, Empty, PageHead, ListToolbar } from "../../atoms";
import { ListingsLiveIcon, PendingIcon, NapScoreIcon, EditsBlockedIcon } from "../clientIcons";
import { useClient } from "../ClientContext";

export function Listings() {
  const { isMobile, plan, napScore, my } = useClient();
  const [search, setSearch] = useState("");
  const [timeF, setTimeF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const dated = useMemo(() => (my || []).filter((l) => listingInDateWindow(l, timeF)), [my, timeF]);

  const filtered = useMemo(() => {
    let rows = dated;
    if (statusF !== "all") rows = rows.filter((l) => l.status === statusF);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => `${l.directory} ${l.status} ${l.liveDate || ""} ${l.submitted || ""}`.toLowerCase().includes(q));
    }
    return rows;
  }, [dated, statusF, search]);

  const live = dated.filter((l) => l.status === "live").length;
  const pending = dated.filter((l) => l.status === "pending" || l.status === "submitted").length;

  const statuses = useMemo(() => {
    const set = new Set((my || []).map((l) => l.status).filter(Boolean));
    return ["all", ...[...set].sort()];
  }, [my]);

  const exportCols = [
    { key: "directory", label: "Directory" },
    { key: "status", label: "Status" },
    { key: "da", label: "Authority" },
    { key: "submitted", label: "Submitted" },
    { key: "liveDate", label: "Live Since" },
    { key: "napMatch", label: "Info Match" },
    { key: "liveLink", label: "Link" },
  ];

  return (
    <div>
      <PageHead isMobile={isMobile} title="Listings & Citations" sub={`${plan.quota} on your ${plan.name} plan`} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Live" value={live} icon={<ListingsLiveIcon />} color={T.green} soft={T.greenSoft} delay={0} />
        <StatCard label="Pending" value={pending} icon={<PendingIcon />} color={T.amber} soft={T.amberSoft} delay={70} />
        <StatCard label="NAP Score" value={`${napScore}%`} icon={<NapScoreIcon />} delay={140} />
        <StatCard label="Protected" value={dated.length} sub={timeF === "all" ? "Monitored 24/7" : "In date range"} icon={<EditsBlockedIcon />} color={T.blue} soft={T.blueSoft} delay={210} />
      </div>
      <Card style={{ overflowX: "auto", padding: isMobile ? 14 : 22 }}>
        <SectionTitle sub={timeF !== "all" ? `Showing ${filtered.length} of ${my.length} listings` : undefined}>Your Directories</SectionTitle>
        <ListToolbar
          search={search}
          setSearch={setSearch}
          placeholder="🔍  Search directory, status…"
          filters={[
            { value: timeF, set: setTimeF, options: LISTING_DATE_FILTER_OPTS },
            {
              value: statusF,
              set: setStatusF,
              options: statuses.map((s) => ({
                value: s,
                label: s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1),
              })),
            },
          ]}
          rows={filtered}
          cols={exportCols}
          exportName="naporbit-my-listings"
          exportTitle="My Listings"
        />
        {filtered.length === 0 ? (
          <Empty
            icon="📋"
            title="No listings in this range"
            sub={my.length === 0 ? "Your directory submissions will appear here once your plan is active." : "Try All time or a wider date range."}
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                {["Directory", "Status", "Authority", "Submitted", "Live Since", "Info Match", "Link"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: T.faint,
                      textTransform: "uppercase",
                      letterSpacing: ".7px",
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
                  <td style={{ padding: "12px", fontSize: 13.5, fontWeight: 700, borderBottom: `1px solid ${T.line}` }}>{d.directory}</td>
                  <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}>
                    <Badge type={d.status} />
                  </td>
                  <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 44, height: 5, background: T.surface2, borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${d.da}%`,
                            height: "100%",
                            background: d.da >= 80 ? T.green : d.da >= 60 ? T.amber : T.faint,
                            borderRadius: 3,
                            animation: "growBar .9s ease both",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: d.da >= 80 ? T.green : d.da >= 60 ? T.amber : T.sub }}>{d.da}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12.5, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>
                    {d.submitted || "–"}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: 12.5,
                      color: d.liveDate === "–" ? T.faint : T.ink,
                      fontWeight: 600,
                      borderBottom: `1px solid ${T.line}`,
                      fontFamily: FONT_B,
                    }}
                  >
                    {d.liveDate}
                  </td>
                  <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}>
                    {d.napMatch === "–" ? <span style={{ fontSize: 12, color: T.faint }}>–</span> : <Badge type={d.napMatch} />}
                  </td>
                  <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}>
                    {d.liveLink ? (
                      <a href={d.liveLink} target="_blank" rel="noreferrer" style={{ color: T.brand, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                        View ↗
                      </a>
                    ) : (
                      <span style={{ color: T.faint, fontSize: 12 }}>–</span>
                    )}
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
