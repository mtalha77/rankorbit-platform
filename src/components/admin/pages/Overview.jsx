import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T } from "../../../lib/theme";
import { buildListingsActivitySeries } from "../../../lib/helpers";
import { Badge, Card, Btn, StatCard, ChartTip, SectionTitle, PageHead, Empty } from "../../atoms";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

export function Overview() {
  const { isMobile, user, isAdmin, notifBadge, setPage, setSelClient, revenue, clients, listings, totalLive, totalPending, totalFlagged, actionNeeded, flat, PLANSV } = useAdmin();
  const plans = PLANSV || {};

  // Current MRR only — no invented past months (Stripe history not stored yet).
  const revMonth = new Date().toLocaleString("en-US", { month: "short" });
  const revData = [{ m: revMonth, r: revenue }];
  const listData = buildListingsActivitySeries(flat, 5);
  return (
    <div>
      <PageHead
        isMobile={isMobile}
        title="Platform Overview"
        sub={`Welcome back, ${user.name.split(" ")[0]}`}
        right={notifBadge > 0 ? <Btn variant="soft" size="sm" onClick={() => setPage("notifications")}>🔔 {notifBadge} new</Btn> : null}
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${isAdmin ? 4 : 3},1fr)`, gap: 14, marginBottom: 20 }}>
        {isAdmin && <StatCard label="Monthly Revenue" value={`$${revenue}`} sub={`${clients.length} active subscriptions`} icon="💰" color={T.green} soft={T.greenSoft} delay={0} />}
        <StatCard label="Clients" value={clients.length} sub="Across all plans" icon="👥" delay={70} />
        <StatCard label="Listings Live" value={totalLive} sub={`${totalPending} pending`} icon="🌐" color={T.blue} soft={T.blueSoft} delay={140} />
        <StatCard label="Needs Attention" value={totalFlagged} sub={`${actionNeeded} awaiting client action`} icon="🚩" color={T.red} soft={T.redSoft} delay={210} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.7fr 1fr", gap: 16, marginBottom: 16 }}>
        {isAdmin ? (
          <Card>
            <SectionTitle sub="Current MRR from active plans (Super Admin only)">Revenue</SectionTitle>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={revData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.green} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={T.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
                <XAxis dataKey="m" tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="r" name="MRR $" stroke={T.green} strokeWidth={2.5} fill="url(#rev)" dot={{ fill: T.green, r: 4, strokeWidth: 2, stroke: "#fff" }} animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card>
            <SectionTitle sub="New go-lives vs cumulative live (from live dates)">Listings Activity</SectionTitle>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={listData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
                <XAxis dataKey="m" tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="n" name="New" fill={T.brand} radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="l" name="Total live" fill={T.green} radius={[6, 6, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        <Card>
          <SectionTitle>Plan Distribution</SectionTitle>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={Object.entries(plans).map(([id, p]) => ({ n: p.name, v: clients.filter((c) => c.plan === id).length }))} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="v" strokeWidth={0} animationDuration={1000}>
                  {[T.blue, T.brand, T.violet].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {Object.entries(plans).map(([id, p], i) => (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: [T.blue, T.brand, T.violet][i] }} />
                <span style={{ fontSize: 12.5, color: T.sub }}>
                  {p.name} ${p.price}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{clients.filter((c) => c.plan === id).length}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <SectionTitle>Client Health</SectionTitle>
        {clients.length === 0 ? (
          <Empty icon="👥" title="No clients yet" sub="Add your first client to get started." />
        ) : (
          clients.map((c, i) => {
            const cl = listings[c.id] || [];
            const lv = cl.filter((l) => l.status === "live").length;
            const an = cl.filter((l) => l.actionNeeded).length;
            return (
              <div
                key={c.id}
                className="hoverRow"
                onClick={() => {
                  setSelClient(c.id);
                  setPage("clientDetail");
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 10px",
                  borderRadius: 12,
                  cursor: "pointer",
                  borderBottom: i < clients.length - 1 ? `1px solid ${T.line}` : "none",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <UserAvatar user={c} size={36} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.businessName || c.name}</div>
                    <div style={{ fontSize: 11, color: T.faint }}>{c.plan && plans[c.plan] ? `${plans[c.plan].name} · $${plans[c.plan].price}/mo` : "No plan"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {an > 0 && <Badge type="pending" label={`${an} action`} />}
                  {c.status === "suspended" && <Badge type="suspended" />}
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>{lv} live</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c.napScore >= 90 ? T.green : c.napScore >= 70 ? T.amber : T.red }}>NAP {c.napScore || 0}%</span>
                  <span style={{ color: T.brand, fontSize: 12.5, fontWeight: 800 }}>→</span>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
