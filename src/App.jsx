import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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

// Client portal at /login. Redirects staff who land here to /admin.
// ─── MARKETING LANDING PAGE (public, at /) ───────────────────────────────────
function ClientPortal({user,data,reload,onLogin,onLogout}){
  const nav=useNavigate();
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <AuthScreen portal="client" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/");}}/>;
}

// Staff portal at /admin. Redirects clients who land here to /login.
function StaffPortal({user,data,reload,onLogin,onLogout}){
  const nav=useNavigate();
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/login" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/admin");}}/>;
}

// Landing at /. If already signed in, go straight to the right dashboard.
function LandingRoute({user}){
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(user)return <Navigate to="/login" replace/>;
  return <LandingPage/>;
}

export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  const[data,setData]=useState(null);
  const loadedForRef=useState({id:null})[0]; // guards against redundant reloads
  const reload=useCallback(async()=>{const d=await api.loadAll();setData(d);},[]);
  // Single source of truth for "a user is active": load their profile + data once.
  const applyUser=useCallback(async(prof)=>{
    if(!prof){return;}
    if(loadedForRef.id===prof.id){setCurrentUser(prof);return;} // already loaded, no reload
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
  // Catch OAuth (Google) sign-in the moment Supabase parses the callback hash.
  useEffect(()=>{
    if(!supa)return;
    const{data:{subscription}}=supa.auth.onAuthStateChange(async(event,session)=>{
      // Only react to real sign-in / sign-out. TOKEN_REFRESHED and USER_UPDATED fire
      // periodically (tab focus, hourly refresh) and must NOT trigger reloads (caused blinking).
      if((event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session){
        if(loadedForRef.id===session.user.id)return; // dedupe: same user, ignore repeat events
        let{data:prof}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
        if(!prof){
          const m=session.user.user_metadata||{};
          const name=m.full_name||m.name||session.user.email?.split("@")[0]||"there";
          await supa.from("profiles").upsert({id:session.user.id,email:session.user.email,role:"client",name,avatar:name[0].toUpperCase(),status:"active"},{onConflict:"id"});
          const r=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          prof=r.data;
        }
        await applyUser(prof);
        if(window.location.hash.includes("access_token"))window.history.replaceState(null,"",window.location.pathname);
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
        <Route path="/login" element={<ClientPortal {...shared}/>}/>
        <Route path="/admin" element={<StaffPortal {...shared}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  </>);
}
