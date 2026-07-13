import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { T, FONT_B } from "./lib/theme";
import { STAFF_ROLES } from "./lib/helpers";
import { supa } from "./lib/supabase";
import { api } from "./lib/api";
import { GlobalStyle } from "./components/GlobalStyle";
import { Orbit } from "./components/Orbit";
import AuthScreen from "./pages/AuthScreen";
import LandingPage from "./pages/LandingPage";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const Loading=({label="Loading platform…"})=>(
  <div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:FONT_B}}>
    <Orbit size={90} speed={6}/><div style={{fontSize:13,color:T.sub,fontWeight:600}}>{label}</div>
  </div>
);

const hasClientPlan=(user)=>!!(user&&user.plan&&!STAFF_ROLES.includes(user.role));

// /login and /signup — auth only. After success → landing (/). Never the dashboard.
function ClientAuth({mode="login",user,onLogin}){
  const nav=useNavigate();
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(user)return <Navigate to="/" replace/>;
  return <AuthScreen portal="client" initialMode={mode} onLogin={async(u)=>{await onLogin(u);nav("/",{replace:true});}}/>;
}

// /dashboard — clients with an active plan only. No plan → pricing on landing.
// After Stripe success, briefly poll until webhook writes the plan.
function ClientDashboardRoute({user,data,reload,onLogin,onLogout}){
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

  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <Navigate to="/login" replace/>;
  if(awaitingPlan&&!waitDone)return <Loading label="Activating your plan…"/>;
  if(!hasClientPlan(user))return <Navigate to="/?focus=pricing" replace/>;
  if(!data)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/");}}/>;
}

// /admin — staff (super_admin, manager, agent). Unchanged access rules.
function StaffPortal({user,data,reload,onLogin,onLogout}){
  const nav=useNavigate();
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/admin");}}/>;
}

function LandingRoute({user}){
  const[params]=useSearchParams();
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  return <LandingPage user={user} focusPricing={params.get("focus")==="pricing"} billingFlag={params.get("billing")}/>;
}

export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  const[data,setData]=useState(null);
  const loadedForRef=useState({id:null})[0];
  const reload=useCallback(async()=>{const d=await api.loadAll();setData(d);},[]);
  const applyUser=useCallback(async(prof)=>{
    if(!prof){return;}
    loadedForRef.id=prof.id;
    setCurrentUser(prof);
    await reload();
  },[reload,loadedForRef]);
  useEffect(()=>{(async()=>{
    await api.init();
    const existing=await api.currentUser();
    if(existing){await applyUser(existing);}else{await reload();}
    setReady(true);
  })();/* eslint-disable-next-line */},[]);
  useEffect(()=>{
    if(!supa)return;
    const{data:{subscription}}=supa.auth.onAuthStateChange(async(event,session)=>{
      if((event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session){
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
          window.history.replaceState(null,"",window.location.pathname+window.location.search);
        }
      }
      if(event==="SIGNED_OUT"){loadedForRef.id=null;setCurrentUser(null);}
    });
    return()=>subscription?.unsubscribe();
  /* eslint-disable-next-line */},[]);
  const onLogin=async(u)=>{await applyUser(u);};
  const onLogout=async()=>{loadedForRef.id=null;await api.logout();setCurrentUser(null);};
  if(!ready)return(<><GlobalStyle/><Loading/></>);
  const shared={user:currentUser,data,reload,onLogin,onLogout};
  return(<><GlobalStyle/>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute user={currentUser}/>}/>
        <Route path="/login" element={<ClientAuth mode="login" user={currentUser} onLogin={onLogin}/>}/>
        <Route path="/signup" element={<ClientAuth mode="signup" user={currentUser} onLogin={onLogin}/>}/>
        <Route path="/dashboard" element={<ClientDashboardRoute {...shared}/>}/>
        <Route path="/admin" element={<StaffPortal {...shared}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  </>);
}
