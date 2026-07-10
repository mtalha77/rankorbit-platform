import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "./lib/theme";
import { PLANS, CATEGORIES, US_CA_STATES, BIZ_FIELDS, planLive, livePlanEntries } from "./lib/constants";
import { today, todayFull, nextMonthFirst, uid, passwordIssues, passwordScore, STAFF_ROLES, SHOW_DEMOS, actIcon, clientBy } from "./lib/helpers";
import { supa, LS, LSet, SUPA_URL, SUPA_KEY } from "./lib/supabase";
import { api } from "./lib/api";
import { useWindowSize, useCounter, useToast } from "./hooks";
import { Reveal } from "./components/Reveal";
import { GlobalStyle } from "./components/GlobalStyle";
import { Orbit, MiniOrbit } from "./components/Orbit";
import { Badge, Card, Btn, Input, Select, Modal, Confirm, StatCard, ChartTip, ExportBtn, SectionTitle, Empty, ListToolbar, PageHead } from "./components/atoms";
import AuthScreen from "./pages/AuthScreen";
import Shell from "./components/Shell";
import LandingPage from "./pages/LandingPage";
import UserManual from "./pages/UserManual";



function ClientDashboard({user:userProp,data,reload,onLogout,impersonating=false}){
  const[page,setPage]=useState("home");
  const[toast,Toasts]=useToast();
  const[showManual,setShowManual]=useState(false);
  const w=useWindowSize();const isMobile=w<820;
  // Always use the freshest copy of the profile (data.users is refreshed by reload()),
  // so profile edits (e.g. completing the business profile) reflect immediately.
  const user=(data.users||[]).find(u=>u.id===userProp.id)||userProp;
  // First-login user manual: show once. Never auto-open while staff is impersonating.
  useEffect(()=>{
    if(impersonating)return;
    try{const key="ro_manual_seen_"+user.id;if(!localStorage.getItem(key)){setShowManual(true);localStorage.setItem(key,"1");}}catch{}
  },[user.id,impersonating]);
  const my=data.listings[user.id]||[];
  const myGmb=data.gmb[user.id];
  const myAnalytics=data.analytics[user.id];
  const myAct=data.activity.filter(a=>a.clientId===user.id);
  const settings=data.settings;
  const cfg=settings?.config||{};
  // Client-visible prices honor the super-admin control-panel overrides, falling back to defaults.
  const priceOf=(id)=>{const m={essentials:"priceEssentials",growth:"priceGrowth",gmb:"priceGmb"};const v=cfg[m[id]];return v!=null&&v!==""?Number(v):PLANS[id]?.price;};
  // Full map (all plans, for looking up a client's current plan even if now hidden).
  const PLANSALL=Object.fromEntries(Object.entries(PLANS).map(([id,p])=>[id,{...p,price:priceOf(id)}]));
  // Selectable map: only live plans show in the choose/upgrade grid.
  const PLANSV=Object.fromEntries(Object.entries(PLANS).filter(([id])=>planLive(id,cfg)).map(([id,p])=>[id,{...p,price:priceOf(id)}]));
  const live=my.filter(l=>l.status==="live").length;
  const pending=my.filter(l=>l.status==="pending").length;
  const plan=PLANSALL[user.plan]||PLANSALL.essentials;
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

  // Single headline metric: blends coverage, NAP consistency, and live ratio into one 0-100 score.
  const visScore=(()=>{
    const coverage=Math.min(100,(live/60)*100);
    const nap=user.napScore||0;
    const liveRatio=my.length?(live/my.length)*100:0;
    return Math.round(coverage*0.4+nap*0.4+liveRatio*0.2);
  })();
  const visLabel=visScore>=75?"Excellent":visScore>=50?"Good":visScore>=25?"Building":"Getting started";
  const visColor=visScore>=75?T.green:visScore>=50?T.brand:visScore>=25?T.amber:T.faint;
  // Onboarding checklist: guides brand-new clients through first setup steps.
  const steps=[
    {done:!!user.plan,label:"Choose your plan",action:()=>setPage("billing")},
    {done:!!(user.businessName&&user.phone&&user.city),label:"Complete your business profile",action:()=>setPage("call")},
    {done:my.length>0,label:"First listings submitted",action:()=>setPage("listings")},
    {done:live>0,label:"First listing goes live",action:()=>setPage("listings")},
  ];
  const stepsDone=steps.filter(s=>s.done).length;
  const onboardComplete=stepsDone===steps.length;

  const recentNotifs=myAct.slice(0,6);
  const[notifOpen,setNotifOpen]=useState(false);
  const[notifSeen,setNotifSeen]=useState(()=>{try{return localStorage.getItem("ro_notif_seen_"+user.id)===String(myAct.length);}catch{return false;}});
  const unread=notifSeen?0:recentNotifs.length;
  const markSeen=()=>{try{localStorage.setItem("ro_notif_seen_"+user.id,String(myAct.length));}catch{}setNotifSeen(true);};
  // Route each activity type to the section where the client can act on it.
  const notifTarget=(t)=>({listing_live:"listings",nap_fix:"listings",edit_blocked:"listings",flagged:"listings",rejected:"listings",submitted:"listings",gmb_update:"gmb",analytics:"analytics"}[t]||"listings");
  const openNotif=(a)=>{setNotifOpen(false);setPage(notifTarget(a.type));};
  const NotifBell=()=>(
    <div style={{position:"relative"}}>
      <button onClick={()=>{setNotifOpen(o=>!o);if(!notifOpen)markSeen();}} aria-label="Notifications" style={{position:"relative",width:42,height:42,borderRadius:12,background:notifOpen?T.brandSoft:T.surface,border:`1.5px solid ${notifOpen?T.brand:T.line}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={notifOpen?T.brand:T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread>0&&<span style={{position:"absolute",top:-3,right:-3,background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,minWidth:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"2px solid #fff"}}>{unread}</span>}
      </button>
      {notifOpen&&(<><div style={{position:"fixed",inset:0,zIndex:80}} onClick={()=>setNotifOpen(false)}/>
        <div className="pop" style={{position:"absolute",top:50,right:0,width:isMobile?280:320,background:T.surface,borderRadius:16,boxShadow:SHADOW_LG,border:`1px solid ${T.line}`,zIndex:90,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.line}`,fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Notifications</div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {recentNotifs.length===0?<div style={{padding:"26px 16px",textAlign:"center",fontSize:13,color:T.faint}}>You're all caught up.</div>:
              recentNotifs.map(a=>(<div key={a.id} onClick={()=>openNotif(a)} className="hoverRow" style={{display:"flex",gap:11,padding:"13px 16px",borderBottom:`1px solid ${T.line}`,alignItems:"flex-start",cursor:"pointer"}}>
                <span style={{fontSize:16,marginTop:1}}>{actIcon(a.type)}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,lineHeight:1.45,color:T.ink}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:3,display:"flex",justifyContent:"space-between"}}><span>{a.date}</span><span style={{color:T.brand,fontWeight:700}}>View</span></div></div>
              </div>))}
          </div>
        </div></>)}
    </div>
  );

  const Home=()=>(<div>
    <PageHead isMobile={isMobile} title={`${greet}, ${(user.name||"there").split(" ")[0]} 👋`} sub={`Here's what we're doing for ${user.businessName||"your business"} right now`}
      right={<div style={{display:"flex",gap:10,alignItems:"center"}}><NotifBell/><Btn variant="soft" size="sm" onClick={()=>setPage("call")}>📞 Talk to your BDM</Btn></div>}/>
    {!user.plan&&(<Card style={{marginBottom:18,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>Welcome to NAP Orbit 🚀</div><div style={{fontSize:13,color:T.sub,marginTop:3}}>Choose a plan to start getting listed, or your account manager will set you up after your call.</div></div>
      <Btn onClick={()=>setPage("billing")}>Choose a plan</Btn>
    </Card>)}
    {/* Visibility Score hero + onboarding checklist */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":onboardComplete?"1fr":"1.3fr 1fr",gap:16,marginBottom:22}}>
      <Card className="fadeUp" style={{background:`linear-gradient(135deg,${visColor}18,#fff)`,display:"flex",alignItems:"center",gap:22,flexWrap:"wrap"}}>
        <div style={{position:"relative",width:118,height:118,flexShrink:0}}>
          <svg width="118" height="118" viewBox="0 0 118 118">
            <circle cx="59" cy="59" r="50" fill="none" stroke={T.line} strokeWidth="11"/>
            <circle cx="59" cy="59" r="50" fill="none" stroke={visColor} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*50}`} strokeDashoffset={`${2*Math.PI*50*(1-visScore/100)}`}
              transform="rotate(-90 59 59)" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.22,.8,.36,1)"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:visColor,lineHeight:1}}>{visScore}</div>
            <div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>/ 100</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:5}}>YOUR VISIBILITY SCORE</div>
          <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:visColor,marginBottom:6}}>{visLabel}</div>
          <div style={{fontSize:12.5,color:T.sub,lineHeight:1.55}}>One number for your online health, it blends how many directories you're on, how consistent your info is, and how many listings are live. It climbs as we work.</div>
        </div>
      </Card>
      {!onboardComplete&&(<Card className="fadeUp" style={{animationDelay:"80ms"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13.5,fontWeight:800,fontFamily:FONT_D}}>Getting Started</div>
          <div style={{fontSize:12,fontWeight:800,color:T.brand}}>{stepsDone}/{steps.length}</div>
        </div>
        <div style={{height:6,background:T.surface2,borderRadius:4,overflow:"hidden",marginBottom:14}}>
          <div style={{width:`${(stepsDone/steps.length)*100}%`,height:"100%",background:`linear-gradient(90deg,${T.brand},${T.green})`,transition:"width .6s"}}/>
        </div>
        {steps.map((s,i)=>(
          <div key={i} onClick={s.done?undefined:s.action} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:s.done?"default":"pointer",opacity:s.done?.7:1}}>
            <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:s.done?T.green:T.surface2,border:s.done?"none":`1.5px solid ${T.line}`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{s.done?"✓":i+1}</div>
            <span style={{fontSize:13,color:s.done?T.faint:T.ink,fontWeight:s.done?500:700,textDecoration:s.done?"line-through":"none"}}>{s.label}</span>
            {!s.done&&<span style={{marginLeft:"auto",fontSize:11,color:T.brand,fontWeight:700}}>→</span>}
          </div>))}
      </Card>)}
    </div>
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
      {myAct.length===0?<Empty icon="🛰️" title="Work starting" sub="Your first listings are being prepared, check back soon."/>:
        myAct.slice(0,5).map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<Math.min(myAct.length,5)-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{a.date}{a.by?` · ${clientBy(a.by)}`:""}</div></div>
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
          <td style={{padding:"12px",fontSize:12.5,color:d.liveDate==="–"?T.faint:T.ink,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="–"?<span style={{fontSize:12,color:T.faint}}>–</span>:<Badge type={d.napMatch}/>}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:12}}>–</span>}</td>
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

  // GMB Pro monthly report: client sets a delivery email; manager marks it sent each month.
  const ReportCard=()=>{
    const[email,setEmail]=useState(user.reportEmail||user.email||"");
    const[saving,setSaving]=useState(false);
    const sent=user.reportSentMonth; // e.g. "March 2026"
    const save=async()=>{setSaving(true);try{await api.patchProfile(user.id,{reportEmail:email});await reload();toast("Report email saved");}catch(e){toast("Could not save","info");}setSaving(false);};
    return(<Card style={{marginBottom:16}}>
      <SectionTitle sub="Your detailed monthly GMB performance report, delivered to your inbox by your account manager.">Monthly Report</SectionTitle>
      {sent&&<div style={{padding:"11px 14px",background:T.greenSoft,borderRadius:11,marginBottom:14,fontSize:12.5,color:T.green,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        Report sent for {sent}
      </div>}
      <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 240px"}}><Input label="Send my report to" value={email} onChange={setEmail} placeholder="you@business.com" validate="email"/></div>
        <Btn onClick={save} disabled={saving} style={{marginBottom:14}}>{saving?"Saving…":"Save email"}</Btn>
      </div>
    </Card>);
  };

  const Gmb=()=>{
    if(user.plan!=="gmb")return(<div>
      <PageHead isMobile={isMobile} title="GMB Management"/>
      <Card style={{textAlign:"center",padding:isMobile?32:56,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Orbit size={100} speed={10}/></div>
        <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,marginBottom:8}}>Put your Google profile on autopilot</div>
        <div style={{fontSize:13.5,color:T.sub,maxWidth:440,margin:"0 auto 24px",lineHeight:1.6}}>We publish posts, answer Q&A, keep your profile complete, and get you found in AI searches like ChatGPT, Gemini and Google AI Overviews, plus show you exactly how many calls and visits Google sends you every month.</div>
        <Btn size="lg" onClick={()=>setPage("billing")}>Upgrade to GMB Pro, $249/mo</Btn>
        <div style={{fontSize:11.5,color:T.faint,marginTop:12}}>Includes everything in Growth · Cancel anytime</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub="Your Google Business Profile, actively managed" right={<Badge type={d.source==="connected"?"connected":"manual"}/>}/>
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${T.violetSoft},#fff)`,display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:44,height:44,borderRadius:13,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:SHADOW}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        </div>
        <div><div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>Now visible in AI searches</div><div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginTop:2}}>Your managed profile and consistent data help you appear in ChatGPT, Gemini and Google AI Overviews, not just traditional search.</div></div>
      </Card>
      <ReportCard/>
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
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Google Business Profile posts we publish to keep your listing active and engaging" right={<span style={{fontSize:11.5,fontWeight:800,color:T.violet,background:T.violetSoft,padding:"4px 11px",borderRadius:20}}>{(d.posts||[]).length} posts</span>}>GMB Posts</SectionTitle>
        {(!d.posts||d.posts.length===0)?<Empty icon="📝" title="No posts yet" sub="Your first GMB post is being drafted by your account manager."/>:
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            {d.posts.map((p,i)=>{
              const typeInfo={offer:{c:T.amber,cs:T.amberSoft,ic:"🎁",label:"Offer"},event:{c:T.violet,cs:T.violetSoft,ic:"📅",label:"Event"},update:{c:T.brand,cs:T.brandSoft,ic:"📢",label:"Update"},product:{c:T.green,cs:T.greenSoft,ic:"🛍️",label:"Product"}}[p.type||"update"];
              const scheduled=p.status==="scheduled";
              return(<div key={i} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:16,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:800,color:typeInfo.c,background:typeInfo.cs,padding:"3px 9px",borderRadius:20}}>{typeInfo.ic} {typeInfo.label}</span>
                  <span style={{fontSize:10.5,fontWeight:800,color:scheduled?T.amber:T.green,background:scheduled?T.amberSoft:T.greenSoft,padding:"3px 9px",borderRadius:20}}>{scheduled?"◷ Scheduled":"● Live"}</span>
                </div>
                <div style={{fontSize:14,fontWeight:800,marginBottom:5}}>{p.title}</div>
                {p.content&&<div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginBottom:8}}>{p.content}</div>}
                <div style={{fontSize:11,color:T.faint}}>{scheduled?"Scheduled for":"Published"} {p.date}</div>
              </div>);
            })}
          </div>}
      </Card>
      <Card><SectionTitle>Profile Completeness</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"2px 24px"}}>
          {Object.entries(d.completeness||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:13,color:T.sub,textTransform:"capitalize"}}>{k}</span>
            <span style={{fontSize:12.5,fontWeight:800,color:v?T.green:T.amber}}>{v?"✓ Done":"○ In progress"}</span>
          </div>))}
        </div>
      </Card>
    </div>);
  };

  const Billing=()=>{
    const stripe=settings?.stripe||{};
    const stripeReady=!!(stripe.essentials||stripe.growth||stripe.gmb);
    const goStripe=(planId)=>{
      const link=stripe[planId];
      if(link&&link.startsWith("http")){
        // Tag the checkout with this client's id + plan so the webhook can auto-activate the right account.
        const sep=link.includes("?")?"&":"?";
        const url=`${link}${sep}client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email||"")}`;
        window.open(url,"_blank");
      }else if(!stripeReady){
        // DEMO MODE: no Stripe configured yet. Activate the plan directly so the flow can be tested
        // end-to-end without payment. This path disappears automatically once any Payment Link is set.
        R(async()=>{await api.patchProfile(user.id,{plan:planId,status:"active",currentPeriodEnd:nextMonthFirst()});},`${PLANS[planId].name} activated (demo mode, no charge)`);
      }else toast("Payment link for this plan isn't set up yet, your account manager will send it","info");
    };
    // Require core business details before a plan can be selected (captures data upfront, esp. Google signups).
    const profileComplete=!!(user.businessName&&user.phone&&user.address&&user.city&&user.state&&user.category);
    return(<div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get"/>
      {!profileComplete&&!user.plan&&<ProfileGate user={user} onSaved={reload}/>}
      {(profileComplete||user.plan)&&(<>
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
            <Btn variant="green" size="sm" style={{width:"100%",marginTop:12}} onClick={()=>R(async()=>{await api.upsertProfile({...user,cancelAtPeriodEnd:false,canceledAt:null});},"Subscription resumed, you're all set")}>Resume subscription</Btn>
          </>):(<>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>on the 1st of next month</div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically. Cancel before your renewal date to avoid the next charge, you keep access until the period ends.</div>
            <button onClick={()=>setConfirm({title:"Cancel subscription?",msg:`Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`,danger:true,yes:"Cancel at period end",onYes:()=>R(async()=>{await api.upsertProfile({...user,cancelAtPeriodEnd:true,canceledAt:new Date().toISOString(),currentPeriodEnd:user.currentPeriodEnd||nextMonthFirst()});},"Subscription set to cancel at period end")})} style={{marginTop:12,background:"none",border:"none",color:T.faint,fontSize:11.5,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:FONT_B,padding:0}}>Cancel subscription</button>
          </>)}
        </Card>
      </div>)}
      <SectionTitle sub="Pick a plan to start, or upgrade anytime, secure checkout via Stripe">{user.plan?"Change Plan":"Choose Your Plan"}</SectionTitle>
      {!stripeReady&&<div style={{padding:"10px 14px",background:T.amberSoft,borderRadius:11,marginBottom:14,fontSize:12,color:T.amber,fontWeight:600}}>Demo mode: plans activate instantly with no payment. Real Stripe checkout goes live once Payment Links are added.</div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
        {Object.entries(PLANSV).map(([id,p],i)=>{
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
              <Btn size="sm" style={{width:"100%",marginTop:10}} onClick={()=>goStripe(id)}>{!stripeReady?"Activate ":user.plan?"Switch to ":"Subscribe to "}{p.name} →</Btn>}
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
        <SectionTitle sub="Download everything we hold about your account, profile, listings, and activity.">Your Data</SectionTitle>
        <Btn variant="ghost" size="sm" onClick={()=>{
          const mine={profile:user,listings:my,activity:myAct,exportedAt:new Date().toISOString()};
          downloadBlob(JSON.stringify(mine,null,2),`naporbit-my-data-${Date.now()}.json`,"application/json");
          toast("Your data downloaded");
        }}>⤓ Download my data (JSON)</Btn>
      </Card>
      </>)}
    </div>);
  };

  // Required business-details form shown before plan selection (captures data upfront).
  const ProfileGate=({user,onSaved})=>{
    const[f,setF]=useState({businessName:user.businessName||"",phone:user.phone||"",address:user.address||"",city:user.city||"",state:user.state||"",category:user.category||"Home Services",website:user.website||"",gbpId:user.gbpId||""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const[saving,setSaving]=useState(false);
    const[tried,setTried]=useState(false);
    const ok=f.businessName&&f.phone.replace(/\D/g,"").length>=10&&f.address&&f.city&&f.state;
    const save=async()=>{if(!ok){setTried(true);return;}setSaving(true);try{await api.patchProfile(user.id,f);await onSaved();toast("Business profile saved");}catch(e){toast("Could not save: "+(e.message||"unknown error"),"info");}setSaving(false);};
    const req=(k)=>tried&&!f[k]?`Required`:"";
    return(<Card style={{marginBottom:20,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,maxWidth:640}}>
      <SectionTitle sub="Tell us about your business so we can list it correctly everywhere. Takes one minute, then choose your plan.">First, complete your business profile</SectionTitle>
      <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" error={req("businessName")}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone" error={tried&&f.phone.replace(/\D/g,"").length<10?"Valid US/Canada number required":""}/>
        <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
      </div>
      <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St" error={req("address")}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin" error={req("city")}/>
        <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
      </div>
      {tried&&!f.state&&<div style={{fontSize:11,color:T.red,marginTop:-8,marginBottom:10,fontWeight:600}}>State / Province is required</div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <Input label="Website (optional)" value={f.website} onChange={v=>set("website",v)} placeholder="mikesplumbing.com"/>
        <Input label="Google Business Profile link (optional)" value={f.gbpId} onChange={v=>set("gbpId",v)} placeholder="Paste your GMB link"/>
      </div>
      <Btn style={{marginTop:6}} onClick={save} disabled={saving}>{saving?"Saving…":"Save & continue to plans →"}</Btn>
      {tried&&!ok&&<div style={{fontSize:11.5,color:T.red,marginTop:8,fontWeight:600}}>Please fill all required fields (marked *) to continue.</div>}
    </Card>);
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
    const co="NAP Orbit";const eff=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
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
          <P><b>All fees are non-refundable.</b> Due to the nature of the Services, which involve immediate allocation of work, third-party submissions, and labor performed on your behalf, any amount you have already paid is not refundable, in whole or in part, including for partial billing periods, unused quota, or after cancellation. This clause applies to the fullest extent permitted by law.</P>
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
          <P>Questions about these terms: info@naporbit.com.</P>
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
          <P>Privacy questions or data requests: info@naporbit.com.</P>
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
  </Shell>
  {/* Floating Help button, reopens the user manual anytime */}
  <button onClick={()=>setShowManual(true)} title="How to use your dashboard" style={{position:"fixed",bottom:isMobile?18:24,right:isMobile?18:24,zIndex:900,background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",border:"none",borderRadius:isMobile?"50%":24,width:isMobile?52:"auto",height:52,padding:isMobile?0:"0 20px",boxShadow:SHADOW_LG,cursor:"pointer",fontFamily:FONT_B,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
    <span style={{fontSize:18}}>?</span>{!isMobile&&<span>Help</span>}
  </button>
  {showManual&&<UserManual user={user} plan={plan} onClose={()=>setShowManual(false)} goTo={(p)=>{setPage(p);setShowManual(false);}}/>}
  <Toasts/></>);
}

// First-login user manual + Help-button guide. Explains each section in plain language.
function AdminDashboard({user,data,reload,onLogout}){
  const[page,setPage]=useState("overview");
  const[selClient,setSelClient]=useState(null);
  const[modal,setModal]=useState(null);
  const[confirm,setConfirm]=useState(null);
  const[toast,Toasts]=useToast();
  const w=useWindowSize();const isMobile=w<820;
  const{users,listings,gmb,analytics,activity,settings}=data;
  const allClients=users.filter(u=>u.role==="client");
  const staff=users.filter(u=>u.role!=="client");
  const isAdmin=user.role==="super_admin";
  const isStaffMgr=user.role==="super_admin"||user.role==="manager";
  const isAgent=user.role==="agent";
  // Agents only see clients assigned to them by a manager. Staff/managers see all.
  const clients=isAgent?allClients.filter(c=>c.assignedAgentId===user.id):allClients;
  // Read-only impersonation: super-admin always; managers only if granted canImpersonate.
  const canImpersonate=isAdmin||(user.role==="manager"&&user.canImpersonate);
  const[viewAs,setViewAs]=useState(null); // client being viewed read-only
  const acfg=settings?.config||{};
  const livePlans=livePlanEntries(acfg); // [id,plan] pairs for plans currently live
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
  // When an AGENT edits/deletes a listing, flag it for managers (queued for email later).
  // Uses an internal clientId sentinel so it appears in admin activity but NEVER in the client's feed.
  const notifyManagersIfAgent=async(action,listing)=>{
    if(user.role!=="agent")return;
    const clientName=clients.find(c=>c.id===listing.clientId)?.businessName||"a client";
    await api.addActivity({id:uid(),clientId:"__internal",type:"edit_blocked",desc:`Manager review: ${user.name} ${action} "${listing.directory}" for ${clientName}`,date:todayFull(),by:"System"});
    // Batch 4 will also send this to managers via /api/notify.
    if(typeof window!=="undefined")window.__pendingManagerAlerts=(window.__pendingManagerAlerts||0)+1;
  };
  const R=async(fn,msg)=>{await fn();if(msg)toast(msg);await reload();};

  const nav=[
    {id:"overview",icon:"📊",label:"Overview",roles:["super_admin","manager","agent"]},
    {id:"clients",icon:"👥",label:"Clients",roles:["super_admin","manager","agent"],match:["clientDetail"]},
    {id:"listings",icon:"📋",label:"All Listings",roles:["super_admin","manager","agent"]},
    {id:"gmb",icon:"📍",label:"GMB",roles:["super_admin","manager"]},
    {id:"team",icon:"🔑",label:"Team",roles:["super_admin","manager"]},
    {id:"activity",icon:"📜",label:"Activity Log",roles:["super_admin","manager"]},
    {id:"finance",icon:"💰",label:"Finance",roles:["super_admin"]},
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
          await api.upsertListing({id:uid(),clientId,directory:f.directory,status:"submitted",submitted:today(),liveDate:"–",napMatch:"–",liveLink:"",da:parseInt(f.da)||0,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
          await addActivity(clientId,"submitted",`${f.directory} submitted`);
        },`${f.directory} added`).then(onClose)}>Add Listing</Btn>
      </div>
    </Modal>);
  };
  const UpdateListingModal=({listing,clientId,onClose})=>{
    const[f,setF]=useState({status:listing.status,liveLink:listing.liveLink||"",liveDate:listing.liveDate||"",napMatch:listing.napMatch||"–",notes:listing.notes||"",actionNeeded:!!listing.actionNeeded,actionNote:listing.actionNote||""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`Update · ${listing.directory}`}>
      <Select label="Status" value={f.status} onChange={v=>set("status",v)} options={["submitted","pending","live","rejected","flagged"].map(s=>({value:s,label:s[0].toUpperCase()+s.slice(1)}))}/>
      <Input label="Live Listing URL" value={f.liveLink} onChange={v=>set("liveLink",v)} placeholder="https://directory.com/business"/>
      <Input label="Live Date" value={f.liveDate} onChange={v=>set("liveDate",v)} placeholder="e.g. Jul 5"/>
      <Select label="NAP Match" value={f.napMatch} onChange={v=>set("napMatch",v)} options={[{value:"–",label:"– Pending"},{value:"match",label:"✓ Match"},{value:"mismatch",label:"Mismatch"},{value:"fixed",label:"Fixed"}]}/>
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
            await api.upsertListing({...listing,status:f.status,liveLink:f.liveLink,liveDate:f.status==="live"?(f.liveDate&&f.liveDate!=="–"?f.liveDate:today()):listing.liveDate,napMatch:f.napMatch,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
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
        <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Mike Johnson" required/>
        <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" required/>
        <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="mike@business.com" validate="email" required/>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone"/>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
      </div>
      <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Select label="Plan" value={f.plan} onChange={v=>set("plan",v)} options={[{value:"",label:"No plan yet"},...livePlans.map(([id,p])=>({value:id,label:`${p.name} $${p.price}/mo`})),...(f.plan&&!livePlans.find(([id])=>id===f.plan)?[{value:f.plan,label:`${PLANS[f.plan]?.name} (hidden)`}]:[])]}/>
        <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
      </div>
      {editing&&<Select label="Status" value={f.status} onChange={v=>set("status",v)} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]}/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{
          if(!f.email||!f.name){toast("Name and email required","warn");return;}
          (async()=>{
            try{
              if(editing){await api.upsertProfile(f);toast("Client updated");}
              else{await api.upsertProfile({...f,id:uid(),avatar:(f.name||"?")[0].toUpperCase(),napScore:0,createdAt:new Date().toISOString()});await addActivity("","client",`New client added: ${f.businessName||f.name}`);toast(`${f.businessName||f.name} added`);}
              await reload();onClose();
            }catch(e){toast("Could not save: "+(e.message||"unknown"),"info");}
          })();
        }}>{editing?"Save Changes":"Add Client"}</Btn>
      </div>
      {!editing&&api.mode==="supabase"&&<div style={{marginTop:12,fontSize:11,color:T.faint,lineHeight:1.5}}>Note: this creates a profile record. For the client to log in, they sign up themselves (email/Google) with this email, or you send them a reset link.</div>}
    </Modal>);
  };
  const NapConfirmModal=({client,newScore,onClose})=>{
    const hist=client.napHistory||[];
    const last3=hist.slice(-3).reverse();
    const roleLabel=user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent";
    const[saving,setSaving]=useState(false);
    const save=async()=>{
      setSaving(true);
      try{
        const entry={score:newScore,date:new Date().toISOString(),by:roleLabel};
        await api.patchProfile(client.id,{napScore:newScore,napHistory:[...hist,entry].slice(-20)});
        await audit("nap.update",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:`${client.napScore||0}% → ${newScore}%`});
        await addActivity(client.id,"nap_fix",`NAP consistency updated to ${newScore}%`);
        await reload();toast(`NAP score saved: ${newScore}%`);onClose();
      }catch(e){toast("Could not save NAP","info");}
      setSaving(false);
    };
    const fmt=(d)=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    return(<Modal open onClose={onClose} title="Confirm NAP score update">
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"10px 0 18px"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.faint,fontWeight:700}}>CURRENT</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:T.faint}}>{client.napScore||0}%</div></div>
        <span style={{fontSize:22,color:T.faint}}>→</span>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.brand,fontWeight:700}}>NEW</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:newScore>=90?T.green:newScore>=70?T.amber:T.red}}>{newScore}%</div></div>
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>LAST 3 NAP UPDATES</div>
      {last3.length===0?<div style={{fontSize:12.5,color:T.faint,padding:"8px 0 16px"}}>No previous updates recorded.</div>:
        <div style={{marginBottom:16}}>{last3.map((h,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:12.5,fontWeight:700}}>{h.score}%</span>
          <span style={{fontSize:11.5,color:T.faint}}>{fmt(h.date)} · {h.by}</span>
        </div>))}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Confirm & save"}</Btn></div>
    </Modal>);
  };
  const LogEditModal=({client,onClose})=>{
    const[note,setNote]=useState("");
    const[shareWithClient,setShare]=useState(false);
    const[saving,setSaving]=useState(false);
    const save=async()=>{
      setSaving(true);
      try{
        const base="Unauthorized edit blocked and reverted";
        const desc=note.trim()?`${base}: ${note.trim()}`:base;
        // If shared with client it goes to their feed; otherwise internal only.
        await addActivity(shareWithClient?client.id:"__internal","edit_blocked",desc);
        await audit("edit.revert",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:note.trim()||"no note"});
        await reload();toast("Unauthorized edit logged & reverted");onClose();
      }catch(e){toast("Could not log","info");}
      setSaving(false);
    };
    return(<Modal open onClose={onClose} title="Log unauthorized edit">
      <div style={{fontSize:12.5,color:T.sub,marginBottom:14,lineHeight:1.5}}>Record an unauthorized change you caught and reverted. Add a note describing what was found.</div>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>NOTES (what was changed?)</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Business hours changed on Google without authorization, reverted to correct hours." rows={3} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:12}}/>
      <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",marginBottom:16}}>
        <input type="checkbox" checked={shareWithClient} onChange={e=>setShare(e.target.checked)} style={{width:16,height:16,accentColor:T.brand}}/>
        <span style={{fontSize:12.5,color:T.sub}}>Show this note to the client in their activity feed</span>
      </label>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={save} disabled={saving}>{saving?"Logging…":"Log & revert"}</Btn></div>
    </Modal>);
  };
  const SuspendModal=({client,onClose})=>{
    const[reason,setReason]=useState("");
    const[saving,setSaving]=useState(false);
    const roleLabel=user.role==="super_admin"?"Super Admin":"Manager";
    const doSuspend=async()=>{
      setSaving(true);
      try{
        await api.patchProfile(client.id,{status:"suspended",suspendedAt:new Date().toISOString(),suspendReason:reason.trim(),suspendedBy:roleLabel});
        await audit("client.suspend",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:reason.trim()||"no reason given"});
        await reload();toast("Client suspended");onClose();
      }catch(e){toast("Could not suspend","info");}
      setSaving(false);
    };
    return(<Modal open onClose={onClose} title={`Suspend ${client.businessName||client.name}?`}>
      <div style={{fontSize:12.5,color:T.sub,marginBottom:14,lineHeight:1.5}}>The client won't be able to log in until reactivated. Add a short reason for the record (staff only).</div>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>REASON / NOTES</label>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Payment failed, client requested pause, policy issue…" rows={3} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:16}}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={doSuspend} disabled={saving}>{saving?"Suspending…":"Suspend client"}</Btn></div>
    </Modal>);
  };
  const AssignModal=({agent,onClose})=>{
    const[sel,setSel]=useState(new Set(allClients.filter(c=>c.assignedAgentId===agent.id).map(c=>c.id)));
    const[saving,setSaving]=useState(false);
    const[q,setQ]=useState("");
    // Granular permissions, default all-on. What this agent may change for assigned clients.
    const defPerms={listings:true,nap:true,logEdit:true,gmb:true};
    const[perms,setPerms]=useState({...defPerms,...(agent.perms||{})});
    const togglePerm=(k)=>setPerms(p=>({...p,[k]:!p[k]}));
    const toggle=(id)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
    const list=allClients.filter(c=>!q||`${c.businessName} ${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
    const save=async()=>{
      setSaving(true);
      try{
        for(const c of allClients){
          const was=c.assignedAgentId===agent.id;const now=sel.has(c.id);
          if(now&&!was)await api.assignClient(c.id,agent.id);
          else if(!now&&was)await api.assignClient(c.id,null);
        }
        await api.patchProfile(agent.id,{perms});
        await audit("agent.assign",{targetType:"staff",targetId:agent.id,targetName:agent.name,detail:`${sel.size} clients`});
        await reload();toast(`Saved: ${sel.size} clients`);onClose();
      }catch(e){toast("Could not save assignments","info");}
      setSaving(false);
    };
    const permList=[["listings","Update listings"],["nap","Update NAP score"],["logEdit","Log unauthorized edits"],["gmb","GMB changes"]];
    return(<Modal open onClose={onClose} title={`Assign clients to ${agent.name}`}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>WHAT THIS AGENT CAN DO</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {permList.map(([k,label])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:perms[k]?T.brandSoft:T.surface2,border:`1.5px solid ${perms[k]?T.brand:T.line}`,borderRadius:10,cursor:"pointer",transition:"all .12s"}}>
            <input type="checkbox" checked={!!perms[k]} onChange={()=>togglePerm(k)} style={{width:15,height:15,accentColor:T.brand}}/>
            <span style={{fontSize:12.5,fontWeight:700,color:perms[k]?T.brand:T.sub}}>{label}</span>
          </label>))}
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>ASSIGNED CLIENTS</div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍  Search clients…" style={{width:"100%",padding:"10px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",marginBottom:12}}/>
      <div style={{maxHeight:260,overflowY:"auto",marginBottom:16}}>
        {list.length===0?<div style={{padding:"20px",textAlign:"center",fontSize:12.5,color:T.faint}}>No clients found.</div>:
          list.map(c=>(<label key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 8px",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
            <input type="checkbox" checked={sel.has(c.id)} onChange={()=>toggle(c.id)} style={{width:16,height:16,accentColor:T.brand}}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.businessName||c.name}</div><div style={{fontSize:11,color:T.faint}}>{c.email}{c.assignedAgentId&&c.assignedAgentId!==agent.id?" · assigned to another agent":""}</div></div>
            {c.plan&&<Badge type="submitted" label={PLANS[c.plan]?.name}/>}
          </label>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:12.5,color:T.sub,fontWeight:700}}>{sel.size} selected</span>
        <div style={{display:"flex",gap:8}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Btn></div>
      </div>
    </Modal>);
  };
  const TeamModal=({onClose})=>{
    const genPw=()=>{const cs="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";let p="";for(let i=0;i<12;i++)p+=cs[Math.floor(Math.random()*cs.length)];return p;};
    const[f,setF]=useState({role:isAdmin?"manager":"agent",password:genPw()});
    const[saving,setSaving]=useState(false);
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const create=async()=>{
      if(!f.email||!f.name){toast("Name and email required","warn");return;}
      if(!f.password||f.password.length<8){toast("Password must be at least 8 characters","warn");return;}
      setSaving(true);
      const r=await api.createStaff({name:f.name,email:f.email,password:f.password,role:f.role});
      setSaving(false);
      if(r.error){toast(r.error,"info");return;}
      await audit("staff.create",{targetType:"staff",targetName:f.name,detail:f.role});
      await reload();toast(`${f.name} created. Login ready.`);onClose();
    };
    // Managers can only create agents; super-admin can create super-admins, managers, or agents.
    const roleOpts=isAdmin?[{value:"super_admin",label:"Super Admin"},{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]:[{value:"agent",label:"Agent"}];
    return(<Modal open onClose={onClose} title="Create Team Member Login">
      <div style={{fontSize:12.5,color:T.sub,marginBottom:16,lineHeight:1.5}}>This creates a working login immediately. Share the email and password with your team member, they can sign in at the staff portal right away.</div>
      <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Team member name"/>
      <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="name@naporbit.com" validate="email"/>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>PASSWORD</label>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input value={f.password} onChange={e=>set("password",e.target.value)} style={{flex:1,padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13.5,fontFamily:"monospace",boxSizing:"border-box"}}/>
        <Btn variant="ghost" size="sm" onClick={()=>set("password",genPw())}>🎲 Generate</Btn>
      </div>
      <Select label="Role" value={f.role} onChange={v=>set("role",v)} options={roleOpts}/>
      <div style={{padding:"11px 14px",background:T.amberSoft,borderRadius:11,fontSize:11.5,color:T.amber,fontWeight:600,lineHeight:1.5,marginBottom:16}}>Save these credentials, they'll also stay visible on the Team page for you to copy later.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={create} disabled={saving}>{saving?"Creating…":"Create login"}</Btn>
      </div>
    </Modal>);
  };
  const GmbModal=({client,onClose})=>{
    const ex=gmb[client.id]||{views:0,calls:0,directions:0,source:"manual",trend:[],posts:[],qa:[],photos:0,completeness:{category:false,description:false,hours:false,photo:false,services:false,attributes:false}};
    const[f,setF]=useState({views:ex.views,calls:ex.calls,directions:ex.directions,postTitle:"",postType:"update",postContent:"",postScheduled:false,postDate:"",qaQ:"",qaA:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`GMB Update · ${client.businessName}`} width={580}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>ENGAGEMENT METRICS (MANUAL)</div>
        <Badge type="manual"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <Input label="Views" value={f.views} onChange={v=>set("views",v)} type="number"/>
        <Input label="Calls" value={f.calls} onChange={v=>set("calls",v)} type="number"/>
        <Input label="Directions" value={f.directions} onChange={v=>set("directions",v)} type="number"/>
      </div>
      <div style={{background:T.surface2,borderRadius:14,padding:16,margin:"6px 0 14px"}}>
        <div style={{fontSize:11,fontWeight:800,color:T.violet,letterSpacing:".6px",marginBottom:12}}>📝 CREATE A GMB POST (OPTIONAL)</div>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>POST TYPE</label>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {[["update","📢 Update"],["offer","🎁 Offer"],["event","📅 Event"],["product","🛍️ Product"]].map(([v,label])=>(
            <button key={v} onClick={()=>set("postType",v)} style={{padding:"7px 13px",borderRadius:10,border:`1.5px solid ${f.postType===v?T.violet:T.line}`,background:f.postType===v?T.violetSoft:T.surface,color:f.postType===v?T.violet:T.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>{label}</button>))}
        </div>
        <Input label="Post title" value={f.postTitle} onChange={v=>set("postTitle",v)} placeholder="e.g. Summer Special, 10% Off"/>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>CONTENT</label>
        <textarea value={f.postContent} onChange={e=>set("postContent",e.target.value)} placeholder="What's this post about? This shows to the client." rows={2} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={f.postScheduled} onChange={e=>set("postScheduled",e.target.checked)} style={{width:15,height:15,accentColor:T.violet}}/>
          <span style={{fontSize:12.5,color:T.sub}}>Schedule for later (instead of publishing now)</span>
        </label>
        {f.postScheduled&&<Input label="Scheduled date" value={f.postDate} onChange={v=>set("postDate",v)} placeholder="e.g. Jul 15" style={{marginTop:10}}/>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Q&A Question (optional)" value={f.qaQ} onChange={v=>set("qaQ",v)} placeholder="Customer question"/>
        <Input label="Answer" value={f.qaA} onChange={v=>set("qaA",v)} placeholder="Your reply"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>R(async()=>{
          const trend=[...ex.trend,{m:new Date().toLocaleString("en-US",{month:"short"}),v:+f.views||0,c:+f.calls||0,d:+f.directions||0}];
          const newPost=f.postTitle?{title:f.postTitle,type:f.postType,content:f.postContent,date:f.postScheduled?(f.postDate||"soon"):today(),status:f.postScheduled?"scheduled":"live"}:null;
          const posts=newPost?[newPost,...ex.posts]:ex.posts;
          const qa=f.qaQ&&f.qaA?[...ex.qa,{q:f.qaQ,a:f.qaA,date:today()}]:ex.qa;
          await api.upsertGmb(client.id,{...ex,views:+f.views||0,calls:+f.calls||0,directions:+f.directions||0,source:"manual",trend,posts,qa});
          await addActivity(client.id,"gmb_update",newPost?`GMB post published: ${f.postTitle}`:`GMB data updated for ${client.businessName}`);
        },"GMB update saved").then(onClose)}>Save GMB Update</Btn>
      </div>
    </Modal>);
  };
  const AnalyticsModal=({client,onClose})=>{
    const ex=analytics[client.id]||{sessions:0,users:0,pageviews:0,avgTime:"0:00",source:"manual",trend:[]};
    const[f,setF]=useState({sessions:ex.sessions,users:ex.users,pageviews:ex.pageviews,avgTime:ex.avgTime});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`Analytics · ${client.businessName}`} width={520}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
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
        rows={filtered} cols={exportCols} exportName="naporbit-clients" exportTitle="Clients"/>
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
                  <div style={{fontSize:12,color:T.sub}}>{c.name} · {c.city||"–"}{c.state?", "+c.state:""} · {c.category||"–"}</div>
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
    // Agents reach ClientDetail only for clients assigned to them (clients list is pre-scoped),
    // so if an agent can open this client, they're allowed to edit it.
    const canEdit=isStaffMgr||(isAgent&&c.assignedAgentId===user.id);
    // Per-action permissions. Staff/managers have all; agents limited by their granted perms.
    const ap=user.perms||{listings:true,nap:true,logEdit:true,gmb:true};
    const can=(action)=>isStaffMgr||(isAgent&&c.assignedAgentId===user.id&&ap[action]!==false);
    const fmtDT=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"";
    return(<div>
      {c.status==="suspended"&&<Card style={{marginBottom:16,background:T.redSoft,border:`1px solid ${T.red}33`}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>⏸</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:T.red}}>Account suspended</div>
            <div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.6}}>
              {c.suspendedAt&&<>Suspended on <b>{fmtDT(c.suspendedAt)}</b></>}{c.suspendedBy&&<> by <b>{c.suspendedBy}</b></>}.
              {c.suspendReason?<><br/>Reason: {c.suspendReason}</>:<><br/>No reason recorded.</>}
            </div>
          </div>
        </div>
      </Card>}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,padding:"7px 14px",color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>← Clients</button>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?17:21,fontWeight:800}}>{c.businessName||c.name}</div>
        <Badge type={c.status==="suspended"?"suspended":"active"}/>{c.plan&&<Badge type="submitted" label={`${PLANS[c.plan].name} $${PLANS[c.plan].price}/mo`}/>}
      </div>
      {(canEdit||can("gmb")||can("nap")||can("logEdit")||can("listings"))&&<div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"clientForm",client:c})}>✏️ Edit Info</Btn>}
        {canImpersonate&&<Btn variant="soft" size="sm" onClick={()=>{audit("client.impersonate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});setViewAs(c.id);}}>👁️ Open Account (read-only)</Btn>}
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>🔗 Integrations</Btn>}
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"analytics",client:c})}>📈 Update Analytics</Btn>}
        {c.plan==="gmb"&&can("gmb")&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>📍 Update GMB</Btn>}
        {c.plan==="gmb"&&isStaffMgr&&<Btn variant="soft" size="sm" onClick={()=>{const month=new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"});setConfirm({title:"Mark report as sent?",msg:`Confirm you've emailed the ${month} GMB report to ${c.reportEmail||c.email}. The client will see "Report sent for ${month}".`,yes:"Mark sent",onYes:()=>R(async()=>{await api.patchProfile(c.id,{reportSentMonth:month});await audit("report.sent",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name,detail:month});await addActivity(c.id,"gmb_update",`Monthly report sent for ${month}`);},"Report marked as sent")});}}>📤 Mark Report Sent</Btn>}
        {isStaffMgr&&(c.status==="active"?
          <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"suspend",client:c})}>⏸ Suspend</Btn>:
          <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.patchProfile(c.id,{status:"active",suspendedAt:null,suspendReason:null,suspendedBy:null});await audit("client.reactivate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client reactivated")}>▶ Reactivate</Btn>)}
        {isAdmin&&!c.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Delete client?",msg:`Move ${c.businessName||c.name} to Trash? Recoverable for 30 days, then permanently removed with all their listings.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteUser(c.id);await audit("client.delete",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client moved to Trash").then(()=>{setPage("clients");setSelClient(null);})})}>🗑 Delete</Btn>}
        {c.protected&&<span style={{fontSize:11,color:T.faint,alignSelf:"center"}}>🔒 Demo account (protected)</span>}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:18}}>
        <Card><SectionTitle>Business Info</SectionTitle>
          {[["Owner",c.name],["Email",c.email],["Phone",c.phone],["Address",`${c.address||"–"}${c.city?", "+c.city:""}${c.state?", "+c.state:""}`],["Website",c.website||"–"],["Category",c.category||"–"],["GA4 ID",c.gaId||"Not connected"],["GBP ID",c.gbpId||"Not connected"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{fontSize:12.5,color:T.faint,fontWeight:700}}>{k}</span><span style={{fontSize:12.5,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{v}</span>
            </div>))}
        </Card>
        <Card><SectionTitle>NAP Consistency</SectionTitle>
          <div style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,textAlign:"center",padding:"8px 0",color:nap>=90?T.green:nap>=70?T.amber:T.red}}>{nap}%</div>
          {can("nap")||can("logEdit")?<>
          {can("nap")&&<><input type="range" min="0" max="100" value={nap} onChange={e=>setNap(+e.target.value)} style={{width:"100%",accentColor:T.brand}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>setModal({type:"napConfirm",client:c,newScore:nap})}>Save NAP Score</Btn></>}
          {can("logEdit")&&<button onClick={()=>setModal({type:"logEdit",client:c})} style={{width:"100%",marginTop:10,padding:"11px 0",background:T.redSoft,border:"none",borderRadius:11,color:T.red,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:FONT_B}}>🛡️ Log Unauthorized Edit + Revert</button>}</>:
          <div style={{fontSize:12,color:T.faint,textAlign:"center"}}>View only</div>}
        </Card>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Listings ({cl.length})</div>
          {can("listings")&&<Btn size="sm" onClick={()=>setModal({type:"addListing",clientId:c.id})}>+ Add Listing</Btn>}
        </div>
        {cl.length===0?<Empty icon="📋" title="No listings yet" sub="Add the first directory submission."/>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cl.map(d=>(<div key={d.id} style={{border:`1px solid ${d.actionNeeded?T.amber:T.line}`,borderRadius:13,padding:"14px 16px",background:d.actionNeeded?T.amberSoft:T.surface}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13.5,fontWeight:800}}>{d.directory}</span>
                <Badge type={d.status}/>
                {d.napMatch&&d.napMatch!=="–"&&<Badge type={d.napMatch}/>}
                {d.da>0&&<span style={{fontSize:11,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.faint}}>DA {d.da}</span>}
                {d.liveLink&&<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12,fontWeight:700,textDecoration:"none"}}>View ↗</a>}
              </div>
              {can("listings")&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"updateListing",listing:d,clientId:c.id})}>Update</Btn>}
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
    // Agents only see listings for clients assigned to them; staff see all.
    const scopedIds=new Set(clients.map(c=>c.id));
    const scopedFlat=isAgent?flat.filter(l=>scopedIds.has(l.clientId)):flat;
    const withNames=scopedFlat.map(l=>({...l,_name:clients.find(c=>c.id===l.clientId)?.businessName||"?"}));
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
        rows={filtered} cols={exportCols} exportName="naporbit-listings" exportTitle="All Listings"/>
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
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.da||"–"}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="–"?T.faint:T.green,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="–"?<span style={{fontSize:11,color:T.faint}}>–</span>:<Badge type={d.napMatch}/>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.actionNeeded?<span title={d.actionNote} style={{fontSize:14}}>⚠️</span>:<span style={{fontSize:11,color:T.faint}}>–</span>}</td>
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

  const[teamView,setTeamView]=useState(null); // staff member whose logs are open
  // Staff credentials row: email + password with show/copy. Visible to super-admin/manager only.
  const CredsRow=({m})=>{
    const[show,setShow]=useState(false);
    const copy=(txt,label)=>{try{navigator.clipboard.writeText(txt);toast(`${label} copied`);}catch{toast("Copy failed","info");}};
    const Field=({label,value,mono})=>(
      <div style={{flex:"1 1 200px"}}>
        <div style={{fontSize:10,fontWeight:800,color:T.faint,letterSpacing:".5px",marginBottom:4}}>{label}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <code style={{flex:1,fontSize:12.5,fontFamily:mono?"monospace":FONT_B,background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,padding:"7px 10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</code>
          <button onClick={()=>copy(value,label)} title="Copy" style={{border:"none",background:T.surface2,borderRadius:8,padding:"7px 9px",cursor:"pointer",fontSize:12}}>📋</button>
        </div>
      </div>
    );
    return(<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10.5,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>🔑 LOGIN CREDENTIALS{m.createdByRole?` · created by ${m.createdByRole}`:""}</span>
        <button onClick={()=>setShow(s=>!s)} style={{border:"none",background:"none",color:T.brand,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>{show?"Hide":"Show"}</button>
      </div>
      {show&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Field label="EMAIL" value={m.email}/>
        <Field label="PASSWORD" value={m.staffPassword} mono/>
      </div>}
    </div>);
  };
  const Team=()=>{
    // Managers see agents + themselves (not super-admins), and cannot manage grants/removal.
    const visibleStaff=isAdmin?staff:staff.filter(m=>m.role==="agent"||m.id===user.id);
    if(teamView){
      const m=staff.find(x=>x.id===teamView);
      if(!m){setTeamView(null);return null;}
      // This member's actions across the platform (audit + activity they performed).
      const memberActs=activity.filter(a=>a.by===m.name);
      const assigned=allClients.filter(c=>c.assignedAgentId===m.id);
      return(<div>
        <button onClick={()=>setTeamView(null)} style={{background:"none",border:"none",color:T.brand,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14,fontFamily:FONT_B}}>← Back to Team</button>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
          <div><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>{m.name}</div><div style={{fontSize:13,color:T.sub}}>{m.email} · {m.role==="manager"?"Manager":m.role==="super_admin"?"Super Admin":"Agent"}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
          <StatCard label="Actions logged" value={memberActs.length} icon="⚡" color={T.brand} soft={T.brandSoft}/>
          {m.role==="agent"&&<StatCard label="Clients assigned" value={assigned.length} icon="👥" color={T.blue} soft={T.blueSoft}/>}
          <StatCard label="Last active" value={memberActs[0]?.date?memberActs[0].date.split(" at ")[0]:"–"} icon="🕐" color={T.violet} soft={T.violetSoft}/>
        </div>
        {m.role==="agent"&&<Card style={{marginBottom:16}}>
          <SectionTitle sub="Clients this agent can work on">Assigned clients</SectionTitle>
          {assigned.length===0?<div style={{fontSize:12.5,color:T.faint}}>No clients assigned yet.</div>:
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{assigned.map(c=><span key={c.id} style={{fontSize:12,fontWeight:700,background:T.surface2,padding:"5px 11px",borderRadius:20}}>{c.businessName||c.name}</span>)}</div>}
          {isStaffMgr&&<Btn variant="ghost" size="sm" style={{marginTop:12}} onClick={()=>setModal({type:"assign",agent:m})}>Manage assignments</Btn>}
        </Card>}
        <Card>
          <SectionTitle sub={`Everything ${m.name} has done on the platform`}>Activity log</SectionTitle>
          {memberActs.length===0?<Empty icon="📭" title="No activity yet" sub="This member's actions will appear here."/>:
            memberActs.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:12,padding:"11px 8px",borderBottom:i<memberActs.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date}{a.clientId&&a.clientId!=="__internal"?` · ${clients.find(c=>c.id===a.clientId)?.businessName||""}`:""}</div></div>
            </div>))}
        </Card>
      </div>);
    }
    return(<div>
      <PageHead isMobile={isMobile} title="Team" sub={`${visibleStaff.length} team members`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"team"})}>+ Add Member</Btn>}/>
      {visibleStaff.map((m,i)=>(<Card key={m.id} hover className="fadeUp" style={{animationDelay:`${i*60}ms`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",gap:13,alignItems:"center"}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:m.role==="super_admin"?`linear-gradient(135deg,${T.brand},${T.violet})`:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
            <div><div style={{fontSize:14,fontWeight:800}}>{m.name}</div><div style={{fontSize:12,color:T.sub}}>{m.email}</div></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
            {m.role==="agent"&&<span style={{fontSize:11,color:T.sub,fontWeight:700,background:T.blueSoft,padding:"3px 9px",borderRadius:20}}>{allClients.filter(c=>c.assignedAgentId===m.id).length} clients</span>}
            <Btn variant="ghost" size="sm" onClick={()=>setTeamView(m.id)}>View logs</Btn>
            {isStaffMgr&&m.role==="agent"&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"assign",agent:m})}>Assign clients</Btn>}
            {isAdmin&&m.role==="manager"&&<Btn variant={m.canImpersonate?"green":"ghost"} size="sm" onClick={()=>R(async()=>{await api.setImpersonateGrant(m.id,!m.canImpersonate);await audit("grant.impersonate",{targetType:"staff",targetId:m.id,targetName:m.name,detail:m.canImpersonate?"revoked":"granted"});},m.canImpersonate?"Account access revoked":"Account access granted")}>{m.canImpersonate?"✓ Can view accounts":"Allow account access"}</Btn>}
            {isAdmin&&m.id!==user.id&&m.role!=="super_admin"&&!m.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Remove team member?",msg:`Remove ${m.name} from the team?`,danger:true,yes:"Remove",onYes:()=>R(async()=>api.deleteUser(m.id),`${m.name} removed`)})}>Remove</Btn>}
            {m.protected&&<span style={{fontSize:11,color:T.faint}}>🔒 Demo</span>}
          </div>
        </div>
        {m.staffPassword&&!m.protected&&<CredsRow m={m}/>}
      </Card>))}
      <Card style={{background:T.surface2,boxShadow:"none",border:`1px dashed ${T.line}`}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ROLE PERMISSIONS</div>
        {[["Super Admin",T.brand,"Full access, clients, listings, GMB, team, finance, settings, and read-only account view"],["Manager",T.amber,"Clients, listings, GMB, assign clients to agents, view team logs. Account view only if granted."],["Agent",T.blue,"Update listings only for clients a manager has assigned to them."]].map(([r,c,p])=>(
          <div key={r} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:3,background:c,marginTop:5,flexShrink:0}}/><div style={{fontSize:12.5}}><b style={{color:c}}>{r}:</b> <span style={{color:T.sub}}>{p}</span></div></div>))}
      </Card>
    </div>);
  };

  const Activity=()=>{
    const[search,setSearch]=useState("");
    const[typeF,setTypeF]=useState("all");
    const[byF,setByF]=useState("all");
    const[timeF,setTimeF]=useState("all");
    const types=[...new Set(activity.map(a=>a.type))];
    const people=[...new Set(activity.map(a=>a.by).filter(Boolean))];
    const inWindow=(dateStr)=>{
      if(timeF==="all")return true;
      const d=new Date(dateStr);if(isNaN(d))return true;
      const days=(Date.now()-d.getTime())/86400000;
      return timeF==="7"?days<=7:timeF==="30"?days<=30:timeF==="90"?days<=90:true;
    };
    let filtered=activity.filter(a=>{
      if(typeF!=="all"&&a.type!==typeF)return false;
      if(byF!=="all"&&a.by!==byF)return false;
      if(!inWindow(a.date))return false;
      if(search){const cn=clients.find(c=>c.id===a.clientId)?.businessName||"";if(!`${a.desc} ${a.by} ${cn}`.toLowerCase().includes(search.toLowerCase()))return false;}
      return true;
    });
    const cols=[
      {key:"date",label:"Date"},{key:"type",label:"Type"},{key:"desc",label:"Event"},
      {label:"Client",get:a=>clients.find(c=>c.id===a.clientId)?.businessName||"–"},{key:"by",label:"By"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Activity Log" sub="Every platform event, newest first"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search event, person, client…"
        filters={[
          {value:typeF,set:setTypeF,options:[{value:"all",label:"All types"},...types.map(t=>({value:t,label:t.replace(/_/g," ")}))]},
          {value:byF,set:setByF,options:[{value:"all",label:"All people"},...people.map(p=>({value:p,label:p}))]},
          {value:timeF,set:setTimeF,options:[{value:"all",label:"All time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"}]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-activity" exportTitle="Activity Log"/>
      <Card>
        {filtered.length===0?<Empty icon="📜" title="No matching activity" sub="Try a different search or filter."/>:
          filtered.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<filtered.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                <div style={{fontSize:13,fontWeight:600}}>{a.desc}</div>
                <div style={{fontSize:11,color:T.faint}}>{a.date}</div>
              </div>
              <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{clients.find(c=>c.id===a.clientId)?.businessName||"–"} · by {a.by}</div>
            </div>
          </div>))}
      </Card>
    </div>);
  };

  const Finance=()=>{
    const[search,setSearch]=useState("");
    const[statusF,setStatusF]=useState("all");
    const[planF,setPlanF]=useState("all");
    // Lifecycle status per client: cancelled > paused > active. Uses real profile fields.
    const lifecycle=(c)=>{
      if(c.status==="suspended")return "paused";
      if(c.cancelAtPeriodEnd||c.canceledAt)return c.plan?"cancelling":"cancelled";
      if(c.plan&&c.status==="active")return "active";
      return "no plan";
    };
    const monthsActive=(c)=>{
      if(!c.createdAt)return 1;
      const start=new Date(c.createdAt);const end=c.canceledAt?new Date(c.canceledAt):new Date();
      return Math.max(1,Math.round((end-start)/2629800000));
    };
    const priceOf=(c)=>PLANS[c.plan]?.price||0;
    const ltv=(c)=>priceOf(c)*monthsActive(c);
    const rows=clients.map(c=>({...c,_status:lifecycle(c),_ltv:ltv(c),_months:monthsActive(c)}));
    // Metrics
    const activeClients=rows.filter(r=>r._status==="active"||r._status==="cancelling");
    const activeMRR=activeClients.reduce((s,c)=>s+priceOf(c),0);
    const thisMonth=new Date().getMonth();
    const newThisMonth=rows.filter(c=>c.createdAt&&new Date(c.createdAt).getMonth()===thisMonth).length;
    const churnedThisMonth=rows.filter(c=>c.canceledAt&&new Date(c.canceledAt).getMonth()===thisMonth).length;
    const churnedMRR=rows.filter(c=>c._status==="cancelled").reduce((s,c)=>s+priceOf(c),0);
    let filtered=rows;
    if(statusF!=="all")filtered=filtered.filter(r=>r._status===statusF);
    if(planF!=="all")filtered=filtered.filter(r=>r.plan===planF);
    if(search)filtered=filtered.filter(r=>`${r.businessName} ${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
    const fmtDate=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"–";
    const statusColor={active:T.green,cancelling:T.amber,cancelled:T.red,paused:T.faint,"no plan":T.faint};
    const cols=[
      {key:"businessName",label:"Business"},{key:"email",label:"Email"},
      {key:"plan",label:"Plan",get:c=>PLANS[c.plan]?.name||"None"},
      {label:"Price",get:c=>`$${priceOf(c)}`},
      {label:"Status",get:c=>c._status},
      {label:"Signed Up",get:c=>fmtDate(c.createdAt)},
      {label:"Cancelled/Paused",get:c=>fmtDate(c.canceledAt)},
      {label:"Months",get:c=>c._months},{label:"LTV",get:c=>`$${c._ltv}`},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Finance" sub="Full subscription lifecycle, revenue, and churn"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Active MRR" value={`$${activeMRR}`} sub={`${activeClients.length} paying`} icon="💵" color={T.green} soft={T.greenSoft}/>
        <StatCard label="New This Month" value={newThisMonth} sub="signups" icon="📈" color={T.brand} soft={T.brandSoft}/>
        <StatCard label="Churned This Month" value={churnedThisMonth} sub="cancellations" icon="📉" color={T.red} soft={T.redSoft}/>
        <StatCard label="Lost MRR" value={`$${churnedMRR}`} sub="from cancelled" icon="⚠️" color={T.amber} soft={T.amberSoft}/>
      </div>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search business, email…"
        filters={[
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"cancelling",label:"Cancelling"},{value:"cancelled",label:"Cancelled"},{value:"paused",label:"Paused"},{value:"no plan",label:"No plan"}]},
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-finance" exportTitle="Finance Lifecycle"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="💰" title="No clients match" sub="Adjust filters."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
          <thead><tr>{["Business","Plan","Status","Signed Up","Cancelled/Paused","Months","LTV"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(c=>(<tr key={c.id} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c.businessName||c.name}<br/><span style={{fontSize:11,color:T.faint,fontWeight:400}}>{c.email}</span></td>
            <td style={{padding:"11px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}>{PLANS[c.plan]?.name||"–"}<br/><span style={{fontSize:11,color:T.faint}}>${priceOf(c)}/mo</span></td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><span style={{fontSize:11,fontWeight:800,color:statusColor[c._status],background:statusColor[c._status]+"1a",padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{c._status}</span></td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.createdAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.canceledAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c._months}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:T.green,borderBottom:`1px solid ${T.line}`}}>${c._ltv}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

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
      <PageHead isMobile={isMobile} title="Audit Trail" sub="Every sensitive staff action, who did what, and when"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search staff, action, target…"
        filters={[{value:actionF,set:setActionF,options:[{value:"all",label:"All actions"},...actions.map(a=>({value:a,label:a}))]}]}
        rows={filtered} cols={cols} exportName="naporbit-audit" exportTitle="Audit Trail"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="🛡️" title="No audit records yet" sub="Staff actions like edits, deletes, and suspensions are logged here."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["When","Staff","Action","Target","Detail"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a=>(<tr key={a.id} className="hoverRow">
            <td style={{padding:"10px 12px",fontSize:11.5,color:T.faint,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</td>
            <td style={{padding:"10px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}><b>{a.actorName}</b><br/><span style={{fontSize:10.5,color:T.faint}}>{a.actorRole}</span></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={a.action.includes("delete")?"rejected":a.action.includes("suspend")?"pending":"submitted"} label={a.action}/></td>
            <td style={{padding:"10px 12px",fontSize:12.5,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{a.targetName||"–"}</td>
            <td style={{padding:"10px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{a.detail||"–"}</td>
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
    const s={essentials:"",growth:"",gmb:"",pubKey:"",secretKey:"",webhookSecret:"",portalLink:"",...(settings?.stripe||{})};
    const[f,setF]=useState(s);
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    // Control-panel config: notification emails, report recipients, prices, toggles. UI-editable, DB-stored.
    const cfg0={
      notifyEmail:"info@naporbit.com",
      reportEmails:"info@naporbit.com, naporbit@gmail.com",
      priceEssentials:PLANS.essentials.price, priceGrowth:PLANS.growth.price, priceGmb:PLANS.gmb.price,
      notifySignup:true, notifyCancel:true, notifyPlanChange:true, notifyAgentEdit:true, monthlyReport:true,
      allowSignups:true,
      livePlanEssentials:true, livePlanGrowth:true, livePlanGmb:true,
      ...(settings?.config||{})
    };
    const[c,setC]=useState(cfg0);
    const setCfg=(k,v)=>setC(x=>({...x,[k]:v}));
    const webhookUrl=(typeof window!=="undefined"?window.location.origin:"https://rankorbit-platform.vercel.app")+"/api/stripe-webhook";
    const stripeLive=!!(s.secretKey&&s.webhookSecret&&s.essentials);
    const Toggle=({label,k,sub})=>(
      <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"11px 0",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
        <div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{label}</div>{sub&&<div style={{fontSize:11,color:T.faint,marginTop:2}}>{sub}</div>}</div>
        <input type="checkbox" checked={!!c[k]} onChange={e=>setCfg(k,e.target.checked)} style={{width:17,height:17,accentColor:T.brand,flexShrink:0}}/>
      </label>
    );
    return(<div>
      <PageHead isMobile={isMobile} title="Settings" sub="Control panel, payments, and platform configuration"/>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Change these anytime, no developer needed. Saved to your database and applied across the platform.">Control Panel</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:10}}>NOTIFICATION EMAILS</div>
            <Input label="Event notifications to" value={c.notifyEmail} onChange={v=>setCfg("notifyEmail",v)} placeholder="info@naporbit.com"/>
            <Input label="Monthly report recipients (comma-separated)" value={c.reportEmails} onChange={v=>setCfg("reportEmails",v)} placeholder="info@naporbit.com, naporbit@gmail.com"/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:10}}>PLAN PRICES ($ / month)</div>
            <div style={{display:"flex",gap:8}}>
              <Input label="Essentials" type="number" value={c.priceEssentials} onChange={v=>setCfg("priceEssentials",v)}/>
              <Input label="Growth" type="number" value={c.priceGrowth} onChange={v=>setCfg("priceGrowth",v)}/>
              <Input label="GMB Pro" type="number" value={c.priceGmb} onChange={v=>setCfg("priceGmb",v)}/>
            </div>
            <div style={{fontSize:11,color:T.faint,lineHeight:1.5,marginTop:2}}>Note: these update what clients see. Your actual Stripe charge is set by the Payment Link, keep them in sync.</div>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>LIVE PLANS (shown on website, signup & billing)</div>
          <Toggle label="Essentials plan is live" k="livePlanEssentials"/>
          <Toggle label="Growth plan is live" k="livePlanGrowth"/>
          <Toggle label="GMB Pro plan is live" k="livePlanGmb" sub="Turn off to launch it later. Existing clients on a hidden plan keep it."/>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>NOTIFICATIONS & TOGGLES</div>
          <Toggle label="Email on new signup" k="notifySignup"/>
          <Toggle label="Email on cancellation" k="notifyCancel"/>
          <Toggle label="Email on plan change" k="notifyPlanChange"/>
          <Toggle label="Alert managers when an agent edits/deletes a listing" k="notifyAgentEdit"/>
          <Toggle label="Send monthly finance report" k="monthlyReport" sub="Signups, revenue, cancellations to report recipients"/>
          <Toggle label="Allow public client signups" k="allowSignups" sub="Turn off to make the platform invite-only"/>
        </div>
        <Btn style={{marginTop:16}} onClick={()=>R(async()=>{await api.saveSettings({...settings,stripe:f,config:c});await audit("settings.update",{targetType:"settings",detail:"control panel"});},"Control panel saved")}>Save Control Panel</Btn>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Route each notification type to one or more email addresses. Separate multiple emails with commas. Toggle any type off to stop sending it.">Notifications & Email Routing</SectionTitle>
        <div style={{padding:"12px 15px",background:T.amberSoft,borderRadius:12,marginBottom:16,fontSize:12,color:T.amber,fontWeight:600,lineHeight:1.5}}>Email delivery activates once your sending domain (naporbit.com) is verified. Until then these settings are saved but no emails send.</div>
        {[
          {k:"routeSignup",label:"New client signup",desc:"When a client creates an account"},
          {k:"routeSuspend",label:"Client suspension",desc:"When a client is suspended or reactivated"},
          {k:"routeOnboard",label:"New client onboarding",desc:"When a client completes their profile / picks a plan"},
          {k:"routeCancel",label:"Cancellation",desc:"When a client cancels their subscription"},
          {k:"routeBdm",label:"BDM / call bookings",desc:"When a client books a call"},
          {k:"routeAgentEdit",label:"Agent edit alerts",desc:"When an agent edits or deletes a listing"},
          {k:"routeSystem",label:"System alerts",desc:"Errors, payment failures, and other platform alerts"},
          {k:"routeReport",label:"Monthly finance report",desc:"Signups, revenue, churn summary"},
        ].map((n,idx,arr)=>(
          <div key={n.k} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.2fr auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:idx<arr.length-1?`1px solid ${T.line}`:"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:800}}>{n.label}</div>
              <div style={{fontSize:11,color:T.faint,marginTop:2}}>{n.desc}</div>
            </div>
            <input value={c[n.k]??""} onChange={e=>setCfg(n.k,e.target.value)} placeholder="email@naporbit.com, other@…" style={{padding:"9px 13px",background:c[n.k+"On"]===false?T.surface2:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:12.5,fontFamily:FONT_B,boxSizing:"border-box",width:"100%",opacity:c[n.k+"On"]===false?.5:1}}/>
            <button onClick={()=>setCfg(n.k+"On",c[n.k+"On"]===false?true:false)} style={{padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:FONT_B,fontWeight:800,fontSize:11.5,background:c[n.k+"On"]===false?T.surface2:T.greenSoft,color:c[n.k+"On"]===false?T.faint:T.green,whiteSpace:"nowrap"}}>{c[n.k+"On"]===false?"Off":"On"}</button>
          </div>
        ))}
        <Btn style={{marginTop:16}} onClick={()=>R(async()=>{await api.saveSettings({...settings,stripe:f,config:c});await audit("settings.update",{targetType:"settings",detail:"notification routing"});},"Notification settings saved")}>Save Notification Settings</Btn>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Paste one recurring Payment Link per plan. Client Subscribe/Upgrade buttons open these with the client tagged, so the webhook can auto-activate their plan after payment.">Stripe Payment Links</SectionTitle>
        <div style={{padding:"14px 16px",background:T.blueSoft,borderRadius:12,marginBottom:18,fontSize:12.5,color:T.blue,lineHeight:1.7}}>
          <div style={{fontWeight:800,marginBottom:6}}>Setup, one time, ~10 min:</div>
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

  // Read-only impersonation: show the selected client's dashboard behind a banner, no editing.
  if(viewAs){
    const c=allClients.find(x=>x.id===viewAs);
    if(!c){setViewAs(null);return null;}
    return(<>
      <div style={{position:"sticky",top:0,zIndex:1000,background:`linear-gradient(90deg,${T.amber},#E8890B)`,color:"#fff",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,boxShadow:SHADOW}}>
        <div style={{fontSize:13,fontWeight:700}}>👁️ Viewing {c.businessName||c.name}'s account (read-only). Changes are disabled.</div>
        <button onClick={()=>setViewAs(null)} style={{background:"rgba(255,255,255,.25)",border:"none",color:"#fff",padding:"6px 16px",borderRadius:8,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,fontSize:12.5}}>Exit view</button>
      </div>
      <div>
        <ClientDashboard user={c} data={data} reload={reload} onLogout={()=>setViewAs(null)} impersonating/>
      </div>
    </>);
  }

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={roleBadge} brandTag="ADMIN">
    {page==="overview"&&<Overview/>}
    {page==="clients"&&<Clients/>}
    {page==="clientDetail"&&<ClientDetail/>}
    {page==="listings"&&<AllListings/>}
    {page==="gmb"&&<GmbAdmin/>}
    {page==="team"&&<Team/>}
    {page==="activity"&&<Activity/>}
    {page==="finance"&&<Finance/>}
    {page==="audit"&&<AuditTrail/>}
    {page==="trash"&&<Trash/>}
    {page==="settings"&&<Settings/>}
  </Shell>
  {modal?.type==="clientForm"&&<ClientFormModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="team"&&<TeamModal onClose={()=>setModal(null)}/>}
  {modal?.type==="assign"&&<AssignModal agent={modal.agent} onClose={()=>setModal(null)}/>}
  {modal?.type==="suspend"&&<SuspendModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="napConfirm"&&<NapConfirmModal client={modal.client} newScore={modal.newScore} onClose={()=>setModal(null)}/>}
  {modal?.type==="logEdit"&&<LogEditModal client={modal.client} onClose={()=>setModal(null)}/>}
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
