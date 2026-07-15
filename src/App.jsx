import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";
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

/** Keep last non-null data so admin/client dashboards don't unmount during a soft reload. */
function useStableData(data){
  const ref=useRef(data);
  if(data)ref.current=data;
  return data||ref.current;
}

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
  const viewData=useStableData(data);

  useEffect(()=>{
    if(!awaitingPlan){setWaitDone(true);return;}
    setWaitDone(false);
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

  // Must stay above every early return — hooks can't run conditionally (fixes blank page on refresh).
  const handleLogout=useCallback(async()=>{await onLogout();nav("/");},[onLogout,nav]);

  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <Navigate to="/login" replace/>;
  if(awaitingPlan&&!waitDone)return <Loading label="Activating your plan…"/>;
  if(!hasClientPlan(user))return <Navigate to="/?focus=pricing" replace/>;
  if(!viewData)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={viewData} reload={reload} onLogout={handleLogout}/>;
}

// /admin — staff (super_admin, manager, agent). Unchanged access rules.
function StaffPortal({user,data,reload,onLogin,onLogout,passwordRecovery}){
  const nav=useNavigate();
  const viewData=useStableData(data);
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!viewData)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={viewData} reload={reload} onLogout={async()=>{await onLogout();nav("/admin");}}/>;
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
  const loadedForRef=useRef({id:null});
  const loadGenRef=useRef(0);
  // True while the cold-start boot effect is loading session/data.
  // Auth listener must not start a second loadAll during this window (prevents refresh double-render).
  const bootingRef=useRef(true);

  const reload=useCallback(async()=>{
    const gen=++loadGenRef.current;
    try{
      const d=await api.loadAll();
      if(gen!==loadGenRef.current)return d;
      // Never wipe a good payload with an empty/invalid one.
      if(d&&typeof d==="object"){
        setData({
          users:d.users||[],
          trashedUsers:d.trashedUsers||[],
          listings:d.listings||{},
          trashedListings:d.trashedListings||[],
          gmb:d.gmb||{},
          analytics:d.analytics||{},
          activity:Array.isArray(d.activity)?d.activity:[],
          audit:Array.isArray(d.audit)?d.audit:[],
          settings:d.settings||{},
        });
      }
      return d;
    }catch(e){
      console.error("reload failed:",e);
      return null;
    }
  },[]);

  /**
   * Attach a profile + load platform data.
   * - Same user without forceReload → no second fetch (stops admin/client flicker).
   * - forceReload → used by login / init / plan activation (flows stay correct).
   * - Different user → keep previous viewData until new load finishes (no blank crash).
   */
  const applyUser=useCallback(async(prof,{forceReload=false}={})=>{
    if(!prof)return;
    const sameId=loadedForRef.current.id===prof.id;
    loadedForRef.current.id=prof.id;
    setCurrentUser(prev=>{
      if(!prev||prev.id!==prof.id)return prof;
      const keys=["plan","role","name","email","subscriptionStatus","currentPeriodEnd","cancelAtPeriodEnd","assignedAgentId","status","businessName","napScore","canImpersonate"];
      if(keys.every(k=>prev[k]===prof[k]))return prev;
      return prof;
    });
    if(!sameId||forceReload)await reload();
  },[reload]);

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
    bootingRef.current=true;
    try{
      await api.init();
      const existing=await api.currentUser();
      if(existing){await applyUser(existing,{forceReload:true});}
      else{await reload();}
    }catch(e){
      console.error("boot failed:",e);
    }finally{
      // If auth SIGNED_IN was skipped while booting and getSession was briefly empty, recover once.
      if(!loadedForRef.current.id&&supa){
        try{
          const{data:{session}}=await supa.auth.getSession();
          if(session?.user){
            let{data:prof}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
            if(prof)await applyUser(prof,{forceReload:true});
          }
        }catch(e){console.warn("boot session catch-up:",e.message);}
      }
      bootingRef.current=false;
      setReady(true);
    }
  })();/* eslint-disable-next-line */},[]);

  useEffect(()=>{
    if(!supa)return;
    const{data:{subscription}}=supa.auth.onAuthStateChange(async(event,session)=>{
      if(event==="PASSWORD_RECOVERY")enterRecovery();
      // Token refresh must not remount admin/client dashboards.
      if(event==="TOKEN_REFRESHED")return;

      // Cold start: boot() already loads session + data once.
      // Ignoring INITIAL_SESSION (and SIGNED_IN during boot) stops the refresh double-paint.
      if(event==="INITIAL_SESSION"){
        if(typeof window!=="undefined"&&window.location.hash.includes("access_token")){
          const path=(isPasswordRecovery()||urlLooksLikeRecovery())
            ?"/reset-password"
            :(window.location.pathname+window.location.search);
          window.history.replaceState(null,"",path);
        }
        return;
      }

      if((event==="SIGNED_IN"||event==="PASSWORD_RECOVERY")&&session){
        if(event==="SIGNED_IN"&&(urlLooksLikeRecovery()||isPasswordRecovery()))enterRecovery();

        const scrubHash=()=>{
          if(typeof window==="undefined"||!window.location.hash.includes("access_token"))return;
          const path=(isPasswordRecovery()||urlLooksLikeRecovery()||event==="PASSWORD_RECOVERY")
            ?"/reset-password"
            :(window.location.pathname+window.location.search);
          window.history.replaceState(null,"",path);
        };

        // Same session already hydrated (boot or prior login) — do not reload again.
        if(loadedForRef.current.id===session.user.id){
          scrubHash();
          return;
        }
        // Boot still in progress and will pick up this session — skip duplicate fetch.
        if(bootingRef.current){
          scrubHash();
          return;
        }

        try{
          let{data:prof}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          if(!prof){
            const m=session.user.user_metadata||{};
            const name=m.full_name||m.name||session.user.email?.split("@")[0]||"there";
            await supa.from("profiles").upsert({id:session.user.id,email:session.user.email,role:"client",name,avatar:(name[0]||"U").toUpperCase(),status:"active"},{onConflict:"id"});
            const r=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
            prof=r.data;
          }
          if(prof)await applyUser(prof,{forceReload:false});
        }catch(e){
          console.error("auth hydrate failed:",e);
        }
        scrubHash();
      }
      if(event==="SIGNED_OUT"){
        loadedForRef.current.id=null;
        loadGenRef.current+=1;
        setCurrentUser(null);
        setData(null);
      }
    });
    return()=>subscription?.unsubscribe();
  /* eslint-disable-next-line */},[]);

  const onLogin=useCallback(async(u)=>{
    // Explicit login / plan activation: always refresh data so flows stay correct.
    await applyUser(u,{forceReload:true});
    // First-login welcome (covers email-confirm signups). Fire-and-forget, deduped.
    if(u&&!STAFF_ROLES.includes(u.role))api.ensureWelcomeNotify();
  },[applyUser]);

  const onLogout=useCallback(async()=>{
    loadedForRef.current.id=null;
    loadGenRef.current+=1;
    await api.logout();
    setCurrentUser(null);
    setData(null);
  },[]);

  if(!ready)return(<><GlobalStyle/><Loading/><Toaster position="top-right" richColors closeButton duration={3200}/></>);
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
    <Toaster position="top-right" richColors closeButton duration={3200}/>
  </>);
}
