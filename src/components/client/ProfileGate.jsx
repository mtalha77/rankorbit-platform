import { useState } from "react";
import { T } from "../../lib/theme";
import { api } from "../../lib/api";
import { CATEGORIES, US_CA_STATES } from "../../lib/constants";
import { Card, Btn, Input, Select, SectionTitle } from "../atoms";

export function ProfileGate({user,onSaved,toast,isMobile}){
  const[f,setF]=useState({businessName:user.businessName||"",phone:user.phone||"",address:user.address||"",city:user.city||"",state:user.state||"",category:user.category||"Home Services",website:user.website||"",gbpId:user.gbpId||""});
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const[saving,setSaving]=useState(false);
  const[tried,setTried]=useState(false);
  const ok=f.businessName&&f.phone.replace(/\D/g,"").length>=10&&f.address&&f.city&&f.state;
  const save=async()=>{if(!ok){setTried(true);return;}setSaving(true);try{await api.patchProfile(user.id,f);await onSaved();toast("Business profile saved");}catch(e){toast("Could not save: "+(e.message||"unknown error"),"info");}setSaving(false);};
  const req=(k)=>tried&&!f[k]?`Required`:"";
  return(<Card style={{marginBottom:20,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,maxWidth:640}}>
    <SectionTitle sub="Tell us about your business so we can list it correctly everywhere. Takes one minute, then choose your plan.">First, complete your business profile</SectionTitle>
    <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" error={req("businessName")}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone" error={tried&&f.phone.replace(/\D/g,"").length<10?"Valid US/Canada number required":""}/>
      <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
    </div>
    <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St" error={req("address")}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin" error={req("city")}/>
      <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
    </div>
    {tried&&!f.state&&<div style={{fontSize:11,color:T.red,marginTop:-8,marginBottom:10,fontWeight:600}}>State / Province is required</div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
      <Input label="Website (optional)" value={f.website} onChange={v=>set("website",v)} placeholder="mikesplumbing.com"/>
      <Input label="Google Business Profile link (optional)" value={f.gbpId} onChange={v=>set("gbpId",v)} placeholder="Paste your GMB link"/>
    </div>
    <Btn style={{marginTop:6}} onClick={save} disabled={saving}>{saving?"Saving…":"Save & continue to plans →"}</Btn>
    {tried&&!ok&&<div style={{fontSize:11.5,color:T.red,marginTop:8,fontWeight:600}}>Please fill all required fields (marked *) to continue.</div>}
  </Card>);
}
