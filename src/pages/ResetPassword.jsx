// ─── SET NEW PASSWORD (after email recovery link) ────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { passwordIssues, passwordScore } from "../lib/helpers";
import { Btn, Input, Card } from "../components/atoms";
import { Orbit, MiniOrbit } from "../components/Orbit";
import { useWindowSize } from "../hooks";

export const RECOVERY_KEY="ro_pw_recovery";
export const markPasswordRecovery=()=>{try{sessionStorage.setItem(RECOVERY_KEY,"1");}catch{}};
export const clearPasswordRecovery=()=>{try{sessionStorage.removeItem(RECOVERY_KEY);}catch{}};
export const isPasswordRecovery=()=>{try{return sessionStorage.getItem(RECOVERY_KEY)==="1";}catch{return false;}};

export default function ResetPassword({hasSession,onDone}){
  const nav=useNavigate();
  const[password,setPassword]=useState("");
  const[confirm,setConfirm]=useState("");
  const[fieldErrors,setFieldErrors]=useState({});
  const[error,setError]=useState("");
  const[busy,setBusy]=useState(false);
  const[ready,setReady]=useState(false);

  useEffect(()=>{
    // Wait briefly for Supabase to exchange the recovery hash into a session.
    let n=0;
    const tick=()=>{
      if(hasSession||isPasswordRecovery()){setReady(true);return;}
      if(++n<20)setTimeout(tick,200);
      else setReady(true);
    };
    tick();
  },[hasSession]);

  const submit=async()=>{
    const fe={};
    if(!password)fe.password="Password is required";
    else{
      const issues=passwordIssues(password);
      if(issues.length)fe.password="Password needs "+issues.join(", ");
    }
    if(!confirm)fe.confirm="Confirm your password";
    else if(password&&confirm!==password)fe.confirm="Passwords do not match";
    setFieldErrors(fe);
    if(Object.keys(fe).length){setError("");return;}
    setBusy(true);
    const r=await api.updatePassword(password);
    setBusy(false);
    if(r.error){setError(r.error);return;}
    clearPasswordRecovery();
    try{sessionStorage.setItem("ro_pw_updated","1");}catch{}
    onDone?.();
    nav("/login",{replace:true});
  };

  const w=useWindowSize();const isMobile=w<860;
  const sc=password?passwordScore(password):0;
  const cols=[T.red,T.red,T.amber,T.blue,T.green];
  const lbl=["Very weak","Weak","Fair","Good","Strong"];

  if(!ready){
    return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_B}}>
      <div style={{fontSize:13,color:T.sub,fontWeight:600}}>Verifying reset link…</div>
    </div>);
  }

  if(!hasSession&&!isPasswordRecovery()){
    return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_B,padding:16}}>
      <Card style={{padding:28,maxWidth:420,width:"100%",boxShadow:SHADOW_LG}}>
        <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:8}}>Link expired or invalid</div>
        <div style={{fontSize:13,color:T.sub,marginBottom:20,lineHeight:1.5}}>Request a new password reset link from the sign-in page.</div>
        <Btn onClick={()=>nav("/login")} style={{width:"100%"}} size="lg">Back to sign in</Btn>
      </Card>
    </div>);
  }

  return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_B,padding:16,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-120px",left:"-80px",width:420,height:420,borderRadius:"50%",background:T.brandSoft,filter:"blur(60px)"}}/>
    <div style={{display:"flex",gap:48,alignItems:"center",maxWidth:960,width:"100%",position:"relative",flexDirection:isMobile?"column":"row"}}>
      {!isMobile&&(<div className="fadeUp" style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:26}}>
          <Orbit size={92}/>
          <div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,letterSpacing:"-1px"}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
            <div style={{fontSize:13,color:T.sub,marginTop:2}}>Local Visibility Platform</div>
          </div>
        </div>
        <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:700,lineHeight:1.35}}>Choose a new password for your account.</div>
      </div>)}
      <div className="pop" style={{width:"100%",maxWidth:430}}>
        {isMobile&&(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,justifyContent:"center"}}>
          <MiniOrbit size={40}/><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
        </div>)}
        <Card style={{padding:28,boxShadow:SHADOW_LG}}>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:4}}>Set new password</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:20}}>Enter a new password, then sign in again.</div>
          <Input label="New Password" type="password" value={password} onChange={v=>{setPassword(v);setFieldErrors(p=>{const n={...p};delete n.password;return n;});}} placeholder="••••••••" maxLength={8} required error={fieldErrors.password||""}/>
          {password?(
            <div style={{marginTop:-6,marginBottom:12}}>
              <div style={{display:"flex",gap:4,marginBottom:5}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<sc?cols[sc]:T.line,transition:"background .2s"}}/>)}</div>
              <div style={{fontSize:11,color:cols[sc],fontWeight:700}}>{lbl[sc]} · needs exactly 8 chars, upper, lower, number, symbol</div>
            </div>
          ):null}
          <Input label="Confirm Password" type="password" value={confirm} onChange={v=>{setConfirm(v);setFieldErrors(p=>{const n={...p};delete n.confirm;return n;});}} placeholder="••••••••" maxLength={8} required error={fieldErrors.confirm||""}/>
          {error&&<div style={{fontSize:12.5,color:T.red,marginBottom:12,background:T.redSoft,padding:"8px 12px",borderRadius:9}}>{error}</div>}
          <Btn onClick={submit} style={{width:"100%"}} size="lg">{busy?"Saving…":"Update password →"}</Btn>
        </Card>
      </div>
    </div>
  </div>);
}
