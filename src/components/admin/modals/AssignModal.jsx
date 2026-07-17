import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { PLANS } from "../../../lib/constants";
import { Modal, Input, Btn, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function AssignModal({ agent,onClose }) {
  const { allClients, R, audit } = useAdmin();

    const[sel,setSel]=useState(new Set(allClients.filter(c=>c.assignedAgentId===agent.id).map(c=>c.id)));
    const[saving,setSaving]=useState(false);
    const[q,setQ]=useState("");
    // Granular permissions, default all-on. What this agent may change for assigned clients.
    const defPerms={listings:true,nap:true,logEdit:true,gmb:true};
    const[perms,setPerms]=useState({...defPerms,...(agent.perms||{})});
    const togglePerm=(k)=>setPerms(p=>({...p,[k]:!p[k]}));
    const toggle=(id)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
    const list=allClients.filter(c=>!q||`${c.businessName} ${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
    const save=async()=>{
      setSaving(true);
      try{
        for(const c of allClients){
          const was=c.assignedAgentId===agent.id;const now=sel.has(c.id);
          if(now&&!was)await api.assignClient(c.id,agent.id);
          else if(!now&&was)await api.assignClient(c.id,null);
        }
        await api.patchProfile(agent.id,{perms});
        await audit("agent.assign",{targetType:"staff",targetId:agent.id,targetName:agent.name,detail:`${sel.size} clients`});
        await reload();toast(`Saved: ${sel.size} clients`);onClose();
      }catch(e){toast("Could not save assignments","info");}
      setSaving(false);
    };
    const permList=[["listings","Update listings"],["nap","Update NAP score"],["logEdit","Log unauthorized edits"],["gmb","GMB changes"]];
    return(<Modal open onClose={onClose} title={`Assign clients to ${agent.name}`}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>WHAT THIS AGENT CAN DO</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {permList.map(([k,label])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:perms[k]?T.brandSoft:T.surface2,border:`1.5px solid ${perms[k]?T.brand:T.line}`,borderRadius:10,cursor:"pointer",transition:"all .12s"}}>
            <input type="checkbox" checked={!!perms[k]} onChange={()=>togglePerm(k)} style={{width:15,height:15,accentColor:T.brand}}/>
            <span style={{fontSize:12.5,fontWeight:700,color:perms[k]?T.brand:T.sub}}>{label}</span>
          </label>))}
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>ASSIGNED CLIENTS</div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍  Search clients…" style={{width:"100%",padding:"10px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",marginBottom:12}}/>
      <div style={{maxHeight:260,overflowY:"auto",marginBottom:16}}>
        {list.length===0?<div style={{padding:"20px",textAlign:"center",fontSize:12.5,color:T.faint}}>No clients found.</div>:
          list.map(c=>(<label key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 8px",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
            <input type="checkbox" checked={sel.has(c.id)} onChange={()=>toggle(c.id)} style={{width:16,height:16,accentColor:T.brand}}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.businessName||c.name}</div><div style={{fontSize:11,color:T.faint}}>{c.email}{c.assignedAgentId&&c.assignedAgentId!==agent.id?" · assigned to another agent":""}</div></div>
            {c.plan&&<Badge type="submitted" label={PLANS[c.plan]?.name}/>}
          </label>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:12.5,color:T.sub,fontWeight:700}}>{sel.size} selected</span>
        <div style={{display:"flex",gap:8}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Btn></div>
      </div>
    </Modal>);
  }
