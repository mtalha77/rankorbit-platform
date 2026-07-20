import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { generatePassword, passwordIssues } from "../../../lib/helpers";
import { Modal, Input, Select, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function TeamModal({ onClose }) {
  const { isAdmin, audit, toast, reload } = useAdmin();

    const[f,setF]=useState({role:isAdmin?"manager":"agent",password:generatePassword()});
    const[errs,setErrs]=useState({name:"",email:"",password:""});
    const[saving,setSaving]=useState(false);
    const set=(k,v)=>{setF(x=>({...x,[k]:v}));if(errs[k])setErrs(e=>({...e,[k]:""}));};
    const create=async()=>{
      const next={name:"",email:"",password:""};
      if(!String(f.name||"").trim())next.name="This field is required";
      if(!String(f.email||"").trim())next.email="This field is required";
      else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))next.email="Enter a valid email address";
      const pwIssues=passwordIssues(f.password);
      if(pwIssues.length)next.password="Password needs "+pwIssues.join(", ");
      setErrs(next);
      if(next.name||next.email||next.password)return;
      setSaving(true);
      try{
        const r=await api.createStaff({name:f.name,email:f.email,password:f.password,role:f.role});
        if(r.error){toast(r.error,"info");return;}
        await audit("staff.create",{targetType:"staff",targetName:f.name,detail:f.role});
        await reload();
        toast(`${f.name} created. Login ready.`);
        onClose();
      }catch(e){
        console.error(e);
        toast(e.message||"Could not create team member","info");
      }finally{
        setSaving(false);
      }
    };
    // Managers can only create agents; super-admin can create super-admins, managers, or agents.
    const roleOpts=isAdmin?[{value:"super_admin",label:"Super Admin"},{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]:[{value:"agent",label:"Agent"}];
    return(<Modal open onClose={onClose} title="Create Team Member Login">
      <div style={{fontSize:12.5,color:T.sub,marginBottom:16,lineHeight:1.5}}>This creates a working login immediately. Share the email and password with your team member, they can sign in at the staff portal right away.</div>
      <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Team member name" required error={errs.name}/>
      <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="name@naporbit.com" validate="email" required error={errs.email}/>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>PASSWORD <span style={{color:T.red}}>*</span></label>
      <div style={{display:"flex",gap:8,marginBottom:errs.password?6:14}}>
        <input value={f.password} maxLength={8} onChange={e=>set("password",e.target.value.slice(0,8))} style={{flex:1,padding:"11px 15px",background:T.surface,border:`1.5px solid ${errs.password?T.red:T.line}`,borderRadius:11,fontSize:13.5,fontFamily:"monospace",boxSizing:"border-box"}}/>
        <Btn variant="ghost" size="sm" onClick={()=>set("password",generatePassword())}>🎲 Generate</Btn>
      </div>
      <div style={{fontSize:11,color:T.faint,marginBottom:errs.password?6:14,marginTop:-4}}>Exactly 8 characters · upper, lower, number, symbol (same as login)</div>
      {errs.password&&<div style={{fontSize:11,color:T.red,marginTop:0,marginBottom:14,fontWeight:600}}>{errs.password}</div>}
      <Select label="Role" value={f.role} onChange={v=>set("role",v)} options={roleOpts}/>
      <div style={{padding:"11px 14px",background:T.amberSoft,borderRadius:11,fontSize:11.5,color:T.amber,fontWeight:600,lineHeight:1.5,marginBottom:16}}>Save these credentials, they'll also stay visible on the Team page for you to copy later.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={create} disabled={saving}>{saving?"Creating…":"Create login"}</Btn>
      </div>
    </Modal>);
  }
