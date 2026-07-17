import { useState } from "react";
import { T } from "../../../lib/theme";
import { Card, Empty, ListToolbar, PageHead, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function AuditTrail() {
  const { isMobile, data } = useAdmin();

    const[search,setSearch]=useState("");
    const[actionF,setActionF]=useState("all");
    const auditRows=(data.audit||[]);
    const actions=[...new Set(auditRows.map(a=>a.action))];
    let filtered=auditRows;
    if(actionF!=="all")filtered=filtered.filter(a=>a.action===actionF);
    if(search)filtered=filtered.filter(a=>`${a.actorName} ${a.action} ${a.targetName} ${a.detail}`.toLowerCase().includes(search.toLowerCase()));
    const cols=[
      {key:"createdAt",label:"When",get:a=>new Date(a.createdAt).toLocaleString()},
      {key:"actorName",label:"Staff"},{key:"actorRole",label:"Role"},
      {key:"action",label:"Action"},{key:"targetName",label:"Target"},{key:"detail",label:"Detail"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Audit Trail" sub="Every sensitive staff action, who did what, and when"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search staff, action, target…"
        filters={[{value:actionF,set:setActionF,options:[{value:"all",label:"All actions"},...actions.map(a=>({value:a,label:a}))]}]}
        rows={filtered} cols={cols} exportName="naporbit-audit" exportTitle="Audit Trail"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="🛡️" title="No audit records yet" sub="Staff actions like edits, deletes, and suspensions are logged here."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["When","Staff","Action","Target","Detail"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a=>(<tr key={a.id} className="hoverRow">
            <td style={{padding:"10px 12px",fontSize:11.5,color:T.faint,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</td>
            <td style={{padding:"10px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}><b>{a.actorName}</b><br/><span style={{fontSize:10.5,color:T.faint}}>{a.actorRole}</span></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={a.action.includes("delete")?"rejected":a.action.includes("suspend")?"pending":"submitted"} label={a.action}/></td>
            <td style={{padding:"10px 12px",fontSize:12.5,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{a.targetName||"–"}</td>
            <td style={{padding:"10px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{a.detail||"–"}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  }
