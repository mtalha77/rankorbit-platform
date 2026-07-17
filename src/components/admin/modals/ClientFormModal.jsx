import { useState } from "react";
import { T } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { uid } from "../../../lib/helpers";
import { US_CA_STATES, CATEGORIES, PLANS } from "../../../lib/constants";
import { Modal, Input, Select, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function ClientFormModal({ client,onClose }) {
  const { R, audit, toast, livePlans } = useAdmin();

    const[f,setF]=useState(client||{role:"client",plan:"",status:"active",category:"Home Services"});
    const[errs,setErrs]=useState({name:"",email:"",businessName:""});
    const set=(k,v)=>{setF(x=>({...x,[k]:v}));if(errs[k])setErrs(e=>({...e,[k]:""}));};
    const editing=!!client;
    return(<Modal open onClose={onClose} title={editing?"Edit Client":"Add New Client"} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Mike Johnson" required error={errs.name}/>
        <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" required error={errs.businessName}/>
        <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="mike@business.com" validate="email" required error={errs.email}/>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone"/>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
      </div>
      <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Select label="Plan" value={f.plan} onChange={v=>set("plan",v)} options={[{value:"",label:"No plan yet"},...livePlans.map(([id,p])=>({value:id,label:`${p.name} $${p.price}/mo`})),...(f.plan&&!livePlans.find(([id])=>id===f.plan)?[{value:f.plan,label:`${PLANS[f.plan]?.name} (hidden)`}]:[])]}/>
        <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
      </div>
      {editing&&<Select label="Status" value={f.status} onChange={v=>set("status",v)} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]}/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{
          const next={name:"",email:"",businessName:""};
          if(!String(f.name||"").trim())next.name="This field is required";
          if(!String(f.businessName||"").trim())next.businessName="This field is required";
          if(!String(f.email||"").trim())next.email="This field is required";
          else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))next.email="Enter a valid email address";
          setErrs(next);
          if(next.name||next.email||next.businessName)return;
          (async()=>{
            try{
              if(editing){await api.upsertProfile(f);toast("Client updated");}
              else{await api.upsertProfile({...f,id:uid(),avatar:(f.name||"?")[0].toUpperCase(),napScore:0,createdAt:new Date().toISOString()});await addActivity("","client",`New client added: ${f.businessName||f.name}`);toast(`${f.businessName||f.name} added`);}
              await reload();onClose();
            }catch(e){toast("Could not save: "+(e.message||"unknown"),"info");}
          })();
        }}>{editing?"Save Changes":"Add Client"}</Btn>
      </div>
      {!editing&&api.mode==="supabase"&&<div style={{marginTop:12,fontSize:11,color:T.faint,lineHeight:1.5}}>Note: this creates a profile record. For the client to log in, they sign up themselves (email/Google) with this email, or you send them a reset link.</div>}
    </Modal>);
  }
