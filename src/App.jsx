import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { T, FONT_B } from "./lib/theme";
import { STAFF_ROLES } from "./lib/helpers";
import { supa } from "./lib/supabase";
import { api } from "./lib/api";
import { GlobalStyle } from "./components/GlobalStyle";
import { Orbit } from "./components/Orbit";
// Recovery helpers run at boot — keep this module eager. Heavy pages lazy-load below.
import ResetPassword, { markPasswordRecovery, clearPasswordRecovery, isPasswordRecovery } from "./pages/ResetPassword";

const AuthScreen = lazy(() => import("./pages/AuthScreen"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const ConfirmNotifyEmail = lazy(() => import("./pages/ConfirmNotifyEmail"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

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

/**
 * Supabase expired invite / magic links land as:
 * /admin#error=access_denied&error_code=otp_expired&error_description=...
 * Scrub the hash and return a human message (or null).
 */
function consumeAuthUrlError(){
  if(typeof window==="undefined")return null;
  const hash=window.location.hash||"";
  const search=window.location.search||"";
  const fromHash=hash.startsWith("#")?hash.slice(1):hash;
  const fromSearch=search.startsWith("?")?search.slice(1):search;
  // Parse hash + search separately — never use includes("error") on the whole
  // string (OAuth access_token JWTs can contain that substring and wipe the hash).
  const hashParams=new URLSearchParams(fromHash);
  const searchParams=new URLSearchParams(fromSearch);
  const err=hashParams.get("error")||searchParams.get("error")||"";
  const code=hashParams.get("error_code")||searchParams.get("error_code")||"";
  const rawDesc=hashParams.get("error_description")||searchParams.get("error_description")||"";
  const desc=decodeURIComponent(String(rawDesc).replace(/\+/g," "));
  if(!err&&!code)return null;

  // Clear auth error from the address bar (keep hash tokens alone — not an error).
  const keepSearch=search&&!/[?&]error=/.test(search)?search:"";
  window.history.replaceState(null,"",window.location.pathname+keepSearch);

  if(code==="otp_expired"||/expired|invalid/i.test(desc)){
    return "This email invite link has expired or was already used. Ask a super admin to send a new invite, or sign in with your password at /admin.";
  }
  if(err==="access_denied"){
    return "Access denied — that email link is invalid. Sign in with your password, or ask for a new invite.";
  }
  return desc||"That authentication link failed. Please sign in with your password.";
}

// Run once at module load so the hash is gone before first paint.
const BOOT_AUTH_URL_ERROR=(()=>{
  try{return consumeAuthUrlError();}catch{return null;}
})();

/** Keep last non-null data so admin/client dashboards don't unmount during a soft reload. */
function useStableData(data){
  const ref=useRef(data);
  if(data)ref.current=data;
  return data||ref.current;
}

// /login and /signup — auth only. Clients → dashboard; staff → /admin.
function ClientAuth({mode="login",user,onLogin,passwordRecovery}){
  const nav=useNavigate();
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(user)return <Navigate to="/dashboard" replace/>;
  return <AuthScreen key={mode} portal="client" initialMode={mode} onLogin={async(u)=>{
    await onLogin(u);
    if(STAFF_ROLES.includes(u?.role))nav("/admin",{replace:true});
    else nav("/dashboard",{replace:true});
  }}/>;
}

// /dashboard — clients with an active plan only. No plan → pricing on landing.
// After Stripe success, briefly poll until webhook writes the plan.
function ClientDashboardRoute({user,data,reload,onLogin,onLogout,passwordRecovery,onUserUpdate}){
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
  const handleLogout=useCallback(()=>onLogout("/"),[onLogout]);

  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <Navigate to="/login" replace/>;
  if(awaitingPlan&&!waitDone)return <Loading label="Activating your plan…"/>;
  if(!hasClientPlan(user))return <Navigate to="/?focus=pricing" replace/>;
  if(!viewData)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={viewData} reload={reload} onLogout={handleLogout} onUserUpdate={onUserUpdate}/>;
}

// /admin — staff (super_admin, manager, agent). Unchanged access rules.
function StaffPortal({user,data,reload,onLogin,onLogout,passwordRecovery,onUserUpdate}){
  const viewData=useStableData(data);
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!viewData)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={viewData} reload={reload} onLogout={()=>onLogout("/admin")} onUserUpdate={onUserUpdate}/>;
}

function LandingRoute({user,passwordRecovery}){
  const[params]=useSearchParams();
  if(passwordRecovery)return <Navigate to="/reset-password" replace/>;
  // Staff always go to admin — never marketing pricing / plan CTAs.
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  return <LandingPage user={user} focusPricing={params.get("focus")==="pricing"} billingFlag={params.get("billing")}/>;
}

/** After invite/login, bounce staff off client routes onto /admin. */
function StaffGate({user,children}){
  const nav=useNavigate();
  useEffect(()=>{
    if(!user||!STAFF_ROLES.includes(user.role))return;
    const path=typeof window!=="undefined"?window.location.pathname:"";
    if(path==="/"||path==="/login"||path==="/signup"||path==="/dashboard"){
      nav("/admin",{replace:true});
    }
  },[user,nav]);
  return children;
}

function ResetPasswordRoute({user,passwordRecovery,onClearRecovery,onLogout}){
  return(
    <ResetPassword
      hasSession={!!user||passwordRecovery}
      onDone={async()=>{onClearRecovery();await onLogout("/login");}}
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
  // Google/OAuth SIGNED_IN during boot — apply after boot so we don't drop the session.
  const pendingAuthSessionRef=useRef(null);
  // After login, ignore brief spurious SIGNED_OUT from concurrent token refresh.
  const ignoreSignOutUntilRef=useRef(0);

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
      const keys=["plan","role","name","email","avatar","subscriptionStatus","currentPeriodStart","currentPeriodEnd","cancelAtPeriodEnd","assignedAgentId","assignedBdmId","status","businessName","napScore","canImpersonate","pendingPlanId","pendingPlanEffectiveAt","paymentFailedAt","paymentGraceEndsAt","notifyEmail","notifyEmailPending","reportEmail","reportSentMonth"];
      if(keys.every(k=>prev[k]===prof[k]))return prev;
      return prof;
    });
    if(!sameId||forceReload)await reload();
  },[reload]);

  /** Load / create profile for an auth session (Google OAuth, magic link, etc.). */
  const hydrateFromSession=useCallback(async(session,{forceReload=false}={})=>{
    if(!supa||!session?.user)return null;
    try{
      let{data:prof}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
      if(!prof){
        const m=session.user.user_metadata||{};
        const name=m.full_name||m.name||session.user.email?.split("@")[0]||"there";
        const metaRole=m.role;
        const role=STAFF_ROLES.includes(metaRole)?metaRole:"client";
        await supa.from("profiles").upsert({
          id:session.user.id,
          email:session.user.email,
          role,
          name,
          avatar:(name[0]||"U").toUpperCase(),
          status:"active",
        },{onConflict:"id"});
        const r=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        prof=r.data;
      }
      if(!prof)return null;
      await applyUser(prof,{forceReload});
      api.ensureClientLifecycleNotifs(prof);
      if(typeof window!=="undefined"){
        const path=window.location.pathname||"/";
        if(STAFF_ROLES.includes(prof.role)){
          if(path==="/"||path==="/login"||path==="/signup"||path==="/dashboard"){
            window.history.replaceState(null,"","/admin");
          }
        }else if(path==="/login"||path==="/signup"){
          // ClientAuth Navigate needs React state; also bump URL for refresh-safe landing.
          window.history.replaceState(null,"","/dashboard"+window.location.search);
        }
      }
      return prof;
    }catch(e){
      console.error("auth hydrate failed:",e);
      return null;
    }
  },[applyUser]);

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
      // Give detectSessionInUrl a beat to parse OAuth hash/code before first read.
      if(supa&&typeof window!=="undefined"){
        const h=window.location.hash||"";
        const q=window.location.search||"";
        if(h.includes("access_token")||/[?&]code=/.test(q)){
          try{await supa.auth.getSession();}catch{/* ignore */}
        }
      }
      const existing=await api.currentUser();
      if(existing){
        await applyUser(existing,{forceReload:true});
        api.ensureClientLifecycleNotifs(existing);
      }
      else{await reload();}
    }catch(e){
      console.error("boot failed:",e);
    }finally{
      // OAuth SIGNED_IN often fires during boot — apply queued session, or catch up from storage.
      if(!loadedForRef.current.id&&supa){
        try{
          let session=pendingAuthSessionRef.current;
          pendingAuthSessionRef.current=null;
          if(!session?.user){
            const r=await supa.auth.getSession();
            session=r?.data?.session||null;
          }
          if(session?.user)await hydrateFromSession(session,{forceReload:true});
        }catch(e){console.warn("boot session catch-up:",e.message);}
      }
      pendingAuthSessionRef.current=null;
      bootingRef.current=false;
      setReady(true);
    }
  })();/* eslint-disable-next-line */},[]);

  useEffect(()=>{
    if(!supa)return;
    const scrubAuthHash=(event)=>{
      if(typeof window==="undefined")return;
      const h=window.location.hash||"";
      if(!h.includes("access_token")&&!/[&#]error=/.test(h))return;
      const path=(isPasswordRecovery()||urlLooksLikeRecovery()||event==="PASSWORD_RECOVERY")
        ?"/reset-password"
        :(window.location.pathname+window.location.search);
      window.history.replaceState(null,"",path);
    };
    const{data:{subscription}}=supa.auth.onAuthStateChange(async(event,session)=>{
      if(event==="PASSWORD_RECOVERY")enterRecovery();
      // Token refresh must not remount admin/client dashboards.
      if(event==="TOKEN_REFRESHED")return;

      // Cold start: boot() loads session. Keep hash until boot catch-up can read it.
      if(event==="INITIAL_SESSION"){
        if(session?.user&&!loadedForRef.current.id){
          pendingAuthSessionRef.current=session;
        }
        return;
      }

      if((event==="SIGNED_IN"||event==="PASSWORD_RECOVERY")&&session){
        if(event==="SIGNED_IN"&&(urlLooksLikeRecovery()||isPasswordRecovery()))enterRecovery();

        // Same session already hydrated (boot or prior login) — do not reload again.
        if(loadedForRef.current.id===session.user.id){
          scrubAuthHash(event);
          return;
        }
        // Boot still in progress — queue for finally{} so Google OAuth is not dropped.
        if(bootingRef.current){
          pendingAuthSessionRef.current=session;
          return;
        }

        await hydrateFromSession(session,{forceReload:false});
        scrubAuthHash(event);
      }
      if(event==="SIGNED_OUT"){
        // Concurrent refreshSession races can emit SIGNED_OUT while the session
        // is still valid — that flashed the dashboard then bounced to login.
        if(Date.now()<ignoreSignOutUntilRef.current)return;
        try{
          const{data:{session:still}}=await supa.auth.getSession();
          if(still?.user)return;
        }catch{/* treat as signed out */}
        loadedForRef.current.id=null;
        loadGenRef.current+=1;
        setCurrentUser(null);
        setData(null);
      }
    });
    return()=>subscription?.unsubscribe();
  /* eslint-disable-next-line */},[]);

  const onLogin=useCallback(async(u)=>{
    // Guard against refresh races during the post-login data load.
    ignoreSignOutUntilRef.current=Date.now()+8000;
    // Explicit login / plan activation: always refresh data so flows stay correct.
    await applyUser(u,{forceReload:true});
    // Register → welcome; first plan → plan_subscribed (server once-only).
    api.ensureClientLifecycleNotifs(u);
  },[applyUser]);

  /**
   * Sign-out: clear session, then hard-navigate.
   * Soft SPA nav after SIGNED_OUT was racing (/dashboard → /login → /) and
   * left production stuck on a blank Suspense/lazy boundary; local Vite never
   * showed it because chunks resolve instantly.
   */
  const onLogout=useCallback(async(redirectTo="/")=>{
    // Suppress SIGNED_OUT handler so it doesn't Navigate mid-logout.
    ignoreSignOutUntilRef.current=Date.now()+15000;
    loadedForRef.current.id=null;
    loadGenRef.current+=1;
    try{
      await Promise.race([
        api.logout(),
        new Promise((resolve)=>setTimeout(resolve,3000)),
      ]);
    }catch(e){
      console.warn("logout:",e);
      try{localStorage.removeItem("ro_auth");}catch{/* ignore */}
    }
    const dest=typeof redirectTo==="string"&&redirectTo.startsWith("/")?redirectTo:"/";
    window.location.replace(dest);
  },[]);

  const onUserUpdate=useCallback((fields)=>{
    if(!fields||typeof fields!=="object")return;
    setCurrentUser(prev=>prev?{...prev,...fields}:prev);
  },[]);

  // Surface expired-invite / bad-link errors once (hash already scrubbed at module load).
  const authLinkErrShown=useRef(false);
  useEffect(()=>{
    if(!ready||!BOOT_AUTH_URL_ERROR||authLinkErrShown.current)return;
    authLinkErrShown.current=true;
    if(currentUser){
      toast.error(BOOT_AUTH_URL_ERROR,{duration:7000});
    }else{
      try{sessionStorage.setItem("ro_auth_link_error",BOOT_AUTH_URL_ERROR);}catch{/* ignore */}
    }
  },[ready,currentUser]);

  if(!ready)return(<><GlobalStyle/><Loading/><Toaster position="top-right" richColors closeButton duration={3200}/></>);
  const shared={user:currentUser,data,reload,onLogin,onLogout,passwordRecovery,onUserUpdate};
  return(<><GlobalStyle/>
    <BrowserRouter>
      <StaffGate user={currentUser}>
        <Suspense fallback={<Loading/>}>
          <Routes>
            <Route path="/" element={<LandingRoute user={currentUser} passwordRecovery={passwordRecovery}/>}/>
            <Route path="/terms" element={<LegalPage mode="terms"/>}/>
            <Route path="/privacy" element={<LegalPage mode="privacy"/>}/>
            <Route path="/login" element={<ClientAuth mode="login" user={currentUser} onLogin={onLogin} passwordRecovery={passwordRecovery}/>}/>
            <Route path="/signup" element={<ClientAuth mode="signup" user={currentUser} onLogin={onLogin} passwordRecovery={passwordRecovery}/>}/>
            <Route path="/reset-password" element={<ResetPasswordRoute user={currentUser} passwordRecovery={passwordRecovery} onClearRecovery={clearRecovery} onLogout={onLogout}/>}/>
            <Route path="/confirm-notify-email" element={<ConfirmNotifyEmail/>}/>
            <Route path="/dashboard" element={<ClientDashboardRoute {...shared}/>}/>
            <Route path="/admin" element={<StaffPortal {...shared}/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </Suspense>
      </StaffGate>
    </BrowserRouter>
    <Toaster position="top-right" richColors closeButton duration={3200}/>
  </>);
}
