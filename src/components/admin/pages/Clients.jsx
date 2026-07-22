import { useState, useMemo } from "react";
import { T, FONT_D } from "../../../lib/theme";
import { PLANS } from "../../../lib/constants";
import { clientDaysMetrics, urgencyDaysColor } from "../../../lib/helpers";
import { Badge, Card, Btn, Empty, ListToolbar, PageHead } from "../../atoms";
import { clientPaymentBadge } from "../adminUtils";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

function daysTone(colorKey) {
  if (colorKey === "red") return T.red;
  if (colorKey === "amber") return T.amber;
  return T.green;
}

export function Clients() {
  const { isMobile, clients, staff, listings, isStaffMgr, setModal, setSelClient, setPage } = useAdmin();

  const [search, setSearch] = useState("");
  const [planF, setPlanF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [sortF, setSortF] = useState("soonest"); // soonest | name

  const filtered = useMemo(() => {
    const rows = clients.filter((c) => {
      if (search && !`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (planF !== "all" && c.plan !== planF) return false;
      if (statusF !== "all" && (c.status || "active") !== statusF) return false;
      return true;
    });

    const withMetrics = rows.map((c) => {
      const cl = listings[c.id] || [];
      const metrics = clientDaysMetrics(c, cl);
      // Non-staff: hide BDM wait chip from urgency (still compute for export if needed)
      if (!isStaffMgr && metrics.chips?.length) {
        const chips = metrics.chips.filter((x) => x.kind !== "bdm");
        if (chips.length !== metrics.chips.length) {
          const top = chips[0];
          return {
            c,
            cl,
            metrics: top
              ? {
                  ...metrics,
                  chips,
                  urgencyDays: top.days,
                  urgencyKind: top.kind,
                  urgencyLabel: top.label,
                  urgencySortKey: top.sortKey,
                  bdmWaitDays: null,
                }
              : {
                  ...metrics,
                  chips,
                  urgencyDays: null,
                  urgencyKind: null,
                  urgencyLabel: null,
                  urgencySortKey: null,
                  bdmWaitDays: null,
                },
          };
        }
      }
      return { c, cl, metrics };
    });

    withMetrics.sort((a, b) => {
      if (sortF === "name") {
        const an = (a.c.businessName || a.c.name || "").toLowerCase();
        const bn = (b.c.businessName || b.c.name || "").toLowerCase();
        return an.localeCompare(bn);
      }
      // Soonest / most urgent first (lower urgencySortKey first)
      const ae = a.metrics.urgencySortKey;
      const be = b.metrics.urgencySortKey;
      if (ae == null && be == null) {
        return (a.c.businessName || a.c.name || "").localeCompare(b.c.businessName || b.c.name || "");
      }
      if (ae == null) return 1;
      if (be == null) return -1;
      if (ae !== be) return ae - be;
      return (a.c.businessName || a.c.name || "").localeCompare(b.c.businessName || b.c.name || "");
    });

    return withMetrics;
  }, [clients, listings, search, planF, statusF, sortF, isStaffMgr]);

  const exportCols = [
    { key: "businessName", label: "Business" },
    { key: "name", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "plan", label: "Plan", get: (c) => (c.plan ? PLANS[c.plan]?.name : "None") },
    { key: "status", label: "Status", get: (c) => c.status || "active" },
    { key: "napScore", label: "NAP %" },
    { label: "Live Listings", get: (c) => (listings[c.id] || []).filter((l) => l.status === "live").length },
    {
      label: "Plan days left",
      get: (c) => {
        const m = clientDaysMetrics(c, listings[c.id] || []);
        return m.planDaysLeft ?? "";
      },
    },
    {
      label: "Grace days left",
      get: (c) => {
        const m = clientDaysMetrics(c, listings[c.id] || []);
        if (m.graceExpired) return 0;
        return m.graceDaysLeft ?? "";
      },
    },
    {
      label: "Listing pending days",
      get: (c) => clientDaysMetrics(c, listings[c.id] || []).listingPendingDays ?? "",
    },
    {
      label: "BDM wait days",
      get: (c) => clientDaysMetrics(c, listings[c.id] || []).bdmWaitDays ?? "",
    },
  ];

  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="Clients"
        sub={`${clients.length} clients`}
        right={isStaffMgr && <Btn onClick={() => setModal({ type: "clientForm" })}>+ Add Client</Btn>}
      />
      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="🔍  Search by business, name, email, city…"
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
          {
            value: sortF,
            set: setSortF,
            options: [
              { value: "soonest", label: "Soonest first" },
              { value: "name", label: "Name A–Z" },
            ],
          },
        ]}
        rows={filtered.map((x) => x.c)}
        cols={exportCols}
        exportName="naporbit-clients"
        exportTitle="Clients"
      />
      {filtered.length === 0 ? (
        <Card>
          <Empty icon="🔍" title="No clients found" sub="Try a different search or filter, or add a client." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(({ c, cl, metrics }) => {
            const lv = cl.filter((l) => l.status === "live").length;
            const pd = cl.filter((l) => l.status === "pending").length;
            const fl = cl.filter((l) => l.status === "flagged" || l.status === "rejected").length;
            const an = cl.filter((l) => l.actionNeeded).length;
            const bdm = c.assignedBdmId ? staff.find((s) => s.id === c.assignedBdmId) : null;
            const agent = c.assignedAgentId ? staff.find((s) => s.id === c.assignedAgentId) : null;
            const tone = daysTone(urgencyDaysColor(metrics.urgencyDays, metrics.graceExpired, metrics.urgencyKind));
            const secondary = (metrics.chips || []).slice(1, 3);

            return (
              <Card key={c.id} hover style={{ cursor: "pointer" }}>
                <div
                  onClick={() => {
                    setSelClient(c.id);
                    setPage("clientDetail");
                  }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0, flex: "1 1 220px" }}>
                    <UserAvatar user={c} size={46} style={{ borderRadius: 14 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: FONT_D, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {c.businessName || c.name}
                        {c.status === "suspended" && <Badge type="suspended" />}
                        {(() => {
                          const b = clientPaymentBadge(c);
                          return b ? <Badge type={b.type} label={b.label} /> : null;
                        })()}
                        {isStaffMgr && c.plan && !c.assignedBdmId && <Badge type="pending" label="Needs BDM" />}
                      </div>
                      <div style={{ fontSize: 12, color: T.sub }}>
                        {c.name} · {c.city || "–"}
                        {c.state ? ", " + c.state : ""} · {c.category || "–"}
                        {isStaffMgr ? ` · BDM: ${bdm?.name || "Unassigned"} · Agent: ${agent?.name || "Unassigned"}` : ""}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: isMobile ? 88 : 110,
                      textAlign: "center",
                      padding: "4px 8px",
                      borderRadius: 10,
                      background: metrics.urgencyLabel ? (tone === T.red ? T.redSoft : tone === T.amber ? T.amberSoft : T.surface2) : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 9.5, color: T.faint, fontWeight: 800, letterSpacing: ".5px", marginBottom: 2 }}>DAYS</div>
                    {metrics.urgencyLabel ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 800, color: tone, fontFamily: FONT_D, lineHeight: 1.2 }}>{metrics.urgencyLabel}</div>
                        {secondary.length > 0 && (
                          <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 600, marginTop: 3, lineHeight: 1.35 }}>
                            {secondary.map((x) => x.label).join(" · ")}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.faint }}>–</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: isMobile ? 12 : 18, alignItems: "center", flexWrap: "wrap" }}>
                    {an > 0 && <Badge type="pending" label={`${an} action`} />}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: T.green, fontFamily: FONT_D }}>{lv}</div>
                      <div style={{ fontSize: 9.5, color: T.faint, fontWeight: 700, letterSpacing: ".5px" }}>LIVE</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: T.amber, fontFamily: FONT_D }}>{pd}</div>
                      <div style={{ fontSize: 9.5, color: T.faint, fontWeight: 700, letterSpacing: ".5px" }}>PENDING</div>
                    </div>
                    {fl > 0 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: T.red, fontFamily: FONT_D }}>{fl}</div>
                        <div style={{ fontSize: 9.5, color: T.faint, fontWeight: 700, letterSpacing: ".5px" }}>FLAGS</div>
                      </div>
                    )}
                    <Badge type="submitted" label={c.plan ? `$${PLANS[c.plan].price}/mo` : "No plan"} />
                    <span style={{ color: T.brand, fontWeight: 800 }}>→</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
