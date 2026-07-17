import { useState } from "react";
import { T, FONT_D, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { actIcon } from "../../../lib/helpers";
import { Badge, Card, Btn, Empty, PageHead, SectionTitle } from "../../atoms";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

function CredsRow({ m }) {
  const { toast } = useAdmin();

    const[show,setShow]=useState(false);
    const copy=(txt,label)=>{try{navigator.clipboard.writeText(txt);toast(`${label} copied`);}catch{toast("Copy failed","info");}};
    const Field=({label,value,mono})=>(
      <div style={{flex:"1 1 200px"}}>
        <div style={{fontSize:10,fontWeight:800,color:T.faint,letterSpacing:".5px",marginBottom:4}}>{label}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <code style={{flex:1,fontSize:12.5,fontFamily:mono?"monospace":FONT_B,background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,padding:"7px 10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</code>
          <button onClick={()=>copy(value,label)} title="Copy" style={{border:"none",background:T.surface2,borderRadius:8,padding:"7px 9px",cursor:"pointer",fontSize:12}}>📋</button>
        </div>
      </div>
    );
    return(<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10.5,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>🔑 LOGIN CREDENTIALS{m.createdByRole?` · created by ${m.createdByRole}`:""}</span>
        <button onClick={()=>setShow(s=>!s)} style={{border:"none",background:"none",color:T.brand,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>{show?"Hide":"Show"}</button>
      </div>
      {show&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Field label="EMAIL" value={m.email}/>
        <Field label="PASSWORD" value={m.staffPassword} mono/>
      </div>}
    </div>);
  }

export function Team() {
  const {
    isMobile, isAdmin, isStaffMgr, staff, user, allClients, activity,
    teamView, setTeamView, setModal, setConfirm, R, audit, toast, setPage, setSelClient,
  } = useAdmin();

    // Managers see agents + themselves (not super-admins), and cannot manage grants/removal.
    const visibleStaff=isAdmin?staff:staff.filter(m=>m.role==="agent"||m.id===user.id);
    if(teamView){
      const m=staff.find(x=>x.id===teamView);
      if(!m){setTeamView(null);return null;}
      // This member's actions across the platform (audit + activity they performed).
      const memberActs=activity.filter(a=>a.by===m.name);
      const assigned=allClients.filter(c=>c.assignedAgentId===m.id);
      return(<div>
        <button onClick={()=>setTeamView(null)} style={{background:"none",border:"none",color:T.brand,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14,fontFamily:FONT_B}}>← Back to Team</button>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
          <UserAvatar user={m} size={52}/>
          <div><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>{m.name}</div><div style={{fontSize:13,color:T.sub}}>{m.email} · {m.role==="manager"?"Manager":m.role==="super_admin"?"Super Admin":"Agent"}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
          <StatCard label="Actions logged" value={memberActs.length} icon="⚡" color={T.brand} soft={T.brandSoft}/>
          {m.role==="agent"&&<StatCard label="Clients assigned" value={assigned.length} icon="👥" color={T.blue} soft={T.blueSoft}/>}
          <StatCard label="Last active" value={memberActs[0]?.date?memberActs[0].date.split(" at ")[0]:"–"} icon="🕐" color={T.violet} soft={T.violetSoft}/>
        </div>
        {m.role==="agent"&&<Card style={{marginBottom:16}}>
          <SectionTitle sub="Clients this agent can work on">Assigned clients</SectionTitle>
          {assigned.length===0?<div style={{fontSize:12.5,color:T.faint}}>No clients assigned yet.</div>:
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{assigned.map(c=><span key={c.id} style={{fontSize:12,fontWeight:700,background:T.surface2,padding:"5px 11px",borderRadius:20}}>{c.businessName||c.name}</span>)}</div>}
          {isStaffMgr&&<Btn variant="ghost" size="sm" style={{marginTop:12}} onClick={()=>setModal({type:"assign",agent:m})}>Manage assignments</Btn>}
        </Card>}
        <Card>
          <SectionTitle sub={`Everything ${m.name} has done on the platform`}>Activity log</SectionTitle>
          {memberActs.length===0?<Empty icon="📭" title="No activity yet" sub="This member's actions will appear here."/>:
            memberActs.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:12,padding:"11px 8px",borderBottom:i<memberActs.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date}{a.clientId&&a.clientId!=="__internal"?` · ${clients.find(c=>c.id===a.clientId)?.businessName||""}`:""}</div></div>
            </div>))}
        </Card>
      </div>);
    }
    return(<div>
      <PageHead isMobile={isMobile} title="Team" sub={`${visibleStaff.length} team members`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"team"})}>+ Add Member</Btn>}/>
      {visibleStaff.map((m)=>(<Card key={m.id} hover style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",gap:13,alignItems:"center"}}>
            <UserAvatar user={m} size={42}/>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:800}}>{m.name}</span>
                <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
              </div>
              <div style={{fontSize:12,color:T.sub}}>{m.email}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {m.role==="agent"&&<span style={{fontSize:11,color:T.sub,fontWeight:700,background:T.blueSoft,padding:"3px 9px",borderRadius:20}}>{allClients.filter(c=>c.assignedAgentId===m.id).length} clients</span>}
            <Btn variant="soft" size="sm" onClick={()=>setModal({type:"permissions",member:m})}>Permissions</Btn>
            {isAdmin&&m.id!==user.id&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Remove team member?",msg:`Permanently remove ${m.name}? Their login and team messages will be deleted.`,danger:true,yes:"Remove",onYes:()=>R(async()=>{const r=await api.deleteStaff(m.id);if(r?.error)throw new Error(r.error);},`${m.name} removed`)})}>Remove</Btn>}
          </div>
        </div>
        {m.staffPassword&&!m.protected&&<CredsRow m={m}/>}
      </Card>))}
      <Card style={{background:T.surface2,boxShadow:"none",border:`1px dashed ${T.line}`}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ROLE PERMISSIONS</div>
        {[["Super Admin",T.brand,"Full access, clients, listings, GMB, team, finance, settings, and read-only account view"],["Manager",T.amber,"Clients, listings, GMB, assign clients to agents, view team logs. Account view only if granted."],["Agent",T.blue,"Update listings only for clients a manager has assigned to them."]].map(([r,c,p])=>(
          <div key={r} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:3,background:c,marginTop:5,flexShrink:0}}/><div style={{fontSize:12.5}}><b style={{color:c}}>{r}:</b> <span style={{color:T.sub}}>{p}</span></div></div>))}
      </Card>
    </div>);
  }
