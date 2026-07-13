// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { passwordIssues, passwordScore, SHOW_DEMOS, STAFF_ROLES } from "../lib/helpers";
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
  const[info,setInfo]=useState("");
  const[busy,setBusy]=useState(false);
  const login=async()=>{
    api.setRemember(remember);
    setBusy(true);const r=await api.login(email,password);setBusy(false);
    if(r.error){setError(r.error);return;}
    const role=r.user?.role;
    if(isStaff && !STAFF_ROLES.includes(role)){await api.logout();setError("This is the staff portal. Clients sign in at /login.");return;}
    if(!isStaff && STAFF_ROLES.includes(role)){await api.logout();setError("Staff accounts sign in at /admin.");return;}
    setError("");onLogin(r.user);
  };
  const signup=async()=>{
    if(!email||!password||!name){setError("Name, email and password are required.");return;}
    const issues=passwordIssues(password);
    if(issues.length){setError("Password needs "+issues.join(", ")+".");return;}
    api.setRemember(remember);
    setBusy(true);const r=await api.signup({email,password,name,businessName,phone});setBusy(false);
    if(r.error)setError(r.error);
    else if(r.needsConfirm){setError("");setInfo("Almost there! Check your email and click the verification link, then sign in.");nav("/login");}
    else{setError("");onLogin(r.user);}
  };
  const google=async()=>{api.setRemember(remember);setBusy(true);const r=await api.googleLogin();setBusy(false);if(r.error)setError(r.error);};
  const forgot=async()=>{
    if(!email){setError("Enter your email first.");return;}
    setBusy(true);const r=await api.resetPassword(email);setBusy(false);
    if(r.error)setError(r.error);else{setError("");setInfo("Password reset link sent. Check your email.");setMode("login");}
  };
  const staff=[{l:"Super Admin",e:"admin@rankorbit.com",p:"admin123",c:T.brand,s:"Full access"},{l:"Manager",e:"manager@rankorbit.com",p:"manager123",c:T.violet,s:"Ops access"},{l:"Agent",e:"agent@rankorbit.com",p:"agent123",c:T.blue,s:"Listings only"}];
  const clients=[{l:"Essentials $49",e:"john@autoshop.com",p:"client123",c:T.blue,s:"Davis Auto"},{l:"Growth $89",e:"mike@example.com",p:"client123",c:T.brand,s:"Mike's Plumbing"},{l:"GMB Pro $249",e:"sarah@dentalcare.com",p:"client123",c:T.violet,s:"Sarah's Dental"}];
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
        <div style={{marginTop:18,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:api.mode==="supabase"?T.greenSoft:T.amberSoft,borderRadius:20,fontSize:11.5,fontWeight:700,color:api.mode==="supabase"?T.green:T.amber}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:api.mode==="supabase"?T.green:T.amber}}/>
          {api.mode==="supabase"?"Live database connected":"Demo mode (local data)"}
        </div>
      </div>)}
      <div className="pop" style={{width:"100%",maxWidth:430}}>
        {isMobile&&(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,justifyContent:"center"}}>
          <MiniOrbit size={40}/><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
        </div>)}
        <Card style={{padding:28,boxShadow:SHADOW_LG}}>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:4}}>{isStaff?"Staff sign in":mode==="login"?"Sign in":mode==="signup"?"Create your account":"Reset password"}</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:20}}>{isStaff?"Admin, manager & agent access.":mode==="login"?"Welcome back. Enter your details.":mode==="signup"?"Start getting listed everywhere.":"We'll email you a reset link."}</div>
          {info&&<div style={{fontSize:12.5,color:T.green,marginBottom:12,background:T.greenSoft,padding:"8px 12px",borderRadius:9}}>{info}</div>}
          {mode==="signup"&&!isStaff&&(<>
            <Input label="Full Name" value={name} onChange={setName} placeholder="Mike Johnson"/>
            <Input label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Mike's Plumbing"/>
            <Input label="Phone (optional)" value={phone} onChange={setPhone} placeholder="(555) 200-0000" validate="usphone"/>
          </>)}
          <Input label="Email" value={email} onChange={setEmail} placeholder="you@business.com" validate="email"/>
          {mode!=="forgot"&&<Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" maxLength={mode==="signup"?8:undefined}/>}
          {mode==="signup"&&!isStaff&&password&&(()=>{
            const sc=passwordScore(password);const cols=[T.red,T.red,T.amber,T.blue,T.green];const lbl=["Very weak","Weak","Fair","Good","Strong"];
            return(<div style={{marginTop:-6,marginBottom:12}}>
              <div style={{display:"flex",gap:4,marginBottom:5}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<sc?cols[sc]:T.line,transition:"background .2s"}}/>)}</div>
              <div style={{fontSize:11,color:cols[sc],fontWeight:700}}>{lbl[sc]} · needs exactly 8 chars, upper, lower, number, symbol</div>
            </div>);
          })()}
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
            {mode==="login"&&(<>New here? <span onClick={()=>{setError("");setInfo("");nav("/signup");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Create an account</span> · <span onClick={()=>{setMode("forgot");setError("");setInfo("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Forgot?</span></>)}
            {mode==="signup"&&(<>Have an account? <span onClick={()=>{setError("");nav("/login");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Sign in</span></>)}
            {mode==="forgot"&&(<span onClick={()=>{setMode("login");setError("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>← Back to sign in</span>)}
          </div>)}
          {isStaff&&mode==="login"&&(<div style={{marginTop:14,textAlign:"center",fontSize:12,color:T.faint}}>
            <span onClick={()=>{setMode("forgot");setError("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Forgot password?</span>
          </div>)}
          {isStaff&&mode==="forgot"&&(<div style={{marginTop:14,textAlign:"center",fontSize:12}}>
            <span onClick={()=>{setMode("login");setError("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>← Back to sign in</span>
          </div>)}
          {mode==="login"&&SHOW_DEMOS&&(<div style={{marginTop:20,paddingTop:18,borderTop:`1px solid ${T.line}`}}>
            {isStaff?(<>
              <div style={{fontSize:10.5,color:T.faint,fontWeight:800,letterSpacing:".8px",marginBottom:8}}>STAFF DEMO</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
                {staff.map(d=>(<button key={d.l} onClick={()=>{setEmail(d.e);setPassword(d.p);}} style={{padding:"9px 4px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:d.c,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,lineHeight:1.5}}>{d.l}<br/><span style={{fontSize:9.5,color:T.faint,fontWeight:500}}>{d.s}</span></button>))}
              </div>
            </>):(<>
              <div style={{fontSize:10.5,color:T.faint,fontWeight:800,letterSpacing:".8px",marginBottom:8}}>CLIENT DEMO</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
                {clients.map(d=>(<button key={d.l} onClick={()=>{setEmail(d.e);setPassword(d.p);}} style={{padding:"9px 4px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:d.c,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,lineHeight:1.5}}>{d.l}<br/><span style={{fontSize:9.5,color:T.faint,fontWeight:500}}>{d.s}</span></button>))}
              </div>
            </>)}
            <div style={{marginTop:12,fontSize:11,color:T.faint,textAlign:"center"}}>Demo accounts, removed before go-live</div>
          </div>)}
        </Card>
      </div>
    </div>
  </div>);
}
