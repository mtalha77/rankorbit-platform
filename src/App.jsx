import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg:"#F6F7FB", surface:"#FFFFFF", surface2:"#F0F1F8",
  ink:"#171732", sub:"#5F6480", faint:"#9CA0B8", line:"#E7E9F2",
  brand:"#5B5BD6", brandDark:"#4646C4", brandSoft:"#EEEEFC", brandGlow:"rgba(91,91,214,0.18)",
  green:"#0FA47A", greenSoft:"#E4F6EF",
  amber:"#C97F06", amberSoft:"#FCF2DF",
  red:"#DE4B63", redSoft:"#FCEAEE",
  blue:"#2E7CD6", blueSoft:"#E8F1FC",
  violet:"#8A4FD8", violetSoft:"#F2EAFC",
};
const FONT_D="'Sora','Inter',sans-serif";
const FONT_B="'Inter',system-ui,sans-serif";
const SHADOW="0 1px 2px rgba(23,23,50,.04), 0 8px 24px rgba(23,23,50,.06)";
const SHADOW_LG="0 4px 12px rgba(23,23,50,.06), 0 20px 48px rgba(23,23,50,.10)";

function GlobalStyle(){
  return(<style>{`
    body{font-family:${FONT_B};color:${T.ink};}
    ::selection{background:${T.brandSoft};}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
    @keyframes orbitSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes orbitSpinR{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
    @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(24px,-18px) scale(1.06)}66%{transform:translate(-16px,14px) scale(.97)}}
    @keyframes toastIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes growBar{from{width:0}}
    @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(15,164,122,.35)}50%{box-shadow:0 0 0 6px rgba(15,164,122,0)}}
    .fadeUp{animation:fadeUp .45s cubic-bezier(.22,.8,.36,1) both}
    .pop{animation:pop .35s cubic-bezier(.22,.8,.36,1) both}
    .hoverCard{transition:transform .22s cubic-bezier(.22,.8,.36,1),box-shadow .22s}
    .hoverCard:hover{transform:translateY(-3px);box-shadow:${SHADOW_LG}}
    .hoverRow{transition:background .15s}
    .hoverRow:hover{background:${T.surface2}}
    .navItem{transition:background .18s,color .18s}
    .navItem:hover{background:${T.surface2}}
    button{transition:transform .12s,opacity .15s,box-shadow .15s}
    button:active{transform:scale(.97)}
    input,select,textarea{transition:border-color .15s,box-shadow .15s}
    input:focus,select:focus,textarea:focus{border-color:${T.brand}!important;box-shadow:0 0 0 3px ${T.brandGlow}!important;outline:none}
    @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
  `}</style>);
}
function Orbit({size=120,speed=14}){
  const s=size;
  return(<div style={{width:s,height:s,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.18,borderRadius:"50%",border:`1.5px dashed ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:FONT_D,fontWeight:800,fontSize:s*0.16,boxShadow:`0 6px 18px ${T.brandGlow}`}}>RO</div>
    <div style={{position:"absolute",inset:0,animation:`orbitSpin ${speed}s linear infinite`}}><div style={{position:"absolute",top:-4,left:"50%",width:9,height:9,marginLeft:-4.5,borderRadius:"50%",background:T.green,boxShadow:"0 0 0 3px "+T.greenSoft}}/></div>
    <div style={{position:"absolute",inset:s*0.18,animation:`orbitSpinR ${speed*0.7}s linear infinite`}}><div style={{position:"absolute",bottom:-4,left:"50%",width:8,height:8,marginLeft:-4,borderRadius:"50%",background:T.brand,boxShadow:"0 0 0 3px "+T.brandSoft}}/></div>
  </div>);
}
function MiniOrbit({size=30}){
  return(<div style={{width:size,height:size,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:size*0.22,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`}}/>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:0,animation:"orbitSpin 8s linear infinite"}}><div style={{position:"absolute",top:-2.5,left:"50%",width:6,height:6,marginLeft:-3,borderRadius:"50%",background:T.green}}/></div>
  </div>);
}

// ─── SEED (local fallback mode) ──────────────────────────────────────────────
const SEED = {
  users:[
    {id:"u1",email:"admin@rankorbit.com",password:"admin123",role:"super_admin",name:"Talha (Admin)",avatar:"T",protected:true},
    {id:"u2",email:"manager@rankorbit.com",password:"manager123",role:"manager",name:"Sara (Manager)",avatar:"S",protected:true},
    {id:"u3",email:"agent@rankorbit.com",password:"agent123",role:"agent",name:"Ali (Agent)",avatar:"A",protected:true},
    {id:"u4",email:"mike@example.com",password:"client123",role:"client",name:"Mike Johnson",avatar:"M",businessName:"Mike's Plumbing",plan:"growth",phone:"(555) 200-1000",address:"123 Main St",city:"Austin",state:"TX",zip:"78701",website:"mikesplumbing.com",category:"Home Services",status:"active",napScore:94,protected:true},
    {id:"u5",email:"sarah@dentalcare.com",password:"client123",role:"client",name:"Sarah Miller",avatar:"S",businessName:"Sarah's Dental Care",plan:"gmb",phone:"(555) 300-2000",address:"456 Oak Ave",city:"Houston",state:"TX",zip:"77001",website:"sarahsdental.com",category:"Medical / Health",status:"active",napScore:88,protected:true},
    {id:"u6",email:"john@autoshop.com",password:"client123",role:"client",name:"John Davis",avatar:"J",businessName:"Davis Auto Repair",plan:"essentials",phone:"(555) 400-3000",address:"789 Elm Rd",city:"Dallas",state:"TX",zip:"75201",website:"davisauto.com",category:"Auto Services",status:"active",napScore:72,protected:true},
  ],
  listings:[
    {id:"l1",clientId:"u4",directory:"Google Business Profile",status:"live",submitted:"Mar 1",liveDate:"Mar 2",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
    {id:"l2",clientId:"u4",directory:"Yellow Pages",status:"live",submitted:"Mar 1",liveDate:"Mar 5",napMatch:"match",liveLink:"https://yellowpages.com",da:92,notes:""},
    {id:"l3",clientId:"u4",directory:"Foursquare",status:"live",submitted:"Mar 2",liveDate:"Mar 6",napMatch:"match",liveLink:"https://foursquare.com",da:88,notes:""},
    {id:"l4",clientId:"u4",directory:"Manta",status:"live",submitted:"Mar 3",liveDate:"Mar 8",napMatch:"match",liveLink:"https://manta.com",da:74,notes:""},
    {id:"l5",clientId:"u4",directory:"MerchantCircle",status:"live",submitted:"Mar 4",liveDate:"Mar 10",napMatch:"fixed",liveLink:"https://merchantcircle.com",da:68,notes:"Phone corrected Jun 24"},
    {id:"l6",clientId:"u4",directory:"Hotfrog",status:"live",submitted:"Apr 1",liveDate:"Apr 4",napMatch:"match",liveLink:"https://hotfrog.com",da:62,notes:""},
    {id:"l7",clientId:"u4",directory:"Storeboard",status:"live",submitted:"Apr 2",liveDate:"Apr 7",napMatch:"match",liveLink:"https://storeboard.com",da:55,notes:""},
    {id:"l8",clientId:"u4",directory:"Proven Expert",status:"live",submitted:"Apr 3",liveDate:"Apr 9",napMatch:"match",liveLink:"https://provenexpert.com",da:58,notes:""},
    {id:"l9",clientId:"u4",directory:"Apple Business Connect",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:96,notes:"Awaiting Apple verification"},
    {id:"l10",clientId:"u4",directory:"Bing Places",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:94,notes:""},
    {id:"l11",clientId:"u5",directory:"Google Business Profile",status:"live",submitted:"Mar 15",liveDate:"Mar 16",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
    {id:"l12",clientId:"u5",directory:"Healthgrades",status:"live",submitted:"Mar 16",liveDate:"Mar 20",napMatch:"match",liveLink:"https://healthgrades.com",da:82,notes:""},
    {id:"l13",clientId:"u5",directory:"Zocdoc",status:"live",submitted:"Mar 17",liveDate:"Mar 22",napMatch:"match",liveLink:"https://zocdoc.com",da:78,notes:""},
    {id:"l14",clientId:"u5",directory:"Yellow Pages",status:"live",submitted:"Mar 18",liveDate:"Mar 25",napMatch:"mismatch",liveLink:"https://yellowpages.com",da:92,notes:"Address format issue"},
    {id:"l15",clientId:"u5",directory:"Vitals",status:"pending",submitted:"Jul 2",liveDate:"—",napMatch:"—",liveLink:"",da:70,notes:""},
    {id:"l16",clientId:"u6",directory:"Google Business Profile",status:"live",submitted:"Apr 1",liveDate:"Apr 2",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
    {id:"l17",clientId:"u6",directory:"Yellow Pages",status:"live",submitted:"Apr 2",liveDate:"Apr 6",napMatch:"match",liveLink:"https://yellowpages.com",da:92,notes:""},
    {id:"l18",clientId:"u6",directory:"Yelp",status:"flagged",submitted:"Apr 3",liveDate:"Apr 8",napMatch:"mismatch",liveLink:"https://yelp.com",da:90,notes:"Unauthorized edit detected"},
    {id:"l19",clientId:"u6",directory:"Manta",status:"rejected",submitted:"May 1",liveDate:"—",napMatch:"—",liveLink:"",da:74,notes:"Duplicate listing found"},
  ],
  gmb:{u5:{views:1240,calls:47,directions:83,source:"manual",
    trend:[{m:"Mar",v:680,c:28,d:51},{m:"Apr",v:820,c:34,d:63},{m:"May",v:1050,c:42,d:74},{m:"Jun",v:1240,c:47,d:83}],
    posts:[{title:"New Patient Special",date:"Jun 25",status:"live"},{title:"Open Saturdays",date:"Jun 15",status:"live"}],
    qa:[{q:"Do you accept insurance?",a:"Yes, we accept most major insurance plans.",date:"Jun 20"}],
    photos:3,completeness:{category:true,description:true,hours:true,photo:true,services:false,attributes:false}}},
  analytics:{},
  activity:[
    {id:"a1",clientId:"u4",type:"listing_live",desc:"Yellow Pages listing went live",date:"Jul 4, 2025",by:"Ali (Agent)"},
    {id:"a2",clientId:"u4",type:"nap_fix",desc:"Phone corrected on MerchantCircle",date:"Jun 24, 2025",by:"Ali (Agent)"},
    {id:"a3",clientId:"u4",type:"edit_blocked",desc:"Unauthorized edit blocked on Yelp — hours change reverted",date:"Jun 22, 2025",by:"System"},
    {id:"a4",clientId:"u5",type:"listing_live",desc:"Healthgrades listing went live",date:"Jun 18, 2025",by:"Ali (Agent)"},
    {id:"a5",clientId:"u6",type:"flagged",desc:"Yelp listing flagged — unauthorized edit detected",date:"Jun 20, 2025",by:"System"},
    {id:"a6",clientId:"u6",type:"rejected",desc:"Manta listing rejected — duplicate found",date:"May 10, 2025",by:"Ali (Agent)"},
  ],
  settings:{stripe:{essentials:"",growth:"",gmb:"",pubKey:""}},
};

// ─── API LAYER — Supabase Auth + profiles, with local demo fallback ──────────
const SUPA_URL=import.meta.env.VITE_SUPABASE_URL||"";
const SUPA_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY||"";
// Supabase client. persistSession=true keeps the session in storage across reloads.
// "Remember me" swaps the storage: localStorage (30-day durable) vs sessionStorage (tab-only).
const authStorage = (typeof window!=="undefined" && window.localStorage.getItem("ro_remember")==="0")
  ? window.sessionStorage : (typeof window!=="undefined" ? window.localStorage : undefined);
const supa=(SUPA_URL&&SUPA_KEY)?createClient(SUPA_URL,SUPA_KEY,{
  auth:{ persistSession:true, autoRefreshToken:true, storage:authStorage, storageKey:"ro_auth" }
}):null;
const LS=(k)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}};
const LSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const uid=()=>(crypto.randomUUID?crypto.randomUUID():"id"+Date.now()+Math.random());

// Password policy for a paid B2B tool: min 10 chars, upper+lower+number+symbol.
function passwordIssues(pw){
  const issues=[];
  if(!pw||pw.length<10)issues.push("at least 10 characters");
  if(!/[A-Z]/.test(pw))issues.push("an uppercase letter");
  if(!/[a-z]/.test(pw))issues.push("a lowercase letter");
  if(!/[0-9]/.test(pw))issues.push("a number");
  if(!/[^A-Za-z0-9]/.test(pw))issues.push("a symbol");
  return issues;
}
function passwordScore(pw){
  if(!pw)return 0;
  let s=0;
  if(pw.length>=10)s++; if(pw.length>=14)s++;
  if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))s++;
  if(/[0-9]/.test(pw))s++;
  if(/[^A-Za-z0-9]/.test(pw))s++;
  return Math.min(s,4); // 0-4
}
// STAFF roles can never be created via public signup — enforced here AND by DB trigger.
const STAFF_ROLES=["super_admin","manager","agent"];
// Master switch: flip to false at go-live to hide all demo quick-fill buttons.
const SHOW_DEMOS=(import.meta.env.VITE_SHOW_DEMOS!=="false");

const api={
  mode: supa?"supabase":"local",
  async init(){
    if(supa)return;
    if(!LS("ro3_users")){
      LSet("ro3_users",SEED.users);LSet("ro3_listings",SEED.listings);
      LSet("ro3_gmb",SEED.gmb);LSet("ro3_analytics",SEED.analytics);
      LSet("ro3_activity",SEED.activity);LSet("ro3_settings",SEED.settings);
    }
  },
  // Returns the logged-in profile if a Supabase session already exists
  async currentUser(){
    if(!supa)return null;
    const{data:{session}}=await supa.auth.getSession();
    if(!session)return null;
    const{data}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
    return data||null;
  },
  // remember=true → durable localStorage session; false → tab-only sessionStorage.
  setRemember(remember){
    try{ window.localStorage.setItem("ro_remember", remember?"1":"0"); }catch{}
  },
  async login(email,password){
    if(supa){
      const{data,error}=await supa.auth.signInWithPassword({email,password});
      if(error){
        if(error.message.includes("Email not confirmed"))
          return{error:"Please verify your email first. Check your inbox for the confirmation link."};
        if(error.status===429||/rate/i.test(error.message))
          return{error:"Too many attempts. Please wait a minute and try again."};
        return{error:error.message.includes("Invalid")?"Invalid email or password.":error.message};
      }
      const{data:prof}=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
      if(prof?.status==="suspended"){await supa.auth.signOut();return{error:"This account is suspended. Contact your account manager."};}
      return{user:prof};
    }
    const u=(LS("ro3_users")||[]).find(x=>x.email===email&&x.password===password);
    if(!u)return{error:"Invalid email or password. Try a demo account below."};
    if(u.status==="suspended")return{error:"This account is suspended. Contact your account manager."};
    return{user:u};
  },
  async signup({email,password,name,businessName,phone}){
    // Enforce password policy before hitting the network.
    const issues=passwordIssues(password);
    if(issues.length)return{error:"Password needs "+issues.join(", ")+"."};
    if(supa){
      // role is NEVER accepted from the client — the DB trigger hardcodes 'client'.
      const{data,error}=await supa.auth.signUp({email,password,options:{data:{name},emailRedirectTo:window.location.origin+"/login"}});
      if(error)return{error:error.message};
      if(data.user){
        await supa.from("profiles").update({name,businessName,phone,avatar:(name||email)[0].toUpperCase()}).eq("id",data.user.id);
      }
      // Email verification is required — Supabase returns no session until confirmed.
      if(!data.session)return{needsConfirm:true};
      const{data:prof}=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
      return{user:prof};
    }
    const us=LS("ro3_users")||[];
    if(us.find(x=>x.email===email))return{error:"An account with this email already exists."};
    const u={id:uid(),email,password,role:"client",name,businessName,phone,avatar:(name||email)[0].toUpperCase(),status:"active",napScore:0,createdAt:new Date().toISOString()};
    us.push(u);LSet("ro3_users",us);return{user:u};
  },
  async googleLogin(){
    if(!supa)return{error:"Google sign-in needs the live database. It's disabled in demo mode."};
    const{error}=await supa.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
    if(error)return{error:error.message};
    return{redirecting:true};
  },
  async resetPassword(email){
    if(!supa)return{error:"Password reset needs the live database."};
    const{error}=await supa.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    return error?{error:error.message}:{ok:true};
  },
  async logout(){if(supa)await supa.auth.signOut();},
  async loadAll(){
    if(supa){
      const[u,l,g,an,ac,s,au]=await Promise.all([
        supa.from("profiles").select("*"),
        supa.from("listings").select("*"),
        supa.from("gmb").select("*"),
        supa.from("analytics").select("*"),
        supa.from("activity").select("*").order("createdAt",{ascending:false}),
        supa.from("settings").select("*").eq("id",1).maybeSingle(),
        supa.from("audit").select("*").order("createdAt",{ascending:false}).limit(500),
      ]);
      const allUsers=u.data||[];const allListings=l.data||[];
      // Split live vs trashed (soft-deleted) so the UI can show a Trash view.
      const users=allUsers.filter(x=>!x.deletedAt);
      const trashedUsers=allUsers.filter(x=>x.deletedAt);
      const liveListings=allListings.filter(x=>!x.deletedAt);
      const trashedListings=allListings.filter(x=>x.deletedAt);
      const listings={};liveListings.forEach(x=>{(listings[x.clientId]=listings[x.clientId]||[]).push(x);});
      const gmb={};(g.data||[]).forEach(x=>gmb[x.clientId]=x.data);
      const analytics={};(an.data||[]).forEach(x=>analytics[x.clientId]=x.data);
      return{users,trashedUsers,listings,trashedListings,gmb,analytics,activity:ac.data||[],audit:au.data||[],settings:s.data?.data||SEED.settings};
    }
    const flatAll=LS("ro3_listings")||[];
    const flat=flatAll.filter(x=>!x.deletedAt);
    const listings={};flat.forEach(x=>{(listings[x.clientId]=listings[x.clientId]||[]).push(x);});
    const allU=LS("ro3_users")||[];
    return{users:allU.filter(x=>!x.deletedAt),trashedUsers:allU.filter(x=>x.deletedAt),listings,trashedListings:flatAll.filter(x=>x.deletedAt),gmb:LS("ro3_gmb")||{},analytics:LS("ro3_analytics")||{},activity:LS("ro3_activity")||[],audit:LS("ro3_audit")||[],settings:LS("ro3_settings")||SEED.settings};
  },
  // Audit log: every sensitive staff action records who/what/when. Fire-and-forget.
  async logAudit({actor,action,targetType,targetId,targetName,detail}){
    const row={id:uid(),actorId:actor?.id||"",actorName:actor?.name||actor?.email||"Unknown",actorRole:actor?.role||"",action,targetType:targetType||"",targetId:targetId||"",targetName:targetName||"",detail:detail||"",createdAt:new Date().toISOString()};
    if(supa){await supa.from("audit").insert(row);return;}
    LSet("ro3_audit",[row,...(LS("ro3_audit")||[])]);
  },
  async upsertProfile(u){
    if(supa){const{error}=await supa.from("profiles").upsert(u);if(error)console.error(error);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===u.id);
    if(i>=0)us[i]=u;else us.push(u);LSet("ro3_users",us);
  },
  // Soft-delete: sets deletedAt. Recoverable for 30 days, then purge.
  async deleteUser(id){
    const when=new Date().toISOString();
    if(supa){await supa.from("profiles").update({deletedAt:when}).eq("id",id);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){us[i].deletedAt=when;LSet("ro3_users",us);}
  },
  async restoreUser(id){
    if(supa){await supa.from("profiles").update({deletedAt:null}).eq("id",id);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){delete us[i].deletedAt;LSet("ro3_users",us);}
  },
  async purgeUser(id){ // permanent
    if(supa){await supa.from("profiles").delete().eq("id",id);return;}
    LSet("ro3_users",(LS("ro3_users")||[]).filter(x=>x.id!==id));
    LSet("ro3_listings",(LS("ro3_listings")||[]).filter(x=>x.clientId!==id));
    const g=LS("ro3_gmb")||{};delete g[id];LSet("ro3_gmb",g);
  },
  async upsertListing(l){
    if(supa){const{error}=await supa.from("listings").upsert(l);if(error)console.error(error);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===l.id);
    if(i>=0)ls[i]=l;else ls.push(l);LSet("ro3_listings",ls);
  },
  async deleteListing(id){
    const when=new Date().toISOString();
    if(supa){await supa.from("listings").update({deletedAt:when}).eq("id",id);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);if(i>=0){ls[i].deletedAt=when;LSet("ro3_listings",ls);}
  },
  async restoreListing(id){
    if(supa){await supa.from("listings").update({deletedAt:null}).eq("id",id);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);if(i>=0){delete ls[i].deletedAt;LSet("ro3_listings",ls);}
  },
  async purgeListing(id){
    if(supa){await supa.from("listings").delete().eq("id",id);return;}
    LSet("ro3_listings",(LS("ro3_listings")||[]).filter(x=>x.id!==id));
  },
  async upsertGmb(clientId,data){
    if(supa){await supa.from("gmb").upsert({clientId,data});return;}
    const g=LS("ro3_gmb")||{};g[clientId]=data;LSet("ro3_gmb",g);
  },
  async upsertAnalytics(clientId,data){
    if(supa){await supa.from("analytics").upsert({clientId,data});return;}
    const a=LS("ro3_analytics")||{};a[clientId]=data;LSet("ro3_analytics",a);
  },
  async addActivity(a){
    if(supa){await supa.from("activity").insert(a);return;}
    LSet("ro3_activity",[a,...(LS("ro3_activity")||[])]);
  },
  async saveSettings(data){
    if(supa){await supa.from("settings").update({data}).eq("id",1);return;}
    LSet("ro3_settings",data);
  },
};

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useWindowSize(){
  const[w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}
function useCounter(target,dur=900){
  const[val,setVal]=useState(0);
  useEffect(()=>{
    const n=typeof target==="number"?target:parseFloat(target)||0;
    if(!n){setVal(0);return;}
    let start=null,raf;
    const step=(ts)=>{if(!start)start=ts;const p=Math.min((ts-start)/dur,1);const e=1-Math.pow(1-p,3);setVal(Math.round(n*e));if(p<1)raf=requestAnimationFrame(step);};
    raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
  },[target,dur]);
  return val;
}
function useToast(){
  const[toasts,setToasts]=useState([]);
  const push=useCallback((msg,kind="success")=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,kind}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);
  const Toasts=useCallback(()=>(
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:2000,display:"flex",flexDirection:"column",gap:8,alignItems:"center",width:"calc(100% - 32px)",maxWidth:420,pointerEvents:"none"}}>
      {toasts.map(t=>(<div key={t.id} style={{animation:"toastIn .3s cubic-bezier(.22,.8,.36,1) both",background:T.ink,color:"#fff",borderRadius:12,padding:"11px 18px",fontSize:13,fontWeight:600,boxShadow:SHADOW_LG,display:"flex",alignItems:"center",gap:9,maxWidth:"100%"}}>
        <span>{t.kind==="success"?"✅":t.kind==="info"?"ℹ️":"⚠️"}</span>{t.msg}
      </div>))}
    </div>
  ),[toasts]);
  return[push,Toasts];
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Badge=({type,label})=>{
  const map={live:{bg:T.greenSoft,c:T.green,t:"Live"},pending:{bg:T.amberSoft,c:T.amber,t:"Pending"},rejected:{bg:T.redSoft,c:T.red,t:"Rejected"},flagged:{bg:T.redSoft,c:T.red,t:"Flagged"},fixed:{bg:T.blueSoft,c:T.blue,t:"NAP Fixed"},match:{bg:T.greenSoft,c:T.green,t:"✓ Match"},mismatch:{bg:T.redSoft,c:T.red,t:"Mismatch"},submitted:{bg:T.brandSoft,c:T.brand,t:"Submitted"},active:{bg:T.greenSoft,c:T.green,t:"Active"},suspended:{bg:T.redSoft,c:T.red,t:"Suspended"},paid:{bg:T.greenSoft,c:T.green,t:"Paid"},manual:{bg:T.amberSoft,c:T.amber,t:"Manual data"},connected:{bg:T.greenSoft,c:T.green,t:"Connected"}};
  const s=map[type]||map.submitted;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 11px",borderRadius:20,fontSize:11.5,fontWeight:700,background:s.bg,color:s.c}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.c,animation:type==="live"?"pulseDot 2.4s ease-in-out infinite":"none"}}/>{label||s.t}
  </span>);
};
const Card=({children,style={},hover=false,className=""})=>(
  <div className={`${hover?"hoverCard ":""}${className}`} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:18,padding:22,boxShadow:SHADOW,...style}}>{children}</div>
);
const Btn=({children,onClick,variant="primary",size="md",style={}})=>{
  const v={primary:{background:`linear-gradient(135deg,${T.brand},${T.brandDark})`,color:"#fff",border:"none",boxShadow:`0 4px 14px ${T.brandGlow}`},
    ghost:{background:T.surface,color:T.sub,border:`1px solid ${T.line}`},
    soft:{background:T.brandSoft,color:T.brand,border:"none"},
    green:{background:`linear-gradient(135deg,${T.green},#0B8A67)`,color:"#fff",border:"none",boxShadow:"0 4px 14px rgba(15,164,122,.22)"},
    danger:{background:T.redSoft,color:T.red,border:"none"}};
  const s={sm:{padding:"6px 14px",fontSize:12.5},md:{padding:"10px 20px",fontSize:13.5},lg:{padding:"13px 30px",fontSize:15}};
  return(<button onClick={onClick} style={{borderRadius:11,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,...v[variant],...s[size],...style}}>{children}</button>);
};
const Input=({label,value,onChange,placeholder,type="text",style={}})=>(
  <div style={{marginBottom:14,...style}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}</label>}
    <input type={type} value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}/>
  </div>
);
const Select=({label,value,onChange,options})=>(
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const Modal=({open,onClose,title,children,width=500})=>{
  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="pop" style={{background:T.surface,borderRadius:20,padding:26,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:SHADOW_LG}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:17,fontWeight:800,fontFamily:FONT_D}}>{title}</div>
        <button onClick={onClose} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:"50%"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
};
const Confirm=({data,onClose})=>{
  if(!data)return null;
  return(<Modal open onClose={onClose} title={data.title} width={420}>
    <div style={{fontSize:13.5,color:T.sub,lineHeight:1.6,marginBottom:20}}>{data.msg}</div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant={data.danger?"danger":"primary"} onClick={async()=>{await data.onYes();onClose();}}>{data.yes||"Confirm"}</Btn>
    </div>
  </Modal>);
};
const StatCard=({label,value,sub,color=T.brand,soft=T.brandSoft,icon,trend,delay=0})=>{
  const isNum=/^\d+/.test(String(value));
  const n=isNum?parseInt(String(value).replace(/[^0-9]/g,"")):0;
  const suffix=isNum?String(value).replace(/^[\d,]+/,""):"";
  const count=useCounter(n);
  return(<Card hover className="fadeUp" style={{animationDelay:`${delay}ms`,position:"relative",overflow:"hidden"}}>
    <div style={{width:42,height:42,borderRadius:13,background:soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:12}}>{icon}</div>
    <div style={{fontSize:11,fontWeight:700,color:T.faint,textTransform:"uppercase",letterSpacing:".8px",marginBottom:5}}>{label}</div>
    <div style={{fontSize:32,fontWeight:800,color:T.ink,lineHeight:1,fontFamily:FONT_D}}>{isNum?count.toLocaleString()+suffix:value}</div>
    {sub&&<div style={{fontSize:12,color:T.sub,marginTop:6}}>{sub}</div>}
    {trend!=null&&<div style={{fontSize:12,color:trend>0?T.green:T.red,marginTop:4,fontWeight:700}}>{trend>0?"▲":"▼"} {Math.abs(trend)}% vs last month</div>}
    <div style={{position:"absolute",top:-30,right:-30,width:90,height:90,borderRadius:"50%",background:soft,opacity:.5}}/>
  </Card>);
};
const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.ink,borderRadius:10,padding:"9px 13px",boxShadow:SHADOW_LG}}>
    <div style={{fontSize:11,color:"#B8BBD4",marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:12.5,color:"#fff",fontWeight:700}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:p.color,marginRight:6}}/>{p.name}: {p.value}</div>)}
  </div>);
};
// ─── EXPORT UTILITIES (CSV / XLSX / PDF) ─────────────────────────────────────
// Used by every list in the app via <ListToolbar>. Columns: [{key,label,get?}].
function rowsToMatrix(rows,cols){
  const header=cols.map(c=>c.label);
  const body=rows.map(r=>cols.map(c=>{
    const v=c.get?c.get(r):r[c.key];
    return v==null?"":String(v);
  }));
  return[header,...body];
}
function downloadBlob(content,filename,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportCSV(rows,cols,name){
  const m=rowsToMatrix(rows,cols);
  const csv=m.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadBlob("\uFEFF"+csv,`${name}.csv`,"text/csv;charset=utf-8;");
}
// XLSX via SheetJS, lazy-loaded from CDN only when first used (keeps bundle lean).
let _xlsx=null;
async function loadXLSX(){
  if(_xlsx)return _xlsx;
  if(window.XLSX){_xlsx=window.XLSX;return _xlsx;}
  await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  _xlsx=window.XLSX;return _xlsx;
}
async function exportXLSX(rows,cols,name){
  try{
    const XLSX=await loadXLSX();
    const m=rowsToMatrix(rows,cols);
    const ws=XLSX.utils.aoa_to_sheet(m);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");
    XLSX.writeFile(wb,`${name}.xlsx`);
  }catch(e){exportCSV(rows,cols,name);} // graceful fallback
}
// PDF via a print window — reliable, no heavy dep, user picks "Save as PDF".
function exportPDF(rows,cols,name,title){
  const m=rowsToMatrix(rows,cols);
  const head=m[0].map(h=>`<th>${h}</th>`).join("");
  const body=m.slice(1).map(r=>`<tr>${r.map(c=>`<td>${String(c).replace(/</g,"&lt;")}</td>`).join("")}</tr>`).join("");
  const html=`<html><head><title>${title||name}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#171732}
    h1{font-size:18px;margin:0 0 4px} .meta{color:#666;font-size:12px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#5B5BD6;color:#fff;text-align:left;padding:7px 9px}
    td{border-bottom:1px solid #eee;padding:6px 9px}
    tr:nth-child(even) td{background:#F6F7FB}
  </style></head><body>
    <h1>Rank Orbit — ${title||name}</h1>
    <div class="meta">${rows.length} rows · exported ${new Date().toLocaleString()}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;
  const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}
}

// Reusable toolbar: search box + optional dropdown filters + CSV/XLSX/PDF export.
// filters: [{label, value, set, options:[{value,label}]}]
function ListToolbar({search,setSearch,filters=[],rows,cols,exportName,exportTitle,placeholder="Search…"}){
  const w=useWindowSize();const isMobile=w<820;
  return(<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder}
      style={{flex:isMobile?"1 1 100%":"1 1 220px",minWidth:0,padding:"9px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:13,fontFamily:FONT_B,color:T.ink,boxSizing:"border-box"}}/>
    {filters.map((f,i)=>(
      <select key={i} value={f.value} onChange={e=>f.set(e.target.value)}
        style={{padding:"9px 12px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:12.5,fontFamily:FONT_B,color:T.ink,cursor:"pointer"}}>
        {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ))}
    {cols&&rows&&(<div style={{display:"flex",gap:6,marginLeft:isMobile?0:"auto"}}>
      <ExportBtn label="CSV" onClick={()=>exportCSV(rows,cols,exportName)}/>
      <ExportBtn label="Excel" onClick={()=>exportXLSX(rows,cols,exportName)}/>
      <ExportBtn label="PDF" onClick={()=>exportPDF(rows,cols,exportName,exportTitle)}/>
    </div>)}
  </div>);
}
const ExportBtn=({label,onClick})=>(
  <button onClick={onClick} title={`Download ${label}`} style={{padding:"8px 12px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:9,fontSize:12,fontWeight:700,color:T.sub,cursor:"pointer",fontFamily:FONT_B,display:"inline-flex",alignItems:"center",gap:5}}>
    <span style={{fontSize:12}}>⤓</span>{label}
  </button>
);

const SectionTitle=({children,sub,right})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,gap:8,flexWrap:"wrap"}}>
    <div>
      <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,color:T.ink}}>{children}</div>
      {sub&&<div style={{fontSize:12,color:T.sub,marginTop:2}}>{sub}</div>}
    </div>
    {right}
  </div>
);
const Empty=({icon,title,sub})=>(
  <div style={{textAlign:"center",padding:"36px 16px",color:T.sub}}>
    <div style={{fontSize:36,marginBottom:10,animation:"floaty 3s ease-in-out infinite"}}>{icon}</div>
    <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>{title}</div>
    <div style={{fontSize:12.5}}>{sub}</div>
  </div>
);
const actIcon=(t)=>({listing_live:"🟢",nap_fix:"🔧",edit_blocked:"🛡️",flagged:"🚩",rejected:"❌",gmb_update:"📍",submitted:"📤",analytics:"📈",client:"👤"}[t]||"⚡");
const PLANS={essentials:{name:"Essentials",price:49,quota:"10 listings/mo",color:T.blue,soft:T.blueSoft,features:["10 directory submissions every month","NAP consistency management","Unauthorized edit protection","Listing monitoring & alerts","Client dashboard access"]},
  growth:{name:"Growth",price:89,quota:"20 listings/mo",color:T.brand,soft:T.brandSoft,features:["20 directory submissions every month","Everything in Essentials","Expanded directory coverage","Priority support","Monthly coverage report"]},
  gmb:{name:"GMB Pro",price:249,quota:"20 listings + GMB",color:T.violet,soft:T.violetSoft,features:["Everything in Growth","Google Business Profile management","Monthly GMB posts & Q&A","Engagement analytics (views, calls)","Dedicated BDM support"]}};
const BIZ_FIELDS=[["name","Full Name"],["businessName","Business Name"],["email","Email"],["phone","Phone"],["address","Address"],["city","City"],["state","State"],["zip","ZIP"],["website","Website"]];
const CATEGORIES=["Home Services","Medical / Health","Legal","Restaurant / Food","Auto Services","Beauty & Salon","Real Estate","Other"];
const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
const todayFull=()=>new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
const nextMonthFirst=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1).toISOString();};

// ─── AUTH ────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin,portal="client"}){
  // portal="staff" → /admin (login only, no public signup). portal="client" → /login (+signup).
  const isStaff=portal==="staff";
  const[mode,setMode]=useState("login"); // login | signup | forgot
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
    // Role-guard: staff portal rejects clients; client portal rejects staff.
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
    else if(r.needsConfirm){setError("");setInfo("Almost there! Check your email and click the verification link, then sign in.");setMode("login");}
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
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,letterSpacing:"-1px"}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
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
          <MiniOrbit size={40}/><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
        </div>)}
        <Card style={{padding:28,boxShadow:SHADOW_LG}}>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:4}}>{isStaff?"Staff sign in":mode==="login"?"Sign in":mode==="signup"?"Create your account":"Reset password"}</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:20}}>{isStaff?"Admin, manager & agent access.":mode==="login"?"Welcome back. Enter your details.":mode==="signup"?"Start getting listed everywhere.":"We'll email you a reset link."}</div>
          {info&&<div style={{fontSize:12.5,color:T.green,marginBottom:12,background:T.greenSoft,padding:"8px 12px",borderRadius:9}}>{info}</div>}
          {mode==="signup"&&!isStaff&&(<>
            <Input label="Full Name" value={name} onChange={setName} placeholder="Mike Johnson"/>
            <Input label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Mike's Plumbing"/>
            <Input label="Phone (optional)" value={phone} onChange={setPhone} placeholder="(555) 200-0000"/>
          </>)}
          <Input label="Email" value={email} onChange={setEmail} placeholder="you@business.com"/>
          {mode!=="forgot"&&<Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>}
          {mode==="signup"&&!isStaff&&password&&(()=>{
            const sc=passwordScore(password);const cols=[T.red,T.red,T.amber,T.blue,T.green];const lbl=["Very weak","Weak","Fair","Good","Strong"];
            return(<div style={{marginTop:-6,marginBottom:12}}>
              <div style={{display:"flex",gap:4,marginBottom:5}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<sc?cols[sc]:T.line,transition:"background .2s"}}/>)}</div>
              <div style={{fontSize:11,color:cols[sc],fontWeight:700}}>{lbl[sc]} · needs 10+ chars, upper, lower, number, symbol</div>
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
            {mode==="login"&&(<>New here? <span onClick={()=>{setMode("signup");setError("");setInfo("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Create an account</span> · <span onClick={()=>{setMode("forgot");setError("");setInfo("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Forgot?</span></>)}
            {mode==="signup"&&(<>Have an account? <span onClick={()=>{setMode("login");setError("");}} style={{color:T.brand,fontWeight:700,cursor:"pointer"}}>Sign in</span></>)}
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
            <div style={{marginTop:12,fontSize:11,color:T.faint,textAlign:"center"}}>Demo accounts — removed before go-live</div>
          </div>)}
        </Card>
      </div>
    </div>
  </div>);
}

// ─── SHELL ───────────────────────────────────────────────────────────────────
function Shell({user,nav,page,setPage,onLogout,planBadge,badgeCounts={},children,brandTag}){
  const w=useWindowSize();const isMobile=w<820;
  const[open,setOpen]=useState(false);
  const Item=({item})=>{
    const active=page===item.id||(item.match&&item.match.includes(page));
    return(<div className="navItem" onClick={()=>{setPage(item.id);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 14px",margin:"2px 10px",cursor:"pointer",color:active?T.brand:T.sub,background:active?T.brandSoft:"transparent",borderRadius:12,fontWeight:active?800:600,fontSize:13.5}}>
      <span style={{fontSize:16}}>{item.icon}</span><span>{item.label}</span>
      {badgeCounts[item.id]>0&&<span style={{marginLeft:"auto",background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"2px 7px"}}>{badgeCounts[item.id]}</span>}
      {item.locked&&<span style={{marginLeft:"auto",fontSize:11,color:T.faint}}>🔒</span>}
    </div>);
  };
  const Side=()=>(<div style={{width:isMobile?272:236,background:T.surface,borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",flexShrink:0,...(isMobile?{position:"fixed",top:0,left:open?0:"-290px",height:"100vh",zIndex:200,transition:"left .28s cubic-bezier(.22,.8,.36,1)",boxShadow:open?SHADOW_LG:"none"}:{})}}>
    <div style={{padding:"20px 18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <MiniOrbit size={34}/>
          <div>
            <div style={{fontFamily:FONT_D,fontSize:15.5,fontWeight:800,lineHeight:1.1}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
            {brandTag&&<div style={{fontSize:9.5,fontWeight:800,color:T.red,letterSpacing:".6px"}}>{brandTag}</div>}
          </div>
        </div>
        {isMobile&&<button onClick={()=>setOpen(false)} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:30,height:30,borderRadius:"50%"}}>×</button>}
      </div>
      {planBadge}
    </div>
    <nav style={{flex:1,overflowY:"auto",paddingBottom:10}}>{nav.map(i=><Item key={i.id} item={i}/>)}</nav>
    <div style={{padding:"14px 16px 18px",borderTop:`1px solid ${T.line}`}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{user.avatar}</div>
        <div style={{overflow:"hidden",flex:1}}>
          <div style={{fontSize:12.5,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.businessName||user.name}</div>
          <div style={{fontSize:10.5,color:T.faint,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
        </div>
      </div>
      <button onClick={onLogout} style={{width:"100%",padding:"9px 0",background:T.surface2,border:`1px solid ${T.line}`,borderRadius:10,color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
        <span style={{fontSize:13}}>↪</span> Sign Out
      </button>
    </div>
  </div>);
  return(<div style={{display:"flex",height:"100vh",background:T.bg,color:T.ink,fontFamily:FONT_B,overflow:"hidden"}}>
    <Side/>
    {isMobile&&open&&<div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.35)",zIndex:199}} onClick={()=>setOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isMobile&&(<div style={{padding:"13px 16px",background:T.surface,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:12,flexShrink:0,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setOpen(true)} style={{background:T.surface2,border:"none",color:T.ink,fontSize:17,cursor:"pointer",width:36,height:36,borderRadius:10}}>☰</button>
          <div style={{fontFamily:FONT_D,fontSize:15,fontWeight:800}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"none",color:T.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Sign Out ↪</button>
      </div>)}
      <div style={{flex:1,overflow:"auto",padding:isMobile?"18px 16px 40px":"30px 34px 50px"}}>
        <div key={page} className="fadeUp">{children}</div>
      </div>
    </div>
  </div>);
}
const PageHead=({title,sub,right,isMobile})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
    <div>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?20:24,fontWeight:800,letterSpacing:"-.4px"}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:T.sub,marginTop:4}}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
function ClientDashboard({user,data,reload,onLogout}){
  const[page,setPage]=useState("home");
  const[toast,Toasts]=useToast();
  const w=useWindowSize();const isMobile=w<820;
  const my=data.listings[user.id]||[];
  const myGmb=data.gmb[user.id];
  const myAnalytics=data.analytics[user.id];
  const myAct=data.activity.filter(a=>a.clientId===user.id);
  const settings=data.settings;
  const live=my.filter(l=>l.status==="live").length;
  const pending=my.filter(l=>l.status==="pending").length;
  const plan=PLANS[user.plan]||PLANS.essentials;
  const hour=new Date().getHours();
  const greet=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const nav=[
    {id:"home",icon:"🏠",label:"Home"},
    {id:"listings",icon:"📋",label:"Listings"},
    {id:"gmb",icon:"📍",label:"GMB Management",locked:user.plan!=="gmb"},
    {id:"analytics",icon:"📈",label:"Analytics"},
    {id:"billing",icon:"💳",label:"Plan & Billing"},
    {id:"call",icon:"📞",label:"Book a Call"},
    {id:"legal",icon:"📄",label:"Terms & Privacy"},
  ];
  const growthData=[{m:"Mar",live:Math.max(0,live-6)},{m:"Apr",live:Math.max(0,live-4)},{m:"May",live:Math.max(0,live-2)},{m:"Jun",live:Math.max(0,live-1)},{m:"Jul",live}];
  const planBadge=user.plan?(<div style={{marginTop:14,padding:"10px 13px",background:plan.soft,borderRadius:13}}>
    <div style={{fontSize:10,color:T.sub,fontWeight:800,letterSpacing:".5px"}}>YOUR PLAN</div>
    <div style={{fontSize:14,fontWeight:800,color:plan.color,marginTop:2,fontFamily:FONT_D}}>{plan.name} · ${plan.price}/mo</div>
    <div style={{fontSize:10.5,color:T.sub,marginTop:2}}>{plan.quota}</div>
  </div>):(<div style={{marginTop:14,padding:"10px 13px",background:T.amberSoft,borderRadius:13}}>
    <div style={{fontSize:10,color:T.amber,fontWeight:800,letterSpacing:".5px"}}>NO PLAN YET</div>
    <div style={{fontSize:12,color:T.sub,marginTop:3}}>Pick a plan on the Billing page to get started.</div>
  </div>);

  const Home=()=>(<div>
    <PageHead isMobile={isMobile} title={`${greet}, ${(user.name||"there").split(" ")[0]} 👋`} sub={`Here's what we're doing for ${user.businessName||"your business"} right now`}
      right={<Btn variant="soft" size="sm" onClick={()=>setPage("call")}>📞 Talk to your BDM</Btn>}/>
    {!user.plan&&(<Card style={{marginBottom:18,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>Welcome to Rank Orbit 🚀</div><div style={{fontSize:13,color:T.sub,marginTop:3}}>Choose a plan to start getting listed, or your account manager will set you up after your call.</div></div>
      <Btn onClick={()=>setPage("billing")}>Choose a plan</Btn>
    </Card>)}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22}}>
      <StatCard label="Listings Live" value={live} sub={`${pending} pending approval`} icon="🟢" color={T.green} soft={T.greenSoft} trend={live>0?12:null} delay={0}/>
      <StatCard label="NAP Score" value={`${user.napScore||0}%`} sub="Info matches everywhere" icon="✅" delay={80}/>
      <StatCard label="Edits Blocked" value={myAct.filter(a=>a.type==="edit_blocked").length} sub="Unauthorized changes reverted" icon="🛡️" color={T.amber} soft={T.amberSoft} delay={160}/>
      <StatCard label="Directories" value={my.length} sub="Managed for you" icon="🌐" color={T.blue} soft={T.blueSoft} delay={240}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
      <Card className="fadeUp" style={{animationDelay:"120ms"}}>
        <SectionTitle sub="Directories live for your business over time">Your Visibility Is Growing</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={growthData}>
            <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.28}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="live" name="Live listings" stroke={T.green} strokeWidth={2.5} fill="url(#lg)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} animationDuration={1200}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card className="fadeUp" style={{animationDelay:"200ms"}}>
        <SectionTitle sub="of 60 target directories">Coverage Progress</SectionTitle>
        <div style={{display:"flex",justifyContent:"center",margin:"6px 0 14px"}}>
          <div style={{position:"relative",width:150,height:150}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={[{v:live},{v:pending},{v:Math.max(0,60-live-pending)}]} cx="50%" cy="50%" innerRadius={52} outerRadius={70} dataKey="v" strokeWidth={0} startAngle={90} endAngle={-270} animationDuration={1100}>
                <Cell fill={T.green}/><Cell fill={T.amber}/><Cell fill={T.line}/>
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{Math.round(live/60*100)}%</div>
              <div style={{fontSize:10.5,color:T.faint}}>covered</div>
            </div>
          </div>
        </div>
        {[{l:"Live",c:T.green,v:live},{l:"Pending",c:T.amber,v:pending},{l:"Upcoming",c:T.faint,v:Math.max(0,60-live-pending)}].map(d=>(
          <div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:d.c}}/><span style={{fontSize:12.5,color:T.sub}}>{d.l}</span></div>
            <span style={{fontSize:13,fontWeight:800,color:d.c===T.faint?T.sub:d.c}}>{d.v}</span>
          </div>))}
      </Card>
    </div>
    <Card className="fadeUp" style={{animationDelay:"280ms"}}>
      <SectionTitle sub="Every action we take on your account, logged with dates">Recent Activity</SectionTitle>
      {myAct.length===0?<Empty icon="🛰️" title="Work starting" sub="Your first listings are being prepared — check back soon."/>:
        myAct.slice(0,5).map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<Math.min(myAct.length,5)-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
        </div>))}
    </Card>
  </div>);

  const Listings=()=>(<div>
    <PageHead isMobile={isMobile} title="Listings & Citations" sub={`${plan.quota} on your ${plan.name} plan`}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="Live" value={live} icon="✅" color={T.green} soft={T.greenSoft} delay={0}/>
      <StatCard label="Pending" value={pending} icon="⏳" color={T.amber} soft={T.amberSoft} delay={70}/>
      <StatCard label="NAP Score" value={`${user.napScore||0}%`} icon="📊" delay={140}/>
      <StatCard label="Protected" value={my.length} sub="Monitored 24/7" icon="🛡️" color={T.blue} soft={T.blueSoft} delay={210}/>
    </div>
    <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
      <SectionTitle>Your Directories</SectionTitle>
      {my.length===0?<Empty icon="📋" title="No listings yet" sub="Your directory submissions will appear here once your plan is active."/>:
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
        <thead><tr>{["Directory","Status","Authority","Live Since","Info Match","Link"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
        <tbody>{my.map((d)=>(<tr key={d.id} className="hoverRow">
          <td style={{padding:"12px",fontSize:13.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:44,height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}><div style={{width:`${d.da}%`,height:"100%",background:d.da>=80?T.green:d.da>=60?T.amber:T.faint,borderRadius:3,animation:"growBar .9s ease both"}}/></div>
              <span style={{fontSize:12,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub}}>{d.da}</span>
            </div>
          </td>
          <td style={{padding:"12px",fontSize:12.5,color:d.liveDate==="—"?T.faint:T.ink,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="—"?<span style={{fontSize:12,color:T.faint}}>—</span>:<Badge type={d.napMatch}/>}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:12}}>—</span>}</td>
        </tr>))}</tbody>
      </table>}
    </Card>
  </div>);

  const Analytics=()=>{
    const a=myAnalytics;
    if(!a||!a.trend?.length)return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website"/>
      <Card><Empty icon="📈" title="Analytics not connected yet" sub="Your account manager will connect Google Analytics or add your numbers soon."/></Card>
    </div>);
    return(<div>
      <PageHead isMobile={isMobile} title="Website Analytics" sub="Traffic and engagement from your website" right={<Badge type={a.source==="connected"?"connected":"manual"}/>}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Sessions" value={a.sessions||0} icon="👣" color={T.green} soft={T.greenSoft} delay={0}/>
        <StatCard label="Users" value={a.users||0} icon="👤" delay={70}/>
        <StatCard label="Page Views" value={a.pageviews||0} icon="📄" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Avg. Time" value={a.avgTime||"0:00"} icon="⏱️" color={T.violet} soft={T.violetSoft} delay={210}/>
      </div>
      <Card><SectionTitle sub="Monthly website sessions & users">Traffic Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={a.trend}>
            <defs><linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.25}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="s" name="Sessions" stroke={T.brand} strokeWidth={2.5} fill="url(#as)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="u" name="Users" stroke={T.green} strokeWidth={2} fill="none" dot={false} animationDuration={1300}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>);
  };

  const Gmb=()=>{
    if(user.plan!=="gmb")return(<div>
      <PageHead isMobile={isMobile} title="GMB Management"/>
      <Card style={{textAlign:"center",padding:isMobile?32:56,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Orbit size={100} speed={10}/></div>
        <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,marginBottom:8}}>Put your Google profile on autopilot</div>
        <div style={{fontSize:13.5,color:T.sub,maxWidth:420,margin:"0 auto 24px",lineHeight:1.6}}>We publish posts, answer Q&A, keep your profile complete, and show you exactly how many calls and visits Google sends you every month.</div>
        <Btn size="lg" onClick={()=>setPage("billing")}>Upgrade to GMB Pro — $249/mo</Btn>
        <div style={{fontSize:11.5,color:T.faint,marginTop:12}}>Includes everything in Growth · Cancel anytime</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub="Your Google Business Profile, actively managed" right={<Badge type={d.source==="connected"?"connected":"manual"}/>}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Profile Views" value={d.views} icon="👁️" color={T.green} soft={T.greenSoft} trend={18} delay={0}/>
        <StatCard label="Calls From Google" value={d.calls} icon="📞" trend={12} delay={80}/>
        <StatCard label="Direction Requests" value={d.directions} icon="🗺️" color={T.blue} soft={T.blueSoft} trend={9} delay={160}/>
      </div>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Real customer engagement from your Google profile">Engagement Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.trend}>
            <defs>
              <linearGradient id="gv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.22}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.2}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="v" name="Views" stroke={T.green} strokeWidth={2.5} fill="url(#gv2)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="c" name="Calls" stroke={T.brand} strokeWidth={2.5} fill="url(#gc2)" dot={false} animationDuration={1300}/>
            <Area type="monotone" dataKey="d" name="Directions" stroke={T.blue} strokeWidth={2} fill="none" dot={false} animationDuration={1500}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card><SectionTitle>Posts Published</SectionTitle>
          {(!d.posts||d.posts.length===0)?<Empty icon="📝" title="No posts yet" sub="Your first GMB post is being drafted."/>:
            d.posts.map((p,i)=>(<div key={i} className="hoverRow" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 8px",borderRadius:10,borderBottom:i<d.posts.length-1?`1px solid ${T.line}`:"none"}}>
              <div><div style={{fontSize:13.5,fontWeight:700}}>{p.title}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>Published {p.date}</div></div>
              <Badge type="live"/>
            </div>))}
        </Card>
        <Card><SectionTitle>Profile Completeness</SectionTitle>
          {Object.entries(d.completeness||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:13,color:T.sub,textTransform:"capitalize"}}>{k}</span>
            <span style={{fontSize:12.5,fontWeight:800,color:v?T.green:T.amber}}>{v?"✓ Done":"○ In progress"}</span>
          </div>))}
        </Card>
      </div>
    </div>);
  };

  const Billing=()=>{
    const stripe=settings?.stripe||{};
    const goStripe=(planId)=>{
      const link=stripe[planId];
      if(link&&link.startsWith("http")){
        // Tag the checkout with this client's id + plan so the webhook can auto-activate the right account.
        const sep=link.includes("?")?"&":"?";
        const url=`${link}${sep}client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email||"")}`;
        window.open(url,"_blank");
      }else toast("Payment link not set up yet — your account manager will send it","info");
    };
    return(<div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get"/>
      {user.plan&&(<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:20}}>
        <Card className="fadeUp" style={{position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:plan.soft,opacity:.6}}/>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{plan.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color}}>${plan.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/month</span></div>
            <Badge type="active"/>
          </div>
          <div style={{marginTop:16}}>
            {plan.features.map((f,i)=>(<div key={i} style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
              <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:800,flexShrink:0}}>✓</div>
              <span style={{fontSize:13,color:T.sub}}>{f}</span>
            </div>))}
          </div>
        </Card>
        <Card className="fadeUp" style={{animationDelay:"100ms",background:user.cancelAtPeriodEnd?`linear-gradient(135deg,${T.amberSoft},#fff)`:`linear-gradient(135deg,${T.brandSoft},#fff)`}}>
          {user.cancelAtPeriodEnd?(<>
            <div style={{fontSize:11,fontWeight:800,color:T.amber,letterSpacing:".8px",marginBottom:8}}>SUBSCRIPTION ENDING</div>
            <div style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,color:T.amber}}>Cancels on renewal</div>
            <div style={{fontSize:13,color:T.sub,marginTop:6,lineHeight:1.5}}>You keep full access until <b>{user.currentPeriodEnd?new Date(user.currentPeriodEnd).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"the end of your billing period"}</b>. You won't be charged again.</div>
            <Btn variant="green" size="sm" style={{width:"100%",marginTop:12}} onClick={()=>R(async()=>{await api.upsertProfile({...user,cancelAtPeriodEnd:false,canceledAt:null});},"Subscription resumed — you're all set")}>Resume subscription</Btn>
          </>):(<>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>on the 1st of next month</div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically. Cancel before your renewal date to avoid the next charge — you keep access until the period ends.</div>
            <button onClick={()=>setConfirm({title:"Cancel subscription?",msg:`Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`,danger:true,yes:"Cancel at period end",onYes:()=>R(async()=>{await api.upsertProfile({...user,cancelAtPeriodEnd:true,canceledAt:new Date().toISOString(),currentPeriodEnd:user.currentPeriodEnd||nextMonthFirst()});},"Subscription set to cancel at period end")})} style={{marginTop:12,background:"none",border:"none",color:T.faint,fontSize:11.5,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:FONT_B,padding:0}}>Cancel subscription</button>
          </>)}
        </Card>
      </div>)}
      <SectionTitle sub="Pick a plan to start, or upgrade anytime — secure checkout via Stripe">{user.plan?"Change Plan":"Choose Your Plan"}</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
        {Object.entries(PLANS).map(([id,p],i)=>{
          const current=id===user.plan;
          return(<div key={id} className="fadeUp hoverCard" style={{animationDelay:`${i*90}ms`,background:T.surface,border:`2px solid ${current?p.color:T.line}`,borderRadius:18,padding:22,position:"relative",boxShadow:current?SHADOW_LG:SHADOW}}>
            {current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20}}>CURRENT PLAN</div>}
            {id==="growth"&&!current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20}}>MOST POPULAR</div>}
            <div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>{p.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,color:p.color,margin:"5px 0 2px"}}>${p.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/mo</span></div>
            <div style={{fontSize:12,color:T.sub,fontWeight:700,marginBottom:14}}>{p.quota}</div>
            <div style={{height:1,background:T.line,marginBottom:14}}/>
            {p.features.map((f,j)=><div key={j} style={{fontSize:12,color:T.sub,marginBottom:8,display:"flex",gap:7}}><span style={{color:T.green,fontWeight:800}}>✓</span>{f}</div>)}
            {current?<Btn variant="ghost" size="sm" style={{width:"100%",marginTop:10}} onClick={()=>toast("This is your active plan")}>Your current plan</Btn>:
              <Btn size="sm" style={{width:"100%",marginTop:10}} onClick={()=>goStripe(id)}>{user.plan?"Switch to ":"Subscribe to "}{p.name} →</Btn>}
          </div>);
        })}
      </div>
      {user.plan&&(<Card style={{marginTop:20}}>
        <SectionTitle right={<Btn variant="ghost" size="sm" onClick={()=>{
          if(settings?.stripe?.portalLink){const sep=settings.stripe.portalLink.includes("?")?"&":"?";window.open(`${settings.stripe.portalLink}${sep}prefilled_email=${encodeURIComponent(user.email||"")}`,"_blank");}
          else toast("Card management opens in Stripe once your account manager enables the billing portal","info");
        }}>💳 Manage billing</Btn>}>Invoice History</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
            <thead><tr>{["Date","Description","Card","Amount","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>{[0,1,2].map(m=>{const dt=new Date();dt.setMonth(dt.getMonth()-m);const last4=user.cardLast4||"••••";return(<tr key={m} className="hoverRow">
              <td style={{padding:"12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{dt.toLocaleDateString("en-US",{month:"short",year:"numeric"})} 1</td>
              <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{plan.name} plan · monthly</td>
              <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{user.cardBrand||"Card"} •••• {last4}</td>
              <td style={{padding:"12px",fontSize:13,fontWeight:800,borderBottom:`1px solid ${T.line}`}}>${plan.price}.00</td>
              <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type="paid"/></td>
              <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><button onClick={()=>toast("Invoice PDF available in Manage billing","info")} style={{background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>PDF ↓</button></td>
            </tr>);})}</tbody>
          </table>
        </div>
        <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.line}`,fontSize:11.5,color:T.faint,lineHeight:1.5}}>
          Your primary card shows above. Add or remove cards, and download official invoices, in <b>Manage billing</b> (secure Stripe portal). Card details are never stored on our servers.
        </div>
      </Card>)}
      <Card style={{marginTop:16}}>
        <SectionTitle sub="Download everything we hold about your account — profile, listings, and activity.">Your Data</SectionTitle>
        <Btn variant="ghost" size="sm" onClick={()=>{
          const mine={profile:user,listings:my,activity:myAct,exportedAt:new Date().toISOString()};
          downloadBlob(JSON.stringify(mine,null,2),`rankorbit-my-data-${Date.now()}.json`,"application/json");
          toast("Your data downloaded");
        }}>⤓ Download my data (JSON)</Btn>
      </Card>
    </div>);
  };

  const CallPage=()=>{
    const[selDay,setSelDay]=useState(null);
    const[selTime,setSelTime]=useState(null);
    const[confirmed,setConfirmed]=useState(false);
    const times=["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM"];
    const unavail=["9:30 AM","10:30 AM","2:30 PM"];
    const bookedDays=[3,8,14,22,28];const totalDays=31;const firstDay=2;
    return(<div>
      <PageHead isMobile={isMobile} title="Book a Call" sub="30 minutes with your dedicated Business Development Manager"/>
      {confirmed?(<Card className="pop" style={{textAlign:"center",padding:46,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Orbit size={90} speed={8}/></div>
        <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:T.green,marginBottom:8}}>You're booked!</div>
        <div style={{fontSize:14,color:T.sub,marginBottom:22}}>July {selDay} at {selTime} · calendar invite sent to {user.email}</div>
        <Btn variant="ghost" onClick={()=>{setConfirmed(false);setSelDay(null);setSelTime(null);}}>Schedule another</Btn>
      </Card>):(
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 0.8fr",gap:16}}>
        <Card>
          <SectionTitle>July 2025</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.faint,fontWeight:800,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:totalDays}).map((_,i)=>{
              const day=i+1;const isBooked=bookedDays.includes(day);const isSel=selDay===day;const isPast=day<15;const isWknd=(firstDay+i)%7===0||(firstDay+i)%7===6;
              const dead=isBooked||isPast||isWknd;
              return(<div key={day} onClick={()=>!dead&&setSelDay(day)} style={{textAlign:"center",padding:"8px 2px",borderRadius:10,fontSize:12.5,fontWeight:isSel?800:600,cursor:dead?"default":"pointer",background:isSel?T.brand:dead?"transparent":T.surface2,color:isSel?"#fff":dead?T.faint:T.ink,position:"relative",transition:"all .15s"}}>
                {day}{isBooked&&!isSel&&<div style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:T.red}}/>}
              </div>);
            })}
          </div>
        </Card>
        <Card>
          {selDay?(<>
            <SectionTitle sub="Pick a 30-minute slot">July {selDay}, 2025</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {times.map(t=>{const na=unavail.includes(t);const isSel=selTime===t;
                return(<div key={t} onClick={()=>!na&&setSelTime(t)} style={{padding:"10px 8px",borderRadius:10,textAlign:"center",border:`1.5px solid ${isSel?T.brand:T.line}`,background:isSel?T.brandSoft:na?T.surface2:T.surface,color:isSel?T.brand:na?T.faint:T.ink,fontSize:12.5,fontWeight:isSel?800:600,cursor:na?"default":"pointer",textDecoration:na?"line-through":"none",transition:"all .15s"}}>{t}</div>);})}
            </div>
            {selTime&&(<div className="pop" style={{marginTop:14}}>
              <div style={{padding:13,background:T.greenSoft,borderRadius:12,marginBottom:12}}>
                <div style={{fontSize:13,color:T.green,fontWeight:800}}>✓ July {selDay} at {selTime}</div>
                <div style={{fontSize:11.5,color:T.sub,marginTop:2}}>30 min with your BDM</div>
              </div>
              <Btn variant="green" style={{width:"100%"}} onClick={()=>setConfirmed(true)}>Confirm Booking</Btn>
            </div>)}
          </>):(<Empty icon="📅" title="Pick a date" sub="Choose an available day on the calendar to see open times."/>)}
        </Card>
        <Card>
          <SectionTitle>What we'll cover</SectionTitle>
          {["Your listings progress","NAP score walkthrough","Next month's targets","Plan questions"].map((item,i)=>(<div key={i} style={{display:"flex",gap:9,marginBottom:10,alignItems:"center"}}>
            <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>✓</div>
            <span style={{fontSize:12.5,color:T.sub}}>{item}</span>
          </div>))}
          <div style={{height:1,background:T.line,margin:"14px 0"}}/>
          <textarea placeholder="Any questions before the call?" style={{width:"100%",padding:"10px 13px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:12.5,resize:"none",height:74,boxSizing:"border-box",fontFamily:FONT_B}}/>
          <Btn variant="soft" size="sm" style={{width:"100%",marginTop:9}} onClick={()=>toast("Message sent to your BDM")}>Send message</Btn>
        </Card>
      </div>)}
    </div>);
  };

  const LegalPage=()=>{
    const[tab,setTab]=useState("terms");
    const co="Rank Orbit";const eff=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    const H=({children})=>(<div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D,color:T.ink,margin:"18px 0 7px"}}>{children}</div>);
    const P=({children})=>(<p style={{fontSize:13,color:T.sub,lineHeight:1.65,margin:"0 0 10px"}}>{children}</p>);
    return(<div>
      <PageHead isMobile={isMobile} title="Terms & Privacy" sub={`Effective ${eff}`}/>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["terms","Terms of Service"],["privacy","Privacy Policy"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 18px",borderRadius:20,border:`1.5px solid ${tab===id?T.brand:T.line}`,background:tab===id?T.brandSoft:T.surface,color:tab===id?T.brand:T.sub,fontSize:13,fontWeight:tab===id?800:600,cursor:"pointer",fontFamily:FONT_B}}>{l}</button>))}
      </div>
      <Card style={{maxWidth:820}}>
        <div style={{padding:"11px 15px",background:T.amberSoft,borderRadius:11,marginBottom:18,fontSize:11.5,color:T.amber,lineHeight:1.5}}>
          <b>Template notice:</b> This is a starting-point document. Have it reviewed by a qualified lawyer in your jurisdiction before relying on it for real clients.
        </div>
        {tab==="terms"?(<div>
          <H>1. Agreement</H>
          <P>These Terms of Service govern your use of the {co} platform and services ("Services"). By creating an account or subscribing, you agree to these terms. If you are accepting on behalf of a business, you confirm you are authorized to bind that business.</P>
          <H>2. The Services</H>
          <P>{co} provides local business visibility services, including directory listing submissions and management, NAP (Name, Address, Phone) consistency monitoring, unauthorized-edit protection, and, on eligible plans, Google Business Profile management. Deliverables and volumes depend on your selected plan.</P>
          <H>3. Subscriptions and Billing</H>
          <P>Services are billed as recurring monthly subscriptions via our payment processor (Stripe). Your subscription renews automatically each month until cancelled. By subscribing, you authorize {co} to charge your payment method on each renewal date.</P>
          <H>4. Cancellation</H>
          <P>You may cancel at any time from your billing dashboard. Cancellation takes effect at the end of your current billing period: you retain full access until that date, and you will not be charged for the following period. To avoid the next charge, you must cancel before your renewal date.</P>
          <H>5. No Refunds</H>
          <P><b>All fees are non-refundable.</b> Due to the nature of the Services — which involve immediate allocation of work, third-party submissions, and labor performed on your behalf — any amount you have already paid is not refundable, in whole or in part, including for partial billing periods, unused quota, or after cancellation. This clause applies to the fullest extent permitted by law.</P>
          <H>6. Client Responsibilities</H>
          <P>You agree to provide accurate business information and to hold the necessary rights to the data you submit. You are responsible for maintaining the confidentiality of your account credentials. Results such as search rankings and visibility depend on third-party platforms and are not guaranteed.</P>
          <H>7. Third-Party Platforms</H>
          <P>The Services interact with third-party directories and platforms (e.g., Google, Apple, Bing). {co} is not responsible for changes, outages, policy decisions, or removals made by those platforms.</P>
          <H>8. Limitation of Liability</H>
          <P>To the maximum extent permitted by law, {co}'s total liability for any claim arising from the Services is limited to the amount you paid in the one (1) month preceding the claim. {co} is not liable for indirect, incidental, or consequential damages.</P>
          <H>9. Suspension and Termination</H>
          <P>{co} may suspend or terminate accounts that violate these terms, misuse the Services, or fail payment. Fees already paid remain non-refundable per Section 5.</P>
          <H>10. Changes to Terms</H>
          <P>{co} may update these terms. Material changes will be communicated by email or in-platform notice. Continued use after changes constitutes acceptance.</P>
          <H>11. Contact</H>
          <P>Questions about these terms: info@rankorbit.com.</P>
        </div>):(<div>
          <H>1. Overview</H>
          <P>This Privacy Policy explains how {co} collects, uses, and protects information when you use our Services. We are committed to handling your data responsibly and transparently.</P>
          <H>2. Information We Collect</H>
          <P>Account information (name, business name, email, phone), business listing data you provide (address, categories, website), billing information processed securely by our payment processor, and usage data such as activity logs and platform interactions. We do not store full card numbers on our servers; payment details are handled by Stripe.</P>
          <H>3. How We Use Information</H>
          <P>To deliver the Services (submit and manage listings, monitor consistency), to communicate about your account and subscription, to process payments, to provide support, and to improve the platform.</P>
          <H>4. Data Sharing</H>
          <P>We share your business information with third-party directories and platforms strictly as needed to deliver the Services. We use trusted processors (e.g., Stripe for payments, our hosting and database providers). We do not sell your personal data.</P>
          <H>5. Data Security</H>
          <P>We use industry-standard measures including encryption in transit (HTTPS), access controls and row-level security on our database, hashed credentials, and restricted staff access. No system is perfectly secure, but we work continuously to protect your data.</P>
          <H>6. Data Retention</H>
          <P>We retain account data for as long as your account is active. Deleted items are held in a recoverable state for 30 days, then permanently purged. You may request export or deletion of your data at any time.</P>
          <H>7. Your Rights</H>
          <P>You can access, export, or request deletion of your personal data. Use the "Download my data" option in Billing, or contact us. Depending on your jurisdiction, you may have additional rights under laws such as GDPR.</P>
          <H>8. Cookies and Sessions</H>
          <P>We use essential cookies and local session storage to keep you signed in and operate the platform. We do not use them to sell your data.</P>
          <H>9. Changes</H>
          <P>We may update this policy and will notify you of material changes by email or in-platform notice.</P>
          <H>10. Contact</H>
          <P>Privacy questions or data requests: info@rankorbit.com.</P>
        </div>)}
      </Card>
    </div>);
  };

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={planBadge}>
    {page==="home"&&<Home/>}
    {page==="listings"&&<Listings/>}
    {page==="gmb"&&<Gmb/>}
    {page==="analytics"&&<Analytics/>}
    {page==="billing"&&<Billing/>}
    {page==="call"&&<CallPage/>}
    {page==="legal"&&<LegalPage/>}
  </Shell><Toasts/></>);
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({user,data,reload,onLogout}){
  const[page,setPage]=useState("overview");
  const[selClient,setSelClient]=useState(null);
  const[modal,setModal]=useState(null);
  const[confirm,setConfirm]=useState(null);
  const[toast,Toasts]=useToast();
  const w=useWindowSize();const isMobile=w<820;
  const{users,listings,gmb,analytics,activity,settings}=data;
  const clients=users.filter(u=>u.role==="client");
  const staff=users.filter(u=>u.role!=="client");
  const isAdmin=user.role==="super_admin";
  const isStaffMgr=user.role==="super_admin"||user.role==="manager";
  const revenue=clients.reduce((s,c)=>s+(PLANS[c.plan]?.price||0),0);
  const flat=Object.values(listings).flat();
  const totalLive=flat.filter(l=>l.status==="live").length;
  const totalPending=flat.filter(l=>l.status==="pending").length;
  const totalFlagged=flat.filter(l=>l.status==="flagged"||l.status==="rejected").length;
  const actionNeeded=flat.filter(l=>l.actionNeeded).length;

  const addActivity=async(clientId,type,desc)=>{await api.addActivity({id:uid(),clientId,type,desc,date:todayFull(),by:user.name});};
  // Audit trail: records the acting staff member for any sensitive action.
  const audit=async(action,{targetType,targetId,targetName,detail}={})=>{
    await api.logAudit({actor:user,action,targetType,targetId,targetName,detail});
  };
  // When an AGENT edits/deletes a listing, flag it for managers (queued for email in Batch 4).
  const notifyManagersIfAgent=async(action,listing)=>{
    if(user.role!=="agent")return;
    const clientName=clients.find(c=>c.id===listing.clientId)?.businessName||"a client";
    await api.addActivity({id:uid(),clientId:listing.clientId,type:"edit_blocked",desc:`⚠️ Manager review: agent ${user.name} ${action} "${listing.directory}" for ${clientName}`,date:todayFull(),by:"System"});
    // Batch 4 will also send this to managers via /api/notify.
    if(typeof window!=="undefined")window.__pendingManagerAlerts=(window.__pendingManagerAlerts||0)+1;
  };
  const R=async(fn,msg)=>{await fn();if(msg)toast(msg);await reload();};

  const nav=[
    {id:"overview",icon:"📊",label:"Overview",roles:["super_admin","manager","agent"]},
    {id:"clients",icon:"👥",label:"Clients",roles:["super_admin","manager","agent"],match:["clientDetail"]},
    {id:"listings",icon:"📋",label:"All Listings",roles:["super_admin","manager","agent"]},
    {id:"gmb",icon:"📍",label:"GMB",roles:["super_admin","manager"]},
    {id:"team",icon:"🔑",label:"Team",roles:["super_admin"]},
    {id:"activity",icon:"📜",label:"Activity Log",roles:["super_admin","manager"]},
    {id:"audit",icon:"🛡️",label:"Audit Trail",roles:["super_admin"]},
    {id:"trash",icon:"🗑️",label:"Trash",roles:["super_admin"]},
    {id:"settings",icon:"⚙️",label:"Settings",roles:["super_admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const roleBadge=(<div style={{marginTop:14,padding:"9px 13px",background:T.surface2,borderRadius:12}}>
    <div style={{fontSize:10,color:T.faint,fontWeight:800,letterSpacing:".5px"}}>SIGNED IN AS</div>
    <div style={{fontSize:13,fontWeight:800,color:T.brand,marginTop:2}}>{user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent"}</div>
  </div>);

  // ── MODALS ──
  const AddListingModal=({clientId,onClose})=>{
    const[f,setF]=useState({directory:"",da:"",notes:"",actionNeeded:false,actionNote:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title="Add New Listing">
      <Input label="Directory Name" value={f.directory} onChange={v=>set("directory",v)} placeholder="e.g. Apple Business Connect"/>
      <Input label="Domain Authority" value={f.da} onChange={v=>set("da",v)} placeholder="e.g. 96" type="number"/>
      <Input label="Internal Notes" value={f.notes} onChange={v=>set("notes",v)} placeholder="Notes for your team"/>
      <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:T.amberSoft,borderRadius:11,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.actionNeeded} onChange={e=>set("actionNeeded",e.target.checked)} style={{width:16,height:16,accentColor:T.amber}}/>
        <span style={{fontSize:12.5,fontWeight:700,color:T.amber}}>Client action required (e.g. Apple postcard verification)</span>
      </label>
      {f.actionNeeded&&<Input label="What the client must do" value={f.actionNote} onChange={v=>set("actionNote",v)} placeholder="e.g. Enter the code from the Apple postcard"/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>R(async()=>{
          await api.upsertListing({id:uid(),clientId,directory:f.directory,status:"submitted",submitted:today(),liveDate:"—",napMatch:"—",liveLink:"",da:parseInt(f.da)||0,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
          await addActivity(clientId,"submitted",`${f.directory} submitted`);
        },`${f.directory} added`).then(onClose)}>Add Listing</Btn>
      </div>
    </Modal>);
  };
  const UpdateListingModal=({listing,clientId,onClose})=>{
    const[f,setF]=useState({status:listing.status,liveLink:listing.liveLink||"",liveDate:listing.liveDate||"",napMatch:listing.napMatch||"—",notes:listing.notes||"",actionNeeded:!!listing.actionNeeded,actionNote:listing.actionNote||""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`Update · ${listing.directory}`}>
      <Select label="Status" value={f.status} onChange={v=>set("status",v)} options={["submitted","pending","live","rejected","flagged"].map(s=>({value:s,label:s[0].toUpperCase()+s.slice(1)}))}/>
      <Input label="Live Listing URL" value={f.liveLink} onChange={v=>set("liveLink",v)} placeholder="https://directory.com/business"/>
      <Input label="Live Date" value={f.liveDate} onChange={v=>set("liveDate",v)} placeholder="e.g. Jul 5"/>
      <Select label="NAP Match" value={f.napMatch} onChange={v=>set("napMatch",v)} options={[{value:"—",label:"— Pending"},{value:"match",label:"✓ Match"},{value:"mismatch",label:"Mismatch"},{value:"fixed",label:"Fixed"}]}/>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>NOTES (CLIENT CAN READ)</label>
        <textarea value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Progress notes, context, anything the client should know…" style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B,resize:"vertical",minHeight:70}}/>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:T.amberSoft,borderRadius:11,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.actionNeeded} onChange={e=>set("actionNeeded",e.target.checked)} style={{width:16,height:16,accentColor:T.amber}}/>
        <span style={{fontSize:12.5,fontWeight:700,color:T.amber}}>Client action required (verification, etc.)</span>
      </label>
      {f.actionNeeded&&<Input label="What the client must do" value={f.actionNote} onChange={v=>set("actionNote",v)} placeholder="e.g. Enter the Apple postcard code"/>}
      <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
        <Btn variant="danger" onClick={()=>setConfirm({title:"Delete listing?",msg:`Move ${listing.directory} to Trash? It can be restored for 30 days, then permanently removed.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteListing(listing.id);await addActivity(clientId,"rejected",`${listing.directory} listing removed`);await audit("listing.delete",{targetType:"listing",targetId:listing.id,targetName:listing.directory});await notifyManagersIfAgent("deleted",listing);},"Listing moved to Trash").then(onClose)})}>Delete</Btn>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>R(async()=>{
            await api.upsertListing({...listing,status:f.status,liveLink:f.liveLink,liveDate:f.status==="live"?(f.liveDate&&f.liveDate!=="—"?f.liveDate:today()):listing.liveDate,napMatch:f.napMatch,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
            await audit("listing.edit",{targetType:"listing",targetId:listing.id,targetName:listing.directory,detail:`status→${f.status}`});
            await notifyManagersIfAgent("edited",listing);
            if(f.status==="live"&&listing.status!=="live")await addActivity(clientId,"listing_live",`${listing.directory} listing went live`);
            if(f.status==="rejected"&&listing.status!=="rejected")await addActivity(clientId,"rejected",`${listing.directory} rejected. ${f.notes}`);
            if(f.status==="flagged"&&listing.status!=="flagged")await addActivity(clientId,"flagged",`${listing.directory} flagged. ${f.notes}`);
          },"Listing updated").then(onClose)}>Save Changes</Btn>
        </div>
      </div>
    </Modal>);
  };
  const ClientFormModal=({client,onClose})=>{
    const[f,setF]=useState(client||{role:"client",plan:"",status:"active",category:"Home Services"});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const editing=!!client;
    return(<Modal open onClose={onClose} title={editing?"Edit Client":"Add New Client"} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Mike Johnson"/>
        <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing"/>
        <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="mike@business.com" type="email"/>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000"/>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Input label="State" value={f.state} onChange={v=>set("state",v)} placeholder="TX"/>
      </div>
      <Input label="Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Select label="Plan" value={f.plan} onChange={v=>set("plan",v)} options={[{value:"",label:"No plan yet"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:`${p.name} $${p.price}/mo`}))]}/>
        <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
      </div>
      {editing&&<Select label="Status" value={f.status} onChange={v=>set("status",v)} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]}/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{
          if(!f.email||!f.name){toast("Name and email required","warn");return;}
          R(async()=>{
            if(editing)await api.upsertProfile(f);
            else{await api.upsertProfile({...f,id:uid(),avatar:(f.name||"?")[0].toUpperCase(),napScore:0,createdAt:new Date().toISOString()});await addActivity("","client",`New client added: ${f.businessName||f.name}`);}
          },editing?"Client updated":`${f.businessName||f.name} added`).then(onClose);
        }}>{editing?"Save Changes":"Add Client"}</Btn>
      </div>
      {!editing&&api.mode==="supabase"&&<div style={{marginTop:12,fontSize:11,color:T.faint,lineHeight:1.5}}>Note: this creates a profile record. For the client to log in, they sign up themselves (email/Google) with this email, or you send them a reset link.</div>}
    </Modal>);
  };
  const TeamModal=({onClose})=>{
    const[f,setF]=useState({role:"agent"});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title="Add Team Member">
      <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Team member name"/>
      <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="team@rankorbit.com" type="email"/>
      <Select label="Role" value={f.role} onChange={v=>set("role",v)} options={[{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{if(!f.email||!f.name){toast("Name and email required","warn");return;}
          R(async()=>api.upsertProfile({...f,id:uid(),avatar:(f.name||"?")[0].toUpperCase(),status:"active",createdAt:new Date().toISOString()}),`${f.name} added to team`).then(onClose);}}>Add Member</Btn>
      </div>
      {api.mode==="supabase"&&<div style={{marginTop:10,fontSize:11,color:T.faint,lineHeight:1.5}}>They sign up with this email to get login access, then this role applies.</div>}
    </Modal>);
  };
  const GmbModal=({client,onClose})=>{
    const ex=gmb[client.id]||{views:0,calls:0,directions:0,source:"manual",trend:[],posts:[],qa:[],photos:0,completeness:{category:false,description:false,hours:false,photo:false,services:false,attributes:false}};
    const[f,setF]=useState({views:ex.views,calls:ex.calls,directions:ex.directions,postTitle:"",qaQ:"",qaA:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`GMB Update · ${client.businessName}`} width={560}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>ENGAGEMENT METRICS (MANUAL)</div>
        <Badge type="manual"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <Input label="Views" value={f.views} onChange={v=>set("views",v)} type="number"/>
        <Input label="Calls" value={f.calls} onChange={v=>set("calls",v)} type="number"/>
        <Input label="Directions" value={f.directions} onChange={v=>set("directions",v)} type="number"/>
      </div>
      <Input label="Add GMB Post (optional)" value={f.postTitle} onChange={v=>set("postTitle",v)} placeholder="e.g. Summer Special — 10% Off"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Q&A Question (optional)" value={f.qaQ} onChange={v=>set("qaQ",v)} placeholder="Customer question"/>
        <Input label="Answer" value={f.qaA} onChange={v=>set("qaA",v)} placeholder="Your reply"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>R(async()=>{
          const trend=[...ex.trend,{m:new Date().toLocaleString("en-US",{month:"short"}),v:+f.views||0,c:+f.calls||0,d:+f.directions||0}];
          const posts=f.postTitle?[...ex.posts,{title:f.postTitle,date:today(),status:"live"}]:ex.posts;
          const qa=f.qaQ&&f.qaA?[...ex.qa,{q:f.qaQ,a:f.qaA,date:today()}]:ex.qa;
          await api.upsertGmb(client.id,{...ex,views:+f.views||0,calls:+f.calls||0,directions:+f.directions||0,source:"manual",trend,posts,qa});
          await addActivity(client.id,"gmb_update",`GMB data updated for ${client.businessName}`);
        },"GMB data saved").then(onClose)}>Save GMB Update</Btn>
      </div>
    </Modal>);
  };
  const AnalyticsModal=({client,onClose})=>{
    const ex=analytics[client.id]||{sessions:0,users:0,pageviews:0,avgTime:"0:00",source:"manual",trend:[]};
    const[f,setF]=useState({sessions:ex.sessions,users:ex.users,pageviews:ex.pageviews,avgTime:ex.avgTime});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`Analytics · ${client.businessName}`} width={520}>
      <div style={{display:"flex",justifycontent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>MANUAL ANALYTICS ENTRY</div><Badge type="manual"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Sessions" value={f.sessions} onChange={v=>set("sessions",v)} type="number"/>
        <Input label="Users" value={f.users} onChange={v=>set("users",v)} type="number"/>
        <Input label="Page Views" value={f.pageviews} onChange={v=>set("pageviews",v)} type="number"/>
        <Input label="Avg. Time (m:ss)" value={f.avgTime} onChange={v=>set("avgTime",v)} placeholder="2:34"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>R(async()=>{
          const trend=[...(ex.trend||[]),{m:new Date().toLocaleString("en-US",{month:"short"}),s:+f.sessions||0,u:+f.users||0}];
          await api.upsertAnalytics(client.id,{sessions:+f.sessions||0,users:+f.users||0,pageviews:+f.pageviews||0,avgTime:f.avgTime||"0:00",source:"manual",trend});
          await addActivity(client.id,"analytics",`Analytics updated for ${client.businessName}`);
        },"Analytics saved").then(onClose)}>Save Analytics</Btn>
      </div>
    </Modal>);
  };
  const IntegrationsModal=({client,onClose})=>{
    const[gaId,setGaId]=useState(client.gaId||"");
    const[gbpId,setGbpId]=useState(client.gbpId||"");
    return(<Modal open onClose={onClose} title={`Integrations · ${client.businessName}`} width={520}>
      <div style={{padding:"12px 14px",background:T.blueSoft,borderRadius:11,marginBottom:16,fontSize:12,color:T.blue,lineHeight:1.5}}>
        Store the client's IDs here. Live auto-pull (OAuth) is coming next; for now, use the manual GMB/Analytics entry to feed their dashboards.
      </div>
      <Input label="Google Analytics 4 Measurement ID" value={gaId} onChange={setGaId} placeholder="G-XXXXXXXXXX"/>
      <Input label="Google Business Profile ID / Name" value={gbpId} onChange={setGbpId} placeholder="accounts/123/locations/456"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>R(async()=>api.upsertProfile({...client,gaId,gbpId}),"Integration IDs saved").then(onClose)}>Save</Btn>
      </div>
    </Modal>);
  };

  // ── ADMIN PAGES ──
  const Overview=()=>{
    const revData=[{m:"Mar",r:138},{m:"Apr",r:187},{m:"May",r:236},{m:"Jun",r:revenue},{m:"Jul",r:revenue}];
    const listData=[{m:"Mar",n:12,l:12},{m:"Apr",n:10,l:18},{m:"May",n:8,l:26},{m:"Jun",n:10,l:totalLive}];
    return(<div>
      <PageHead isMobile={isMobile} title="Platform Overview" sub={`Welcome back, ${user.name.split(" ")[0]}`}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":`repeat(${isAdmin?4:3},1fr)`,gap:14,marginBottom:20}}>
        {isAdmin&&<StatCard label="Monthly Revenue" value={`$${revenue}`} sub={`${clients.length} active subscriptions`} icon="💰" color={T.green} soft={T.greenSoft} trend={8} delay={0}/>}
        <StatCard label="Clients" value={clients.length} sub="Across all plans" icon="👥" delay={70}/>
        <StatCard label="Listings Live" value={totalLive} sub={`${totalPending} pending`} icon="🌐" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Needs Attention" value={totalFlagged} sub={`${actionNeeded} awaiting client action`} icon="🚩" color={T.red} soft={T.redSoft} delay={210}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
        {isAdmin?(<Card><SectionTitle sub="Monthly recurring revenue (Super Admin only)">Revenue Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revData}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.25}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={38}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="r" name="MRR $" stroke={T.green} strokeWidth={2.5} fill="url(#rev)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} animationDuration={1100}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>):(<Card><SectionTitle sub="New live vs cumulative total">Listings Activity</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={listData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="n" name="New" fill={T.brand} radius={[6,6,0,0]} animationDuration={900}/>
              <Bar dataKey="l" name="Total live" fill={T.green} radius={[6,6,0,0]} animationDuration={1200}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>)}
        <Card><SectionTitle>Plan Distribution</SectionTitle>
          <div style={{display:"flex",justifyContent:"center"}}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={Object.entries(PLANS).map(([id,p])=>({n:p.name,v:clients.filter(c=>c.plan===id).length}))} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="v" strokeWidth={0} animationDuration={1000}>
                {[T.blue,T.brand,T.violet].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie><Tooltip content={<ChartTip/>}/></PieChart>
            </ResponsiveContainer>
          </div>
          {Object.entries(PLANS).map(([id,p],i)=>(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:[T.blue,T.brand,T.violet][i]}}/><span style={{fontSize:12.5,color:T.sub}}>{p.name} ${p.price}</span></div>
            <span style={{fontSize:13,fontWeight:800}}>{clients.filter(c=>c.plan===id).length}</span>
          </div>))}
        </Card>
      </div>
      <Card><SectionTitle>Client Health</SectionTitle>
        {clients.length===0?<Empty icon="👥" title="No clients yet" sub="Add your first client to get started."/>:
        clients.map((c,i)=>{const cl=listings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const an=cl.filter(l=>l.actionNeeded).length;
          return(<div key={c.id} className="hoverRow" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 10px",borderRadius:12,cursor:"pointer",borderBottom:i<clients.length-1?`1px solid ${T.line}`:"none",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${PLANS[c.plan]?.color||T.faint},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
              <div><div style={{fontSize:13.5,fontWeight:800}}>{c.businessName||c.name}</div><div style={{fontSize:11,color:T.faint}}>{c.plan?`${PLANS[c.plan].name} · $${PLANS[c.plan].price}/mo`:"No plan"}</div></div>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              {an>0&&<Badge type="pending" label={`${an} action`}/>}
              {c.status==="suspended"&&<Badge type="suspended"/>}
              <span style={{fontSize:12,color:T.sub,fontWeight:700}}>{lv} live</span>
              <span style={{fontSize:12,fontWeight:800,color:c.napScore>=90?T.green:c.napScore>=70?T.amber:T.red}}>NAP {c.napScore||0}%</span>
              <span style={{color:T.brand,fontSize:12.5,fontWeight:800}}>→</span>
            </div>
          </div>);})}
      </Card>
    </div>);
  };

  const Clients=()=>{
    const[search,setSearch]=useState("");
    const[planF,setPlanF]=useState("all");
    const[statusF,setStatusF]=useState("all");
    const filtered=clients.filter(c=>{
      if(search&&!`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase()))return false;
      if(planF!=="all"&&c.plan!==planF)return false;
      if(statusF!=="all"&&(c.status||"active")!==statusF)return false;
      return true;
    });
    const exportCols=[
      {key:"businessName",label:"Business"},{key:"name",label:"Contact"},{key:"email",label:"Email"},
      {key:"phone",label:"Phone"},{key:"city",label:"City"},{key:"state",label:"State"},
      {key:"plan",label:"Plan",get:c=>c.plan?PLANS[c.plan]?.name:"None"},
      {key:"status",label:"Status",get:c=>c.status||"active"},
      {key:"napScore",label:"NAP %"},
      {label:"Live Listings",get:c=>(listings[c.id]||[]).filter(l=>l.status==="live").length},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Clients" sub={`${clients.length} clients`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"clientForm"})}>+ Add Client</Btn>}/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search by business, name, email, city…"
        filters={[
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]},
        ]}
        rows={filtered} cols={exportCols} exportName="rankorbit-clients" exportTitle="Clients"/>
      {filtered.length===0?<Card><Empty icon="🔍" title="No clients found" sub="Try a different search or filter, or add a client."/></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((c,idx)=>{
          const cl=listings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const pd=cl.filter(l=>l.status==="pending").length;const fl=cl.filter(l=>l.status==="flagged"||l.status==="rejected").length;const an=cl.filter(l=>l.actionNeeded).length;
          return(<Card key={c.id} hover className="fadeUp" style={{animationDelay:`${idx*50}ms`,cursor:"pointer"}}>
            <div onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${PLANS[c.plan]?.color||T.faint},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",flexShrink:0}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,display:"flex",alignItems:"center",gap:8}}>{c.businessName||c.name}{c.status==="suspended"&&<Badge type="suspended"/>}</div>
                  <div style={{fontSize:12,color:T.sub}}>{c.name} · {c.city||"—"}{c.state?", "+c.state:""} · {c.category||"—"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:isMobile?12:18,alignItems:"center",flexWrap:"wrap"}}>
                {an>0&&<Badge type="pending" label={`${an} action`}/>}
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.green,fontFamily:FONT_D}}>{lv}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>LIVE</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.amber,fontFamily:FONT_D}}>{pd}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>PENDING</div></div>
                {fl>0&&<div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.red,fontFamily:FONT_D}}>{fl}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>FLAGS</div></div>}
                <Badge type="submitted" label={c.plan?`$${PLANS[c.plan].price}/mo`:"No plan"}/>
                <span style={{color:T.brand,fontWeight:800}}>→</span>
              </div>
            </div>
          </Card>);})}
      </div>}
    </div>);
  };

  const ClientDetail=()=>{
    const c=clients.find(x=>x.id===selClient);if(!c)return null;
    const cl=listings[c.id]||[];
    const[nap,setNap]=useState(c.napScore||0);
    const canEdit=isStaffMgr;
    return(<div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,padding:"7px 14px",color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>← Clients</button>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?17:21,fontWeight:800}}>{c.businessName||c.name}</div>
        <Badge type={c.status==="suspended"?"suspended":"active"}/>{c.plan&&<Badge type="submitted" label={`${PLANS[c.plan].name} $${PLANS[c.plan].price}/mo`}/>}
      </div>
      {canEdit&&<div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"clientForm",client:c})}>✏️ Edit Info</Btn>
        <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>🔗 Integrations</Btn>
        <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"analytics",client:c})}>📈 Update Analytics</Btn>
        {c.plan==="gmb"&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>📍 Update GMB</Btn>}
        {c.status==="active"?
          <Btn variant="ghost" size="sm" onClick={()=>setConfirm({title:"Suspend client?",msg:`${c.businessName||c.name} won't be able to log in until reactivated.`,yes:"Suspend",onYes:()=>R(async()=>{await api.upsertProfile({...c,status:"suspended"});await audit("client.suspend",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client suspended")})}>⏸ Suspend</Btn>:
          <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.upsertProfile({...c,status:"active"});await audit("client.reactivate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client reactivated")}>▶ Reactivate</Btn>}
        {isAdmin&&!c.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Delete client?",msg:`Move ${c.businessName||c.name} to Trash? Recoverable for 30 days, then permanently removed with all their listings.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteUser(c.id);await audit("client.delete",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client moved to Trash").then(()=>{setPage("clients");setSelClient(null);})})}>🗑 Delete</Btn>}
        {c.protected&&<span style={{fontSize:11,color:T.faint,alignSelf:"center"}}>🔒 Demo account (protected)</span>}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:18}}>
        <Card><SectionTitle>Business Info</SectionTitle>
          {[["Owner",c.name],["Email",c.email],["Phone",c.phone],["Address",`${c.address||"—"}${c.city?", "+c.city:""}${c.state?", "+c.state:""}`],["Website",c.website||"—"],["Category",c.category||"—"],["GA4 ID",c.gaId||"Not connected"],["GBP ID",c.gbpId||"Not connected"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{fontSize:12.5,color:T.faint,fontWeight:700}}>{k}</span><span style={{fontSize:12.5,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{v}</span>
            </div>))}
        </Card>
        <Card><SectionTitle>NAP Consistency</SectionTitle>
          <div style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,textAlign:"center",padding:"8px 0",color:nap>=90?T.green:nap>=70?T.amber:T.red}}>{nap}%</div>
          {canEdit?<><input type="range" min="0" max="100" value={nap} onChange={e=>setNap(+e.target.value)} style={{width:"100%",accentColor:T.brand}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>R(async()=>api.upsertProfile({...c,napScore:nap}),`NAP score saved: ${nap}%`)}>Save NAP Score</Btn>
          <button onClick={()=>R(async()=>addActivity(c.id,"edit_blocked","Unauthorized edit blocked and reverted"),"Unauthorized edit logged & reverted")} style={{width:"100%",marginTop:10,padding:"11px 0",background:T.redSoft,border:"none",borderRadius:11,color:T.red,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:FONT_B}}>🛡️ Log Unauthorized Edit + Revert</button></>:
          <div style={{fontSize:12,color:T.faint,textAlign:"center"}}>View only</div>}
        </Card>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Listings ({cl.length})</div>
          {canEdit&&<Btn size="sm" onClick={()=>setModal({type:"addListing",clientId:c.id})}>+ Add Listing</Btn>}
        </div>
        {cl.length===0?<Empty icon="📋" title="No listings yet" sub="Add the first directory submission."/>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cl.map(d=>(<div key={d.id} style={{border:`1px solid ${d.actionNeeded?T.amber:T.line}`,borderRadius:13,padding:"14px 16px",background:d.actionNeeded?T.amberSoft:T.surface}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13.5,fontWeight:800}}>{d.directory}</span>
                <Badge type={d.status}/>
                {d.napMatch&&d.napMatch!=="—"&&<Badge type={d.napMatch}/>}
                {d.da>0&&<span style={{fontSize:11,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.faint}}>DA {d.da}</span>}
                {d.liveLink&&<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12,fontWeight:700,textDecoration:"none"}}>View ↗</a>}
              </div>
              {canEdit&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"updateListing",listing:d,clientId:c.id})}>Update</Btn>}
            </div>
            {d.actionNeeded&&<div style={{marginTop:10,padding:"9px 12px",background:"#fff",borderRadius:9,fontSize:12,color:T.amber,fontWeight:700,display:"flex",alignItems:"center",gap:7}}>⚠️ Client action: {d.actionNote||"Verification required from the client"}</div>}
            {d.notes&&<div style={{marginTop:8,fontSize:12,color:T.sub,lineHeight:1.5}}><b style={{color:T.faint}}>Notes:</b> {d.notes}</div>}
          </div>))}
        </div>}
      </Card>
      <Card><SectionTitle>Activity Log</SectionTitle>
        {activity.filter(a=>a.clientId===c.id).length===0?<Empty icon="📜" title="No activity yet" sub="Actions for this client appear here."/>:
          activity.filter(a=>a.clientId===c.id).map((a,i,arr)=>(<div key={a.id} style={{display:"flex",gap:12,padding:"10px 6px",borderBottom:i<arr.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
            <div><div style={{fontSize:12.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
          </div>))}
      </Card>
    </div>);
  };

  const AllListings=()=>{
    const[filter,setFilter]=useState("all");
    const[search,setSearch]=useState("");
    const withNames=flat.map(l=>({...l,_name:clients.find(c=>c.id===l.clientId)?.businessName||"?"}));
    let filtered=filter==="all"?withNames:filter==="action"?withNames.filter(l=>l.actionNeeded):withNames.filter(l=>l.status===filter);
    if(search)filtered=filtered.filter(l=>`${l._name} ${l.directory} ${l.status}`.toLowerCase().includes(search.toLowerCase()));
    const cnt=(s)=>s==="all"?withNames.length:s==="action"?withNames.filter(l=>l.actionNeeded).length:withNames.filter(l=>l.status===s).length;
    const exportCols=[
      {key:"_name",label:"Client"},{key:"directory",label:"Directory"},{key:"status",label:"Status"},
      {key:"da",label:"DA"},{key:"liveDate",label:"Live Date"},{key:"napMatch",label:"NAP"},
      {label:"Action Needed",get:l=>l.actionNeeded?"Yes":"No"},{key:"actionNote",label:"Action Note"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="All Listings" sub={`${withNames.length} total across ${clients.length} clients`}/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search client, directory, status…"
        rows={filtered} cols={exportCols} exportName="rankorbit-listings" exportTitle="All Listings"/>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","live","pending","submitted","flagged","rejected","action"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"7px 15px",borderRadius:20,border:`1.5px solid ${filter===s?T.brand:T.line}`,background:filter===s?T.brandSoft:T.surface,color:filter===s?T.brand:T.sub,fontSize:12.5,fontWeight:filter===s?800:600,cursor:"pointer",fontFamily:FONT_B}}>{s==="action"?"⚠️ Client action":s[0].toUpperCase()+s.slice(1)} ({cnt(s)})</button>))}
      </div>
      <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
        {filtered.length===0?<Empty icon="📋" title="Nothing here" sub={`No ${filter} listings right now.`}/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
          <thead><tr>{["Client","Directory","Status","DA","Live","NAP","Flag","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((d)=>(<tr key={d.id} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d._name}</td>
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.da||"—"}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="—"?T.faint:T.green,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:T.faint}}>—</span>:<Badge type={d.napMatch}/>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.actionNeeded?<span title={d.actionNote} style={{fontSize:14}}>⚠️</span>:<span style={{fontSize:11,color:T.faint}}>—</span>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Btn variant="soft" size="sm" onClick={()=>{setSelClient(d.clientId);setPage("clientDetail");}}>Open</Btn></td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const GmbAdmin=()=>{
    const gmbClients=clients.filter(c=>c.plan==="gmb");
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={`${gmbClients.length} GMB Pro clients`}/>
      {gmbClients.length===0?<Card><Empty icon="📍" title="No GMB Pro clients yet" sub="Clients on the $249 plan appear here."/></Card>:
        gmbClients.map(c=>{const d=gmb[c.id];
          return(<Card key={c.id} hover style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:13,alignItems:"center"}}>
                <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.violet},${T.brand})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>{c.businessName}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{d?`${d.views?.toLocaleString()||0} views · ${d.calls||0} calls · ${d.directions||0} directions · ${d.posts?.length||0} posts`:"No GMB data yet"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" size="sm" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>View</Btn>
                <Btn variant="green" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>Update GMB</Btn>
              </div>
            </div>
          </Card>);})}
    </div>);
  };

  const Team=()=>(<div>
    <PageHead isMobile={isMobile} title="Team" sub={`${staff.length} team members`} right={<Btn onClick={()=>setModal({type:"team"})}>+ Add Member</Btn>}/>
    {staff.map((m,i)=>(<Card key={m.id} hover className="fadeUp" style={{animationDelay:`${i*60}ms`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:13,alignItems:"center"}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:m.role==="super_admin"?`linear-gradient(135deg,${T.brand},${T.violet})`:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
          <div><div style={{fontSize:14,fontWeight:800}}>{m.name}</div><div style={{fontSize:12,color:T.sub}}>{m.email}</div></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
          {m.id!==user.id&&m.role!=="super_admin"&&!m.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Remove team member?",msg:`Remove ${m.name} from the team?`,danger:true,yes:"Remove",onYes:()=>R(async()=>api.deleteUser(m.id),`${m.name} removed`)})}>Remove</Btn>}
          {m.protected&&<span style={{fontSize:11,color:T.faint}}>🔒 Demo</span>}
        </div>
      </div>
    </Card>))}
    <Card style={{background:T.surface2,boxShadow:"none",border:`1px dashed ${T.line}`}}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ROLE PERMISSIONS</div>
      {[["Super Admin",T.brand,"Full access — clients, listings, GMB, team, revenue, settings"],["Manager",T.amber,"Clients, listings, GMB. No team, revenue, or settings."],["Agent",T.blue,"View clients and update listing statuses/notes only."]].map(([r,c,p])=>(
        <div key={r} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:3,background:c,marginTop:5,flexShrink:0}}/><div style={{fontSize:12.5}}><b style={{color:c}}>{r}:</b> <span style={{color:T.sub}}>{p}</span></div></div>))}
    </Card>
  </div>);

  const Activity=()=>(<div>
    <PageHead isMobile={isMobile} title="Activity Log" sub="Every platform event, newest first"/>
    <Card>
      {activity.length===0?<Empty icon="📜" title="No activity yet" sub="Platform events appear here."/>:
        activity.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<activity.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.desc}</div>
              <div style={{fontSize:11,color:T.faint}}>{a.date}</div>
            </div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{clients.find(c=>c.id===a.clientId)?.businessName||"—"} · by {a.by}</div>
          </div>
        </div>))}
    </Card>
  </div>);

  const AuditTrail=()=>{
    const[search,setSearch]=useState("");
    const[actionF,setActionF]=useState("all");
    const auditRows=(data.audit||[]);
    const actions=[...new Set(auditRows.map(a=>a.action))];
    let filtered=auditRows;
    if(actionF!=="all")filtered=filtered.filter(a=>a.action===actionF);
    if(search)filtered=filtered.filter(a=>`${a.actorName} ${a.action} ${a.targetName} ${a.detail}`.toLowerCase().includes(search.toLowerCase()));
    const cols=[
      {key:"createdAt",label:"When",get:a=>new Date(a.createdAt).toLocaleString()},
      {key:"actorName",label:"Staff"},{key:"actorRole",label:"Role"},
      {key:"action",label:"Action"},{key:"targetName",label:"Target"},{key:"detail",label:"Detail"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Audit Trail" sub="Every sensitive staff action — who did what, and when"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search staff, action, target…"
        filters={[{value:actionF,set:setActionF,options:[{value:"all",label:"All actions"},...actions.map(a=>({value:a,label:a}))]}]}
        rows={filtered} cols={cols} exportName="rankorbit-audit" exportTitle="Audit Trail"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="🛡️" title="No audit records yet" sub="Staff actions like edits, deletes, and suspensions are logged here."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["When","Staff","Action","Target","Detail"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a=>(<tr key={a.id} className="hoverRow">
            <td style={{padding:"10px 12px",fontSize:11.5,color:T.faint,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</td>
            <td style={{padding:"10px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}><b>{a.actorName}</b><br/><span style={{fontSize:10.5,color:T.faint}}>{a.actorRole}</span></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={a.action.includes("delete")?"rejected":a.action.includes("suspend")?"pending":"submitted"} label={a.action}/></td>
            <td style={{padding:"10px 12px",fontSize:12.5,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{a.targetName||"—"}</td>
            <td style={{padding:"10px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{a.detail||"—"}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const Trash=()=>{
    const tUsers=data.trashedUsers||[];const tListings=data.trashedListings||[];
    const daysLeft=(d)=>{const gone=Math.floor((Date.now()-new Date(d).getTime())/86400000);return Math.max(0,30-gone);};
    return(<div>
      <PageHead isMobile={isMobile} title="Trash" sub="Deleted items are recoverable for 30 days, then permanently purged"/>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub={`${tUsers.length} deleted client(s)`}>Deleted Clients</SectionTitle>
        {tUsers.length===0?<Empty icon="✓" title="No deleted clients" sub="Deleted clients appear here for recovery."/>:
          tUsers.map(c=>(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 6px",borderBottom:`1px solid ${T.line}`,flexWrap:"wrap",gap:10}}>
            <div><b style={{fontSize:13.5}}>{c.businessName||c.name}</b> <span style={{fontSize:12,color:T.sub}}>· {c.email}</span><div style={{fontSize:11,color:daysLeft(c.deletedAt)<7?T.red:T.faint,marginTop:2}}>{daysLeft(c.deletedAt)} days until permanent deletion</div></div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.restoreUser(c.id);await audit("client.restore",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client restored")}>↺ Restore</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Permanently delete?",msg:`This will permanently remove ${c.businessName||c.name} and all their data. This cannot be undone.`,danger:true,yes:"Delete forever",onYes:()=>R(async()=>{await api.purgeUser(c.id);await audit("client.purge",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Permanently deleted")})}>Delete forever</Btn>
            </div>
          </div>))}
      </Card>
      <Card>
        <SectionTitle sub={`${tListings.length} deleted listing(s)`}>Deleted Listings</SectionTitle>
        {tListings.length===0?<Empty icon="✓" title="No deleted listings" sub="Deleted listings appear here for recovery."/>:
          tListings.map(l=>{const cn=[...clients,...tUsers].find(c=>c.id===l.clientId)?.businessName||"?";
          return(<div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 6px",borderBottom:`1px solid ${T.line}`,flexWrap:"wrap",gap:10}}>
            <div><b style={{fontSize:13.5}}>{l.directory}</b> <span style={{fontSize:12,color:T.sub}}>· {cn}</span><div style={{fontSize:11,color:daysLeft(l.deletedAt)<7?T.red:T.faint,marginTop:2}}>{daysLeft(l.deletedAt)} days until permanent deletion</div></div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.restoreListing(l.id);await audit("listing.restore",{targetType:"listing",targetId:l.id,targetName:l.directory});},"Listing restored")}>↺ Restore</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Permanently delete?",msg:`Permanently remove ${l.directory}? This cannot be undone.`,danger:true,yes:"Delete forever",onYes:()=>R(async()=>{await api.purgeListing(l.id);await audit("listing.purge",{targetType:"listing",targetId:l.id,targetName:l.directory});},"Permanently deleted")})}>Delete forever</Btn>
            </div>
          </div>);})}
      </Card>
    </div>);
  };

  const Settings=()=>{
    const s={essentials:"",growth:"",gmb:"",pubKey:"",secretKey:"",webhookSecret:"",...(settings?.stripe||{})};
    const[f,setF]=useState(s);
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const webhookUrl=(typeof window!=="undefined"?window.location.origin:"https://rankorbit-platform.vercel.app")+"/api/stripe-webhook";
    const stripeLive=!!(s.secretKey&&s.webhookSecret&&s.essentials);
    return(<div>
      <PageHead isMobile={isMobile} title="Settings" sub="Payment links and platform configuration"/>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Paste one recurring Payment Link per plan. Client Subscribe/Upgrade buttons open these with the client tagged, so the webhook can auto-activate their plan after payment.">Stripe Payment Links</SectionTitle>
        <div style={{padding:"14px 16px",background:T.blueSoft,borderRadius:12,marginBottom:18,fontSize:12.5,color:T.blue,lineHeight:1.7}}>
          <div style={{fontWeight:800,marginBottom:6}}>Setup — one time, ~10 min:</div>
          <div><b>1.</b> Stripe Dashboard → <b>Payment Links</b> → New link → pick your recurring product ($49 / $89 / $249). Create all 3, paste URLs below.</div>
          <div><b>2.</b> Stripe → <b>Developers → Webhooks → Add endpoint</b>. Endpoint URL:</div>
          <div style={{margin:"6px 0",padding:"8px 11px",background:"#fff",borderRadius:8,fontFamily:"monospace",fontSize:11.5,color:T.ink,wordBreak:"break-all",userSelect:"all"}}>{webhookUrl}</div>
          <div><b>3.</b> Select event <b>checkout.session.completed</b> → Add endpoint → copy the <b>Signing secret</b> (whsec_…) into the field below.</div>
          <div><b>4.</b> Copy your <b>Secret key</b> (sk_live_… from Developers → API keys) below. Save. Payments now auto-activate plans.</div>
        </div>
        <Input label="Essentials ($49/mo) payment link" value={f.essentials} onChange={v=>set("essentials",v)} placeholder="https://buy.stripe.com/..."/>
        <Input label="Growth ($89/mo) payment link" value={f.growth} onChange={v=>set("growth",v)} placeholder="https://buy.stripe.com/..."/>
        <Input label="GMB Pro ($249/mo) payment link" value={f.gmb} onChange={v=>set("gmb",v)} placeholder="https://buy.stripe.com/..."/>
        <div style={{height:1,background:T.line,margin:"6px 0 16px"}}/>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:12}}>AUTO-ACTIVATION KEYS (server-side)</div>
        <Input label="Stripe Secret Key" value={f.secretKey} onChange={v=>set("secretKey",v)} placeholder="sk_live_..."/>
        <Input label="Webhook Signing Secret" value={f.webhookSecret} onChange={v=>set("webhookSecret",v)} placeholder="whsec_..."/>
        <Input label="Stripe Publishable Key (optional)" value={f.pubKey} onChange={v=>set("pubKey",v)} placeholder="pk_live_..."/>
        <div style={{padding:"11px 14px",background:T.amberSoft,borderRadius:11,marginBottom:16,fontSize:11.5,color:T.amber,lineHeight:1.55}}>
          <b>Important:</b> also add these as Vercel environment variables so the webhook function can write to the database: <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> (from Supabase → Settings → API). Saving here stores them for reference; the function reads them from Vercel env.
        </div>
        <Btn onClick={()=>R(async()=>api.saveSettings({...settings,stripe:f}),"Stripe settings saved")}>Save Stripe Settings</Btn>
      </Card>
      <Card>
        <SectionTitle sub="Current data backend">System</SectionTitle>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:13,color:T.sub}}>Database mode</span>
          <Badge type={api.mode==="supabase"?"connected":"manual"} label={api.mode==="supabase"?"Supabase (live)":"Local (demo)"}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:13,color:T.sub}}>Stripe auto-activation</span>
          <Badge type={stripeLive?"connected":"manual"} label={stripeLive?"Configured":"Keys not set"}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
          <span style={{fontSize:13,color:T.sub}}>Live GA4 / GBP auto-sync</span>
          <Badge type="pending" label="Next phase (OAuth)"/>
        </div>
      </Card>
    </div>);
  };

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={roleBadge} brandTag="ADMIN" badgeCounts={{listings:totalFlagged+actionNeeded}}>
    {page==="overview"&&<Overview/>}
    {page==="clients"&&<Clients/>}
    {page==="clientDetail"&&<ClientDetail/>}
    {page==="listings"&&<AllListings/>}
    {page==="gmb"&&<GmbAdmin/>}
    {page==="team"&&<Team/>}
    {page==="activity"&&<Activity/>}
    {page==="audit"&&<AuditTrail/>}
    {page==="trash"&&<Trash/>}
    {page==="settings"&&<Settings/>}
  </Shell>
  {modal?.type==="clientForm"&&<ClientFormModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="team"&&<TeamModal onClose={()=>setModal(null)}/>}
  {modal?.type==="addListing"&&<AddListingModal clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="updateListing"&&<UpdateListingModal listing={modal.listing} clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="gmb"&&<GmbModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="analytics"&&<AnalyticsModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="integrations"&&<IntegrationsModal client={modal.client} onClose={()=>setModal(null)}/>}
  <Confirm data={confirm} onClose={()=>setConfirm(null)}/>
  <Toasts/></>);
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
const Loading=({label="Loading platform…"})=>(
  <div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:FONT_B}}>
    <Orbit size={90} speed={6}/><div style={{fontSize:13,color:T.sub,fontWeight:600}}>{label}</div>
  </div>
);

// Client portal at /login. Redirects staff who land here to /admin.
function ClientPortal({user,data,reload,onLogin,onLogout}){
  const nav=useNavigate();
  if(user&&STAFF_ROLES.includes(user.role))return <Navigate to="/admin" replace/>;
  if(!user)return <AuthScreen portal="client" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading your dashboard…"/>;
  return <ClientDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/login");}}/>;
}

// Staff portal at /admin. Redirects clients who land here to /login.
function StaffPortal({user,data,reload,onLogin,onLogout}){
  const nav=useNavigate();
  if(user&&!STAFF_ROLES.includes(user.role))return <Navigate to="/login" replace/>;
  if(!user)return <AuthScreen portal="staff" onLogin={async(u)=>{await onLogin(u);}}/>;
  if(!data)return <Loading label="Loading admin…"/>;
  return <AdminDashboard user={user} data={data} reload={reload} onLogout={async()=>{await onLogout();nav("/admin");}}/>;
}

export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  const[data,setData]=useState(null);
  const reload=useCallback(async()=>{const d=await api.loadAll();setData(d);},[]);
  useEffect(()=>{(async()=>{await api.init();const existing=await api.currentUser();if(existing)setCurrentUser(existing);await reload();setReady(true);})();},[reload]);
  const onLogin=async(u)=>{setCurrentUser(u);await reload();};
  const onLogout=async()=>{await api.logout();setCurrentUser(null);};
  if(!ready)return(<><GlobalStyle/><Loading/></>);
  const shared={user:currentUser,data,reload,onLogin,onLogout};
  return(<><GlobalStyle/>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<ClientPortal {...shared}/>}/>
        <Route path="/admin" element={<StaffPortal {...shared}/>}/>
        <Route path="*" element={<Navigate to="/login" replace/>}/>
      </Routes>
    </BrowserRouter>
  </>);
}
