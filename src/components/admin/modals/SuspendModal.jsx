import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { Modal, Input, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function SuspendModal({ client,onClose }) {
  const { user, audit, reload, toast } = useAdmin();

    const[reason,setReason]=useState("");
    const[saving,setSaving]=useState(false);
    const roleLabel=user.role==="super_admin"?"Super Admin":"Manager";
    const doSuspend=async()=>{
      setSaving(true);
      try{
        await api.patchProfile(client.id,{status:"suspended",suspendedAt:new Date().toISOString(),suspendReason:reason.trim(),suspendedBy:roleLabel});
        await audit("client.suspend",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:reason.trim()||"no reason given"});
        await reload();
        toast("Client suspended");
        onClose();
      }catch(e){
        console.error(e);
        toast(e.message||"Could not suspend","info");
      }finally{
        setSaving(false);
      }
    };
    return(<Modal open onClose={onClose} title={`Suspend ${client.businessName||client.name}?`}>
      <div style={{fontSize:12.5,color:T.sub,marginBottom:14,lineHeight:1.5}}>The client won't be able to log in until reactivated. Add a short reason for the record (staff only).</div>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>REASON / NOTES</label>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Payment failed, client requested pause, policy issue…" rows={3} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:16}}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={doSuspend} disabled={saving}>{saving?"Suspending…":"Suspend client"}</Btn></div>
    </Modal>);
  }
