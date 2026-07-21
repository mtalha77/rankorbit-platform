// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { passwordIssues, passwordScore, STAFF_ROLES } from "../lib/helpers";
import { Btn, Input, Card } from "../components/atoms";
import { Orbit, MiniOrbit } from "../components/Orbit";
import { useWindowSize } from "../hooks";

export default function AuthScreen({onLogin,portal="client",initialMode="login"}){
  // portal="staff" → /admin (login only). portal="client" → /login or /signup.
  const isStaff=portal==="staff";
  const nav=useNavigate();
  const[mode,setMode]=useState(isStaff?"login":initialMode); // login | signup | forgot
  useEffect(()=>{if(!isStaff)setMode(initialMode);},[initialMode,isStaff]);
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[name,setName]=useState("");
  const[businessName,setBusinessName]=useState("");
  const[phone,setPhone]=useState("");
  const[remember,setRemember]=useState(true);
  const[error,setError]=useState("");
  const[fieldErrors,setFieldErrors]=useState({});
  const[info,setInfo]=useState("");
  const[busy,setBusy]=useState(false);
  useEffect(()=>{
    try{
      if(sessionStorage.getItem("ro_pw_updated")==="1"){
        sessionStorage.removeItem("ro_pw_updated");
        setInfo("Password updated. Sign in with your new password.");
        setMode("login");
      }
      const linkErr=sessionStorage.getItem("ro_auth_link_error");
      if(linkErr){
        sessionStorage.removeItem("ro_auth_link_error");
        setError(linkErr);
        setMode("login");
      }
    }catch{}
  },[]);
  const clearField=(key)=>setFieldErrors(prev=>{if(!prev[key])return prev;const next={...prev};delete next[key];return next;});
  const setNameVal=v=>{clearField("name");setName(v);};
  const setEmailVal=v=>{clearField("email");setEmail(v);};
  const setPasswordVal=v=>{clearField("password");setPassword(v);};
  const setBusinessNameVal=v=>{clearField("businessName");setBusinessName(v);};
  const setPhoneVal=v=>{clearField("phone");setPhone(v);};
  const login=async()=>{
    const fe={};
    if(!email.trim())fe.email="Email is required";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))fe.email="Enter a valid email address";
    if(!password)fe.password="Password is required";
    setFieldErrors(fe);
    if(Object.keys(fe).length){setError("");return;}
    api.setRemember(remember);
    setBusy(true);const r=await api.login(email,password);setBusy(false);
    if(r.error){setError(r.error);return;}
    if(!r.user){setError("Sign-in failed. Please try again.");return;}
    const role=r.user.role;
    if(isStaff && !STAFF_ROLES.includes(role)){await api.logout();setError("This is the staff portal. Clients sign in at /login.");return;}
    // Staff who signed in via the client /login link → send them to admin (don't treat as client).
    if(!isStaff && STAFF_ROLES.includes(role)){
      setError("");setFieldErrors({});
      try{await onLogin(r.user);}catch(e){setError(e.message||"Sign-in failed. Please try again.");return;}
      nav("/admin",{replace:true});
      return;
    }
    setError("");setFieldErrors({});
    try{await onLogin(r.user);}catch(e){setError(e.message||"Sign-in failed. Please try again.");}
  };
  const signup=async()=>{
    const fe={};
    if(!name.trim())fe.name="Name is required";
    if(!businessName.trim())fe.businessName="Business name is required";
    if(!email.trim())fe.email="Email is required";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))fe.email="Enter a valid email address";
    if(!password)fe.password="Password is required";
    else{
      const issues=passwordIssues(password);
      if(issues.length)fe.password="Password needs "+issues.join(", ");
    }
    setFieldErrors(fe);
    if(Object.keys(fe).length){setError("");return;}
    api.setRemember(remember);
    setBusy(true);const r=await api.signup({email,password,name,businessName,phone});setBusy(false);
    if(r.error)setError(r.error);
    else if(r.needsConfirm){setError("");setFieldErrors({});setInfo("Almost there! Check your email and click the verification link, then sign in.");nav("/login");}
    else{setError("");setFieldErrors({});onLogin(r.user);}
  };
  const google=async()=>{api.setRemember(remember);setBusy(true);const r=await api.googleLogin();setBusy(false);if(r.error)setError(r.error);};
  const forgot=async()=>{
    const fe={};
    if(!email.trim())fe.email="Email is required";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))fe.email="Enter a valid email address";
    setFieldErrors(fe);
    if(Object.keys(fe).length){setError("");return;}
    setBusy(true);const r=await api.resetPassword(email);setBusy(false);
    if(r.error)setError(r.error);else{setError("");setFieldErrors({});setInfo("Password reset link sent. Check your email.");setMode("login");}
  };
  const w=useWindowSize();const isMobile=w<860;
  return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_B,padding:16,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-120px",left:"-80px",width:420,height:420,borderRadius:"50%",background:T.brandSoft,filter:"blur(60px)",animation:"blob 14s ease-in-out infinite"}}/>
    <div style={{position:"absolute",bottom:"-140px",right:"-60px",width:380,height:380,borderRadius:"50%",background:T.greenSoft,filter:"blur(60px)",animation:"blob 18s ease-in-out infinite reverse"}}/>
    <div style={{display:"flex",gap:48,alignItems:"center",maxWidth:960,width:"100%",position:"relative",flexDirection:isMobile?"column":"row"}}>
      {!isMobile&&(<div className="fadeUp" style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:26}}>
          <Orbit size={92}/>
          <div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,letterSpacing:"-1px"}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
            <div style={{fontSize:13,color:T.sub,marginTop:2}}>Local Visibility Platform</div>
          </div>
        </div>
        <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:700,lineHeight:1.35,marginBottom:14}}>Your business, listed and protected <span style={{color:T.brand}}>everywhere customers look.</span></div>
        {["New directory listings every month","NAP consistency kept in sync","Unauthorized edits caught & reverted"].map((f,i)=>(
          <div key={i} className="fadeUp" style={{animationDelay:`${200+i*120}ms`,display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>✓</div>
            <span style={{fontSize:14,color:T.sub}}>{f}</span>
          </div>))}
      </div>)}
      <main className="pop" style={{width:"100%",maxWidth:430}}>
        {isMobile&&(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,justifyContent:"center"}}>
          <MiniOrbit size={40}/><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
        </div>)}
        <Card style={{padding:28,boxShadow:SHADOW_LG}}>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:4}}>{isStaff?"Staff sign in":mode==="login"?"Sign in":mode==="signup"?"Create your account":"Reset password"}</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:20}}>{isStaff?"Super admin, manager & BDM access.":mode==="login"?"Welcome back. Enter your details.":mode==="signup"?"Start getting listed everywhere.":"We'll email you a reset link."}</div>
          {info&&<div style={{fontSize:12.5,color:T.green,marginBottom:12,background:T.greenSoft,padding:"8px 12px",borderRadius:9}}>{info}</div>}
          {mode==="signup"&&!isStaff&&(<>
            <Input label="Full Name" value={name} onChange={setNameVal} placeholder="Mike Johnson" required error={fieldErrors.name||""}/>
            <Input label="Business Name" value={businessName} onChange={setBusinessNameVal} placeholder="Mike's Plumbing" required error={fieldErrors.businessName||""}/>
            <Input label="Phone (optional)" value={phone} onChange={setPhoneVal} placeholder="(555) 200-0000" validate="usphone" error={fieldErrors.phone||""}/>
          </>)}
          <Input label="Email" value={email} onChange={setEmailVal} placeholder="you@business.com" validate="email" required error={fieldErrors.email||""}/>
          {mode!=="forgot"&&<Input label="Password" type="password" value={password} onChange={setPasswordVal} placeholder="••••••••" maxLength={8} required error={fieldErrors.password||""}/>}
          {mode==="signup"&&!isStaff&&password?(
            (()=>{
              const sc=passwordScore(password);const cols=[T.red,T.red,T.amber,T.blue,T.green];const lbl=["Very weak","Weak","Fair","Good","Strong"];
              return(<div style={{marginTop:-6,marginBottom:12}}>
                <div style={{display:"flex",gap:4,marginBottom:5}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<sc?cols[sc]:T.line,transition:"background .2s"}}/>)}</div>
                <div style={{fontSize:11,color:cols[sc],fontWeight:700}}>{lbl[sc]} · needs exactly 8 chars, upper, lower, number, symbol</div>
              </div>);
            })()
          ):null}
          {mode!=="forgot"&&(<label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer",fontSize:12.5,color:T.sub}}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{width:15,height:15,accentColor:T.brand}}/>
            Keep me signed in for 30 days
          </label>)}
          {error&&<div style={{fontSize:12.5,color:T.red,marginBottom:12,background:T.redSoft,padding:"8px 12px",borderRadius:9}}>{error}</div>}
          {mode==="login"&&<Btn onClick={login} style={{width:"100%"}} size="lg">{busy?"Signing in…":"Sign In →"}</Btn>}
          {mode==="signup"&&<Btn onClick={signup} style={{width:"100%"}} size="lg">{busy?"Creating…":"Create Account →"}</Btn>}
          {mode==="forgot"&&<Btn onClick={forgot} style={{width:"100%"}} size="lg">{busy?"Sending…":"Send Reset Link"}</Btn>}
          {mode!=="forgot"&&!isStaff&&(<>
            <div style={{display:"flex",alignItems:"center",gap:12,margin:"16px 0"}}>
              <div style={{flex:1,height:1,background:T.line}}/><span style={{fontSize:11,color:T.faint}}>or</span><div style={{flex:1,height:1,background:T.line}}/>
            </div>
            <button onClick={google} style={{width:"100%",padding:"11px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:T.ink}}>
              <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
              Continue with Google
            </button>
          </>)}
          {!isStaff&&(<div style={{marginTop:16,textAlign:"center",fontSize:12.5,color:T.sub}}>
            {mode==="login"&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span onClick={()=>{setError("");setFieldErrors({});setInfo("");nav("/signup");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Create an account</span>
                <span style={{fontSize:11,color:T.faint}}>or</span>
                <span onClick={()=>{setMode("forgot");setError("");setFieldErrors({});setInfo("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Forgot password</span>
              </div>
            )}
            {mode==="signup"&&(<>Have an account? <span onClick={()=>{setError("");setFieldErrors({});nav("/login");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Sign in</span></>)}
            {mode==="forgot"&&(<span onClick={()=>{setMode("login");setError("");setFieldErrors({});}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>← Back to sign in</span>)}
          </div>)}
          {isStaff&&mode==="login"&&(<div style={{marginTop:14,textAlign:"center",fontSize:12,color:T.faint}}>
            <span onClick={()=>{setMode("forgot");setError("");setFieldErrors({});}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Forgot password?</span>
          </div>)}
          {isStaff&&mode==="forgot"&&(<div style={{marginTop:14,textAlign:"center",fontSize:12}}>
            <span onClick={()=>{setMode("login");setError("");setFieldErrors({});}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>← Back to sign in</span>
          </div>)}
        </Card>
      </main>
    </div>
  </div>);
}
