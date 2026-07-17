import { useState } from "react";
import { T } from "../../lib/theme";
import { api } from "../../lib/api";
import { Card, Btn, Input, SectionTitle } from "../atoms";

export function ReportCard({user,reload,toast}){
  const[email,setEmail]=useState(user.reportEmail||user.email||"");
  const[saving,setSaving]=useState(false);
  const sent=user.reportSentMonth;
  const save=async()=>{setSaving(true);try{await api.patchProfile(user.id,{reportEmail:email});await reload();toast("Report email saved");}catch(e){toast("Could not save","info");}setSaving(false);};
  return(<Card style={{marginBottom:16}}>
    <SectionTitle sub="Your detailed monthly GMB performance report, delivered to your inbox by your account manager.">Monthly Report</SectionTitle>
    {sent&&<div style={{padding:"11px 14px",background:T.greenSoft,borderRadius:11,marginBottom:14,fontSize:12.5,color:T.green,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      Report sent for {sent}
    </div>}
    <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div style={{flex:"1 1 240px"}}><Input label="Send my report to" value={email} onChange={setEmail} placeholder="you@business.com" validate="email"/></div>
      <Btn onClick={save} disabled={saving} style={{marginBottom:14}}>{saving?"Saving…":"Save email"}</Btn>
    </div>
  </Card>);
}
