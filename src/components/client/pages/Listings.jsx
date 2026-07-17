import { T } from "../../../lib/theme";
import { Badge, Card, StatCard, SectionTitle, Empty, PageHead } from "../../atoms";
import { ListingsLiveIcon, PendingIcon, NapScoreIcon, EditsBlockedIcon } from "../clientIcons";
import { useClient } from "../ClientContext";

export function Listings() {
  const { isMobile, plan, live, pending, napScore, my } = useClient();
  return (<div>
    <PageHead isMobile={isMobile} title="Listings & Citations" sub={`${plan.quota} on your ${plan.name} plan`}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="Live" value={live} icon={<ListingsLiveIcon/>} color={T.green} soft={T.greenSoft} delay={0}/>
      <StatCard label="Pending" value={pending} icon={<PendingIcon/>} color={T.amber} soft={T.amberSoft} delay={70}/>
      <StatCard label="NAP Score" value={`${napScore}%`} icon={<NapScoreIcon/>} delay={140}/>
      <StatCard label="Protected" value={my.length} sub="Monitored 24/7" icon={<EditsBlockedIcon/>} color={T.blue} soft={T.blueSoft} delay={210}/>
    </div>
    <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
      <SectionTitle>Your Directories</SectionTitle>
      {my.length===0?<Empty icon="📋" title="No listings yet" sub="Your directory submissions will appear here once your plan is active."/>:
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
        <thead><tr>{["Directory","Status","Authority","Live Since","Info Match","Link"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
        <tbody>{my.map((d)=>(<tr key={d.id} className="hoverRow">
          <td style={{padding:"12px",fontSize:13.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:44,height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}><div style={{width:`${d.da}%`,height:"100%",background:d.da>=80?T.green:d.da>=60?T.amber:T.faint,borderRadius:3,animation:"growBar .9s ease both"}}/></div>
              <span style={{fontSize:12,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub}}>{d.da}</span>
            </div>
          </td>
          <td style={{padding:"12px",fontSize:12.5,color:d.liveDate==="–"?T.faint:T.ink,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="–"?<span style={{fontSize:12,color:T.faint}}>–</span>:<Badge type={d.napMatch}/>}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:12}}>–</span>}</td>
        </tr>))}</tbody>
      </table>}
    </Card>
  </div>);
}
