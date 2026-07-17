import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../../../lib/theme";
import { Badge, Card, StatCard, ChartTip, SectionTitle, Empty, PageHead } from "../../atoms";
import { useClient } from "../ClientContext";

export function Analytics() {
  const { isMobile, myAnalytics } = useClient();

    const a=myAnalytics;
    if(!a||!a.trend?.length)return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website"/>
      <Card><Empty icon="📈" title="Analytics not connected yet" sub="Your account manager will connect Google Analytics or add your numbers soon."/></Card>
    </div>);
    return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website" right={<Badge type={a.source==="connected"?"connected":"manual"}/>}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Sessions" value={a.sessions||0} icon="👣" color={T.green} soft={T.greenSoft} delay={0}/>
        <StatCard label="Users" value={a.users||0} icon="👤" delay={70}/>
        <StatCard label="Page Views" value={a.pageviews||0} icon="📄" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Avg. Time" value={a.avgTime||"0:00"} icon="⏱️" color={T.violet} soft={T.violetSoft} delay={210}/>
      </div>
      <Card><SectionTitle sub="Monthly website sessions & users">Traffic Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={a.trend}>
            <defs><linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.25}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="s" name="Sessions" stroke={T.brand} strokeWidth={2.5} fill="url(#as)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="u" name="Users" stroke={T.green} strokeWidth={2} fill="none" dot={false} animationDuration={1300}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>);
  
}
