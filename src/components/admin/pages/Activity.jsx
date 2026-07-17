import { useState } from "react";
import { T } from "../../../lib/theme";
import { actIcon } from "../../../lib/helpers";
import { Card, Empty, ListToolbar, PageHead, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function Activity() {
  const { isMobile, activity, labelForClientId, clients } = useAdmin();

    const[search,setSearch]=useState("");
    const[typeF,setTypeF]=useState("all");
    const[byF,setByF]=useState("all");
    const[timeF,setTimeF]=useState("all");
    const types=[...new Set(activity.map(a=>a.type))];
    const people=[...new Set(activity.map(a=>a.by).filter(Boolean))];
    const inWindow=(dateStr)=>{
      if(timeF==="all")return true;
      const d=new Date(dateStr);if(isNaN(d))return true;
      const days=(Date.now()-d.getTime())/86400000;
      return timeF==="7"?days<=7:timeF==="30"?days<=30:timeF==="90"?days<=90:true;
    };
    let filtered=activity.filter(a=>{
      if(typeF!=="all"&&a.type!==typeF)return false;
      if(byF!=="all"&&a.by!==byF)return false;
      if(!inWindow(a.date))return false;
      if(search){const cn=clients.find(c=>c.id===a.clientId)?.businessName||"";if(!`${a.desc} ${a.by} ${cn}`.toLowerCase().includes(search.toLowerCase()))return false;}
      return true;
    });
    const cols=[
      {key:"date",label:"Date"},{key:"type",label:"Type"},{key:"desc",label:"Event"},
      {label:"Client",get:a=>clients.find(c=>c.id===a.clientId)?.businessName||"–"},{key:"by",label:"By"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Activity Log" sub="Every platform event, newest first"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search event, person, client…"
        filters={[
          {value:typeF,set:setTypeF,options:[{value:"all",label:"All types"},...types.map(t=>({value:t,label:t.replace(/_/g," ")}))]},
          {value:byF,set:setByF,options:[{value:"all",label:"All people"},...people.map(p=>({value:p,label:p}))]},
          {value:timeF,set:setTimeF,options:[{value:"all",label:"All time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"}]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-activity" exportTitle="Activity Log"/>
      <Card>
        {filtered.length===0?<Empty icon="📜" title="No matching activity" sub="Try a different search or filter."/>:
          filtered.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<filtered.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                <div style={{fontSize:13,fontWeight:600}}>{a.desc}</div>
                <div style={{fontSize:11,color:T.faint}}>{a.date}</div>
              </div>
              <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{clients.find(c=>c.id===a.clientId)?.businessName||"–"} · by {a.by}</div>
            </div>
          </div>))}
      </Card>
    </div>);
  }
