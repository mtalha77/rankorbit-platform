import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { T, FONT_B } from "./lib/theme";
import { STAFF_ROLES } from "./lib/helpers";
import { supa } from "./lib/supabase";
import { api } from "./lib/api";
import { GlobalStyle } from "./components/GlobalStyle";
import { Orbit } from "./components/Orbit";
import AuthScreen from "./pages/AuthScreen";
import ResetPassword, { markPasswordRecovery, clearPasswordRecovery, isPasswordRecovery } from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const Loading=({label="Loading platform…"})=>(
  <div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:FONT_B}}>
    <Orbit size={90} speed={6}/><div style={{fontSize:13,color:T.sub,fontWeight:600}}>{label}</div>
  </div>
);

const hasClientPlan=(user)=>!!(user&&user.plan&&!STAFF_ROLES.includes(user.role));
const urlLooksLikeRecovery=()=>{
  if(typeof window==="undefined")return false;
  const hash=window.location.hash||"";
  const search=window.location.search||"";
  return /type=recovery/i.test(hash)||/type=recovery/i.test(search);
};

// /login and /signup — auth only. After success → landing (/). Never the dashboard.
function ClientAuth({mode="login",user,onLogin,passwordRecovery}){
  const nav=useNavigate();
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(user)return <Navigate to="/" replace/>;
  return <AuthScreen key={mode} portal="client" initialMode={mode} onLogin={async(u)=>{await onLogin(u);nav("/",{replace:true});}}/>;
}

// /dashboard — clients with an active plan only. No plan → pricing on landing.
// After Stripe success, briefly poll until webhook writes the plan.
function ClientDashboardRoute({user,data,reload,onLogin,onLogout,passwordRecovery}){
  const nav=useNavigate();
  const[params]=useSearchParams();
  const billing=params.get("billing");
  const awaitingPlan=billing==="success"&&user&&!user.plan;
  const[waitDone,setWaitDone]=useState(!awaitingPlan);

  useEffect(()=>{
    if(!awaitingPlan){setWaitDone(true);return;}
    let cancelled=false;let n=0;
    const tick=async()=>{
      const fresh=await api.currentUser();
      if(cancelled)return;
      if(fresh?.plan){await onLogin(fresh);setWaitDone(true);return;}
      if(++n<10)setTimeout(tick,800);
      else setWaitDone(true);
    };
    tick();
    return()=>{cancelled=true;};
  },[awaitingPlan,onLogin]);

  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <Navigate to="/login" replace/>;
  if(awaitingPlan&&!waitDone)return <Loading label="Activating your plan…"/>;
  if(!hasClientPlan(user))return <Navigate to="/?focus=pricing" replace/>;
  if(!data)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/");}}/>;
}

// /admin — staff (super_admin, manager, agent). Unchanged access rules.
function StaffPortal({user,data,reload,onLogin,onLogout,passwordRecovery}){
  const nav=useNavigate();
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/admin");}}/>;
}

function LandingRoute({user,passwordRecovery}){
  const[params]=useSearchParams();
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  return <LandingPage user={user} focusPricing={params.get("focus")==="pricing"} billingFlag={params.get("billing")}/>;
}

function ResetPasswordRoute({user,passwordRecovery,onClearRecovery,onLogout}){
  return(
    <ResetPassword
      hasSession={!!user||passwordRecovery}
      onDone={async()=>{onClearRecovery();await onLogout();}}
    />
  );
}

export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  const[data,setData]=useState(null);
  const[passwordRecovery,setPasswordRecovery]=useState(()=>isPasswordRecovery()||urlLooksLikeRecovery());
  const loadedForRef=useState({id:null})[0];
  const reload=useCallback(async()=>{const d=await api.loadAll();setData(d);},[]);
  const applyUser=useCallback(async(prof)=>{
    if(!prof){return;}
    loadedForRef.id=prof.id;
    setCurrentUser(prof);
    await reload();
  },[reload,loadedForRef]);
  const enterRecovery=useCallback(()=>{
    markPasswordRecovery();
    setPasswordRecovery(true);
  },[]);
  const clearRecovery=useCallback(()=>{
    clearPasswordRecovery();
    setPasswordRecovery(false);
  },[]);
  useEffect(()=>{
    if(urlLooksLikeRecovery())enterRecovery();
  },[enterRecovery]);
  useEffect(()=>{(async()=>{
    await api.init();
    const existing=await api.currentUser();
    if(existing){await applyUser(existing);}else{await reload();}
    setReady(true);
  })();/* eslint-disable-next-line */},[]);
  useEffect(()=>{
    if(!supa)return;
    const{data:{subscription}}=supa.auth.onAuthStateChange(async(event,session)=>{
      if(event==="PASSWORD_RECOVERY"){
        enterRecovery();
      }
      if((event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="PASSWORD_RECOVERY")&&session){
        if(event==="SIGNED_IN"&&(urlLooksLikeRecovery()||isPasswordRecovery()))enterRecovery();
        if(loadedForRef.id===session.user.id&&event==="INITIAL_SESSION")return;
        let{data:prof}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        if(!prof){
          const m=session.user.user_metadata||{};
          const name=m.full_name||m.name||session.user.email?.split("@")[0]||"there";
          await supa.from("profiles").upsert({id:session.user.id,email:session.user.email,role:"client",name,avatar:name[0].toUpperCase(),status:"active"},{onConflict:"id"});
          const r=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          prof=r.data;
        }
        await applyUser(prof);
        if(typeof window!=="undefined"&&window.location.hash.includes("access_token")){
          const path=(isPasswordRecovery()||urlLooksLikeRecovery()||event==="PASSWORD_RECOVERY")
            ?"/reset-password"
            :(window.location.pathname+window.location.search);
          window.history.replaceState(null,"",path);
        }
      }
      if(event==="SIGNED_OUT"){loadedForRef.id=null;setCurrentUser(null);}
    });
    return()=>subscription?.unsubscribe();
  /* eslint-disable-next-line */},[]);
  const onLogin=async(u)=>{await applyUser(u);};
  const onLogout=async()=>{loadedForRef.id=null;await api.logout();setCurrentUser(null);};
  if(!ready)return(<><GlobalStyle/><Loading/></>);
  const shared={user:currentUser,data,reload,onLogin,onLogout,passwordRecovery};
  return(<><GlobalStyle/>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute user={currentUser} passwordRecovery={passwordRecovery}/>}/>
        <Route path="/login" element={<ClientAuth mode="login" user={currentUser} onLogin={onLogin} passwordRecovery={passwordRecovery}/>}/>
        <Route path="/signup" element={<ClientAuth mode="signup" user={currentUser} onLogin={onLogin} passwordRecovery={passwordRecovery}/>}/>
        <Route path="/reset-password" element={<ResetPasswordRoute user={currentUser} passwordRecovery={passwordRecovery} onClearRecovery={clearRecovery} onLogout={onLogout}/>}/>
        <Route path="/dashboard" element={<ClientDashboardRoute {...shared}/>}/>
        <Route path="/admin" element={<StaffPortal {...shared}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  </>);
}
