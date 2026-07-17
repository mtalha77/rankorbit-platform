import { useState } from "react";
import { T, FONT_D } from "../../../lib/theme";
import { PLANS } from "../../../lib/constants";
import { Card, Badge, ListToolbar, PageHead, StatCard, Empty } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function Finance() {
  const { isMobile, clients } = useAdmin();

    const[search,setSearch]=useState("");
    const[statusF,setStatusF]=useState("all");
    const[planF,setPlanF]=useState("all");
    // Lifecycle status per client: cancelled > paused > active. Uses real profile fields.
    const lifecycle=(c)=>{
      if(c.status==="suspended")return "paused";
      if(c.cancelAtPeriodEnd||c.canceledAt)return c.plan?"cancelling":"cancelled";
      if(c.plan&&c.status==="active")return "active";
      return "no plan";
    };
    const monthsActive=(c)=>{
      if(!c.createdAt)return 1;
      const start=new Date(c.createdAt);const end=c.canceledAt?new Date(c.canceledAt):new Date();
      return Math.max(1,Math.round((end-start)/2629800000));
    };
    const priceOf=(c)=>PLANS[c.plan]?.price||0;
    const ltv=(c)=>priceOf(c)*monthsActive(c);
    const rows=clients.map(c=>({...c,_status:lifecycle(c),_ltv:ltv(c),_months:monthsActive(c)}));
    // Metrics
    const activeClients=rows.filter(r=>r._status==="active"||r._status==="cancelling");
    const activeMRR=activeClients.reduce((s,c)=>s+priceOf(c),0);
    const thisMonth=new Date().getMonth();
    const newThisMonth=rows.filter(c=>c.createdAt&&new Date(c.createdAt).getMonth()===thisMonth).length;
    const churnedThisMonth=rows.filter(c=>c.canceledAt&&new Date(c.canceledAt).getMonth()===thisMonth).length;
    const churnedMRR=rows.filter(c=>c._status==="cancelled").reduce((s,c)=>s+priceOf(c),0);
    let filtered=rows;
    if(statusF!=="all")filtered=filtered.filter(r=>r._status===statusF);
    if(planF!=="all")filtered=filtered.filter(r=>r.plan===planF);
    if(search)filtered=filtered.filter(r=>`${r.businessName} ${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
    const fmtDate=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"–";
    const statusColor={active:T.green,cancelling:T.amber,cancelled:T.red,paused:T.faint,"no plan":T.faint};
    const cols=[
      {key:"businessName",label:"Business"},{key:"email",label:"Email"},
      {key:"plan",label:"Plan",get:c=>PLANS[c.plan]?.name||"None"},
      {label:"Price",get:c=>`$${priceOf(c)}`},
      {label:"Status",get:c=>c._status},
      {label:"Signed Up",get:c=>fmtDate(c.createdAt)},
      {label:"Cancelled/Paused",get:c=>fmtDate(c.canceledAt)},
      {label:"Months",get:c=>c._months},{label:"LTV",get:c=>`$${c._ltv}`},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Finance" sub="Full subscription lifecycle, revenue, and churn"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Active MRR" value={`$${activeMRR}`} sub={`${activeClients.length} paying`} icon="💵" color={T.green} soft={T.greenSoft}/>
        <StatCard label="New This Month" value={newThisMonth} sub="signups" icon="📈" color={T.brand} soft={T.brandSoft}/>
        <StatCard label="Churned This Month" value={churnedThisMonth} sub="cancellations" icon="📉" color={T.red} soft={T.redSoft}/>
        <StatCard label="Lost MRR" value={`$${churnedMRR}`} sub="from cancelled" icon="⚠️" color={T.amber} soft={T.amberSoft}/>
      </div>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search business, email…"
        filters={[
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"cancelling",label:"Cancelling"},{value:"cancelled",label:"Cancelled"},{value:"paused",label:"Paused"},{value:"no plan",label:"No plan"}]},
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-finance" exportTitle="Finance Lifecycle"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="💰" title="No clients match" sub="Adjust filters."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
          <thead><tr>{["Business","Plan","Status","Signed Up","Cancelled/Paused","Months","LTV"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(c=>(<tr key={c.id} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c.businessName||c.name}<br/><span style={{fontSize:11,color:T.faint,fontWeight:400}}>{c.email}</span></td>
            <td style={{padding:"11px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}>{PLANS[c.plan]?.name||"–"}<br/><span style={{fontSize:11,color:T.faint}}>${priceOf(c)}/mo</span></td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><span style={{fontSize:11,fontWeight:800,color:statusColor[c._status],background:statusColor[c._status]+"1a",padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{c._status}</span></td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.createdAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.canceledAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c._months}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:T.green,borderBottom:`1px solid ${T.line}`}}>${c._ltv}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  }
