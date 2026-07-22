import { useState } from "react";
import { T, FONT_D } from "../../../lib/theme";
import { PLANS } from "../../../lib/constants";
import { Badge, Card, Btn, Empty, ListToolbar, PageHead } from "../../atoms";
import { clientPaymentBadge } from "../adminUtils";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

export function Clients() {
  const { isMobile, clients, staff, listings, isStaffMgr, setModal, setSelClient, setPage } = useAdmin();

    const[search,setSearch]=useState("");
    const[planF,setPlanF]=useState("all");
    const[statusF,setStatusF]=useState("all");
    const filtered=clients.filter(c=>{
      if(search&&!`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase()))return false;
      if(planF!=="all"&&c.plan!==planF)return false;
      if(statusF!=="all"&&(c.status||"active")!==statusF)return false;
      return true;
    });
    const exportCols=[
      {key:"businessName",label:"Business"},{key:"name",label:"Contact"},{key:"email",label:"Email"},
      {key:"phone",label:"Phone"},{key:"city",label:"City"},{key:"state",label:"State"},
      {key:"plan",label:"Plan",get:c=>c.plan?PLANS[c.plan]?.name:"None"},
      {key:"status",label:"Status",get:c=>c.status||"active"},
      {key:"napScore",label:"NAP %"},
      {label:"Live Listings",get:c=>(listings[c.id]||[]).filter(l=>l.status==="live").length},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Clients" sub={`${clients.length} clients`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"clientForm"})}>+ Add Client</Btn>}/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search by business, name, email, city…"
        filters={[
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]},
        ]}
        rows={filtered} cols={exportCols} exportName="naporbit-clients" exportTitle="Clients"/>
      {filtered.length===0?<Card><Empty icon="🔍" title="No clients found" sub="Try a different search or filter, or add a client."/></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((c,idx)=>{
          const cl=listings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const pd=cl.filter(l=>l.status==="pending").length;const fl=cl.filter(l=>l.status==="flagged"||l.status==="rejected").length;const an=cl.filter(l=>l.actionNeeded).length;
          const bdm=c.assignedBdmId?staff.find(s=>s.id===c.assignedBdmId):null;
          const agent=c.assignedAgentId?staff.find(s=>s.id===c.assignedAgentId):null;
          return(<Card key={c.id} hover style={{cursor:"pointer"}}>
            <div onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <UserAvatar user={c} size={46} style={{borderRadius:14}}/>
                <div>
                  <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    {c.businessName||c.name}
                    {c.status==="suspended"&&<Badge type="suspended"/>}
                    {(()=>{const b=clientPaymentBadge(c);return b?<Badge type={b.type} label={b.label}/>:null;})()}
                    {isStaffMgr&&c.plan&&!c.assignedBdmId&&<Badge type="pending" label="Needs BDM"/>}
                  </div>
                  <div style={{fontSize:12,color:T.sub}}>{c.name} · {c.city||"–"}{c.state?", "+c.state:""} · {c.category||"–"}{isStaffMgr?` · BDM: ${bdm?.name||"Unassigned"} · Agent: ${agent?.name||"Unassigned"}`:""}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:isMobile?12:18,alignItems:"center",flexWrap:"wrap"}}>
                {an>0&&<Badge type="pending" label={`${an} action`}/>}
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.green,fontFamily:FONT_D}}>{lv}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>LIVE</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.amber,fontFamily:FONT_D}}>{pd}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>PENDING</div></div>
                {fl>0&&<div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.red,fontFamily:FONT_D}}>{fl}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>FLAGS</div></div>}
                <Badge type="submitted" label={c.plan?`$${PLANS[c.plan].price}/mo`:"No plan"}/>
                <span style={{color:T.brand,fontWeight:800}}>→</span>
              </div>
            </div>
          </Card>);})}
      </div>}
    </div>);
  }
