import { useState, useEffect } from "react";
import { T, FONT_D, FONT_B } from "../../../lib/theme";
import { PLANS } from "../../../lib/constants";
import { api } from "../../../lib/api";
import { actIcon } from "../../../lib/helpers";
import { Badge, Card, Btn, Empty, SectionTitle } from "../../atoms";
import ChatThread from "../../ChatThread";
import { useAdmin } from "../AdminContext";

export function ClientDetail() {
  const { selClient, clients, listings, gmb, analytics, activity, isMobile, isStaffMgr, isAdmin, isAgent, user, canImpersonate, setViewAs, setPage, setSelClient, setModal, setConfirm, R, audit, toast, addActivity } = useAdmin();

    const c=clients.find(x=>x.id===selClient);
    const[nap,setNap]=useState(0);
    const[chatOpen,setChatOpen]=useState(false);
    useEffect(()=>{
      if(c)setNap(c.napScore||0);
    },[c?.id,c?.napScore]);
    useEffect(()=>{
      setChatOpen(false);
    },[c?.id]);
    if(!c)return(
      <Card>
        <Empty icon="👤" title="Client not found" sub="Go back to Clients and pick another account."/>
        <Btn variant="soft" size="sm" onClick={()=>{setPage("clients");setSelClient(null);}}>← Clients</Btn>
      </Card>
    );
    const cl=listings[c.id]||[];
    // Agents reach ClientDetail only for clients assigned to them (clients list is pre-scoped),
    // so if an agent can open this client, they're allowed to edit it.
    const canEdit=isStaffMgr||(isAgent&&c.assignedAgentId===user.id);
    // Per-action permissions. Staff/managers have all; agents limited by their granted perms.
    const ap=user.perms||{listings:true,nap:true,logEdit:true,gmb:true};
    const can=(action)=>isStaffMgr||(isAgent&&c.assignedAgentId===user.id&&ap[action]!==false);
    const fmtDT=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"";
    return(<div>
      {c.status==="suspended"&&<Card style={{marginBottom:16,background:T.redSoft,border:`1px solid ${T.red}33`}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>⏸</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:T.red}}>Account suspended</div>
            <div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.6}}>
              {c.suspendedAt&&<>Suspended on <b>{fmtDT(c.suspendedAt)}</b></>}{c.suspendedBy&&<> by <b>{c.suspendedBy}</b></>}.
              {c.suspendReason?<><br/>Reason: {c.suspendReason}</>:<><br/>No reason recorded.</>}
            </div>
          </div>
        </div>
      </Card>}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,padding:"7px 14px",color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>← Clients</button>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?17:21,fontWeight:800}}>{c.businessName||c.name}</div>
        <Badge type={c.status==="suspended"?"suspended":"active"}/>{c.plan&&<Badge type="submitted" label={`${PLANS[c.plan].name} $${PLANS[c.plan].price}/mo`}/>}
      </div>
      {(canEdit||can("gmb")||can("nap")||can("logEdit")||can("listings"))&&<div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <Btn variant={chatOpen?"soft":"ghost"} size="sm" onClick={()=>setChatOpen(o=>!o)}>{chatOpen?"Hide chat":"💬 Open chat"}</Btn>
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"clientForm",client:c})}>✏️ Edit Info</Btn>}
        {canImpersonate&&<Btn variant="soft" size="sm" onClick={()=>{audit("client.impersonate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});setViewAs(c.id);}}>👁️ Open Account (read-only)</Btn>}
        {(isStaffMgr||can("gmb"))&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>🔗 Integrations</Btn>}
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"analytics",client:c})}>📈 Update Analytics</Btn>}
        {c.plan==="gmb"&&can("gmb")&&(gmb[c.id]?.source!=="google")&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>📍 Update GMB</Btn>}
        {c.plan==="gmb"&&can("gmb")&&gmb[c.id]?.source==="google"&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>📍 Google synced</Btn>}
        {c.plan==="gmb"&&isStaffMgr&&<Btn variant="soft" size="sm" onClick={()=>{const month=new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"});setConfirm({title:"Mark report as sent?",msg:`Confirm you've emailed the ${month} GMB report to ${c.reportEmail||c.email}. The client will see "Report sent for ${month}".`,yes:"Mark sent",onYes:()=>R(async()=>{await api.patchProfile(c.id,{reportSentMonth:month});await audit("report.sent",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name,detail:month});await addActivity(c.id,"gmb_update",`Monthly report sent for ${month}`);},"Report marked as sent")});}}>📤 Mark Report Sent</Btn>}
        {isStaffMgr&&(c.status==="active"?
          <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"suspend",client:c})}>⏸ Suspend</Btn>:
          <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.patchProfile(c.id,{status:"active",suspendedAt:null,suspendReason:null,suspendedBy:null});await audit("client.reactivate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client reactivated")}>▶ Reactivate</Btn>)}
        {isAdmin&&!c.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Delete client?",msg:`Move ${c.businessName||c.name} to Trash? Recoverable for 30 days, then permanently removed with all their listings.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteUser(c.id);await audit("client.delete",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client moved to Trash").then(()=>{setPage("clients");setSelClient(null);})})}>🗑 Delete</Btn>}
        {c.protected&&<span style={{fontSize:11,color:T.faint,alignSelf:"center"}}>🔒 Demo account (protected)</span>}
      </div>}
      {!(canEdit||can("gmb")||can("nap")||can("logEdit")||can("listings"))&&(
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          <Btn variant={chatOpen?"soft":"ghost"} size="sm" onClick={()=>setChatOpen(o=>!o)}>{chatOpen?"Hide chat":"💬 Open chat"}</Btn>
        </div>
      )}
      {chatOpen&&(
        <div style={{marginBottom:18}}>
          <ChatThread
            clientId={c.id}
            myId={user.id}
            peerLabel={c.businessName||c.name||c.email}
            toast={toast}
            compact
          />
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:18}}>
        <Card><SectionTitle>Business Info</SectionTitle>
          {[["Owner",c.name],["Email",c.email],["Phone",c.phone],["Address",`${c.address||"–"}${c.city?", "+c.city:""}${c.state?", "+c.state:""}`],["Website",c.website||"–"],["Category",c.category||"–"],["GA4 ID",c.gaId||"Not connected"],["GBP ID",c.gbpId||"Not connected"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{fontSize:12.5,color:T.faint,fontWeight:700}}>{k}</span><span style={{fontSize:12.5,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{v}</span>
            </div>))}
        </Card>
        <Card><SectionTitle>NAP Consistency</SectionTitle>
          <div style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,textAlign:"center",padding:"8px 0",color:nap>=90?T.green:nap>=70?T.amber:T.red}}>{nap}%</div>
          {can("nap")||can("logEdit")?<>
          {can("nap")&&<><input type="range" min="0" max="100" value={nap} onChange={e=>setNap(+e.target.value)} style={{width:"100%",accentColor:T.brand}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>setModal({type:"napConfirm",client:c,newScore:nap})}>Save NAP Score</Btn></>}
          {can("logEdit")&&<button onClick={()=>setModal({type:"logEdit",client:c})} style={{width:"100%",marginTop:10,padding:"11px 0",background:T.redSoft,border:"none",borderRadius:11,color:T.red,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:FONT_B}}>🛡️ Log Unauthorized Edit + Revert</button>}</>:
          <div style={{fontSize:12,color:T.faint,textAlign:"center"}}>View only</div>}
        </Card>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Listings ({cl.length})</div>
          {can("listings")&&<Btn size="sm" onClick={()=>setModal({type:"addListing",clientId:c.id})}>+ Add Listing</Btn>}
        </div>
        {cl.length===0?<Empty icon="📋" title="No listings yet" sub="Add the first directory submission."/>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cl.map(d=>(<div key={d.id} style={{border:`1px solid ${d.actionNeeded?T.amber:T.line}`,borderRadius:13,padding:"14px 16px",background:d.actionNeeded?T.amberSoft:T.surface}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13.5,fontWeight:800}}>{d.directory}</span>
                <Badge type={d.status}/>
                {d.napMatch&&d.napMatch!=="–"&&<Badge type={d.napMatch}/>}
                {d.da>0&&<span style={{fontSize:11,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.faint}}>DA {d.da}</span>}
                {d.liveLink&&<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12,fontWeight:700,textDecoration:"none"}}>View ↗</a>}
              </div>
              {can("listings")&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"updateListing",listing:d,clientId:c.id})}>Update</Btn>}
            </div>
            {d.actionNeeded&&<div style={{marginTop:10,padding:"9px 12px",background:"#fff",borderRadius:9,fontSize:12,color:T.amber,fontWeight:700,display:"flex",alignItems:"center",gap:7}}>⚠️ Client action: {d.actionNote||"Verification required from the client"}</div>}
            {d.notes&&<div style={{marginTop:8,fontSize:12,color:T.sub,lineHeight:1.5}}><b style={{color:T.faint}}>Notes:</b> {d.notes}</div>}
          </div>))}
        </div>}
      </Card>
      <Card><SectionTitle>Activity Log</SectionTitle>
        {activity.filter(a=>a.clientId===c.id).length===0?<Empty icon="📜" title="No activity yet" sub="Actions for this client appear here."/>:
          activity.filter(a=>a.clientId===c.id).map((a,i,arr)=>(<div key={a.id} style={{display:"flex",gap:12,padding:"10px 6px",borderBottom:i<arr.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
            <div><div style={{fontSize:12.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
          </div>))}
      </Card>
    </div>);
  }
