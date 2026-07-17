import { useState } from "react";
import { T, FONT_D } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { Modal, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function NapConfirmModal({ client,newScore,onClose }) {
  const { user, R, audit } = useAdmin();

    const hist=client.napHistory||[];
    const last3=hist.slice(-3).reverse();
    const roleLabel=user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent";
    const[saving,setSaving]=useState(false);
    const save=async()=>{
      setSaving(true);
      try{
        const entry={score:newScore,date:new Date().toISOString(),by:roleLabel};
        await api.patchProfile(client.id,{napScore:newScore,napHistory:[...hist,entry].slice(-20)});
        await audit("nap.update",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:`${client.napScore||0}% → ${newScore}%`});
        await addActivity(client.id,"nap_fix",`NAP consistency updated to ${newScore}%`);
        api.notifyClient({clientId:client.id,type:"nap_fix",title:"NAP score updated",body:`Your NAP consistency score is now ${newScore}% (was ${client.napScore||0}%).`});
        await reload();toast(`NAP score saved: ${newScore}%`);onClose();
      }catch(e){toast("Could not save NAP","info");}
      setSaving(false);
    };
    const fmt=(d)=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    return(<Modal open onClose={onClose} title="Confirm NAP score update">
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"10px 0 18px"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.faint,fontWeight:700}}>CURRENT</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:T.faint}}>{client.napScore||0}%</div></div>
        <span style={{fontSize:22,color:T.faint}}>→</span>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.brand,fontWeight:700}}>NEW</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:newScore>=90?T.green:newScore>=70?T.amber:T.red}}>{newScore}%</div></div>
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>LAST 3 NAP UPDATES</div>
      {last3.length===0?<div style={{fontSize:12.5,color:T.faint,padding:"8px 0 16px"}}>No previous updates recorded.</div>:
        <div style={{marginBottom:16}}>{last3.map((h,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:12.5,fontWeight:700}}>{h.score}%</span>
          <span style={{fontSize:11.5,color:T.faint}}>{fmt(h.date)} · {h.by}</span>
        </div>))}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Confirm & save"}</Btn></div>
    </Modal>);
  }
