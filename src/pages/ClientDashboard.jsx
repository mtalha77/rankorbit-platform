// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { downloadBlob, openExternalFile } from "../lib/export";
import { PLANS, CATEGORIES, US_CA_STATES, planLive } from "../lib/constants";
import { nextMonthFirst, actIcon, clientBy } from "../lib/helpers";
import { Badge, Card, Btn, Input, Select, Confirm, StatCard, ChartTip, SectionTitle, Empty, PageHead } from "../components/atoms";
import { Orbit } from "../components/Orbit";
import Shell from "../components/Shell";
import UserManual from "./UserManual";
import { useWindowSize, useToast } from "../hooks";

export default function ClientDashboard({user:userProp,data,reload,onLogout,impersonating=false}){
  const[page,setPage]=useState("home");
  const[toast,Toasts]=useToast();
  const[showManual,setShowManual]=useState(false);
  const[confirm,setConfirm]=useState(null);
  const[stripeConfigured,setStripeConfigured]=useState(null); // null=loading, true/false
  const[invoices,setInvoices]=useState([]);
  const w=useWindowSize();const isMobile=w<820;
  // Async action runner: run fn, optionally toast, then refresh data. Used by billing actions.
  // Returns true on success, false on failure (and toasts the error).
  const R=async(fn,msg)=>{try{await fn();if(msg)toast(msg);await reload();return true;}catch(e){toast(e.message||"Something went wrong","info");return false;}};
  // Always use the freshest copy of the profile (data.users is refreshed by reload()),
  // so profile edits (e.g. completing the business profile) reflect immediately.
  const user=(data.users||[]).find(u=>u.id===userProp.id)||userProp;
  // Resume plan intent from landing (?plan= or sessionStorage) and checkout return (?billing=success).
  useEffect(()=>{
    if(impersonating)return;
    let planIntent=null;
    let billingFlag=null;
    try{
      const sp=new URLSearchParams(window.location.search);
      planIntent=sp.get("plan");
      billingFlag=sp.get("billing");
      if(!planIntent)planIntent=sessionStorage.getItem("ro_pending_plan");
      if(planIntent&&["essentials","growth","gmb"].includes(planIntent)){
        try{sessionStorage.setItem("ro_pending_plan",planIntent);}catch{}
        setPage("billing");
      }
      if(billingFlag==="success"){
        setPage("billing");
        toast("Payment received — your plan will activate in a moment","success");
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        reload();
      }else if(billingFlag==="cancel"){
        setPage("billing");
        toast("Checkout canceled — pick a plan whenever you're ready","info");
      }else if(billingFlag==="portal"){
        setPage("billing");
        reload();
      }
      if(planIntent||billingFlag){
        const url=new URL(window.location.href);
        url.searchParams.delete("plan");
        url.searchParams.delete("billing");
        window.history.replaceState(null,"",url.pathname+(url.search||""));
      }
    }catch{}
  },[user.id,impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
  // Detect whether Stripe Checkout is configured (server env).
  useEffect(()=>{(async()=>{const s=await api.billingStatus();setStripeConfigured(!!s.configured);})();},[]);
  // Load invoices: sync from Stripe first (backfills if webhooks missed), then show local rows.
  useEffect(()=>{
    if(page!=="billing"||!user?.id||impersonating)return;
    let cancelled=false;
    (async()=>{
      const synced=await api.syncInvoices();
      if(cancelled)return;
      if(synced.invoices?.length){setInvoices(synced.invoices);return;}
      const rows=await api.listInvoices(user.id);
      if(!cancelled)setInvoices(rows||[]);
    })();
    return()=>{cancelled=true;};
  },[page,user.id,user.plan,user.subscriptionStatus,impersonating]);
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
    {id:"analytics",icon:"📈",label:"Analytics"},
    {id:"billing",icon:"💳",label:"Plan & Billing"},
    {id:"call",icon:"📞",label:"Book a Call"},
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
    {done:!!(user.businessName&&user.phone&&user.city),label:"Complete your business profile",action:()=>setPage("billing")},
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
    // Live when server has Stripe secret + price IDs. Falls back to demo when not configured.
    const stripeReady=stripeConfigured===true;
    const demoMode=stripeConfigured===false;
    const goStripe=async(planId)=>{
      try{sessionStorage.setItem("ro_pending_plan",planId);}catch{}
    if(demoMode){
        // DEMO / local: activate without charge when Stripe env is not set.
        if(api.mode!=="supabase"){
          await R(async()=>{await api.patchProfile(user.id,{plan:planId,status:"active",currentPeriodEnd:nextMonthFirst(),subscriptionStatus:"active",cancelAtPeriodEnd:false});},`${PLANS[planId].name} activated (demo mode, no charge)`);
          try{sessionStorage.removeItem("ro_pending_plan");}catch{}
          return;
        }
        const r=await api.demoActivatePlan(planId);
        if(r.error){toast(r.error,"info");return;}
        if(r.local){
          await R(async()=>{await api.patchProfile(user.id,{plan:planId,status:"active",currentPeriodEnd:nextMonthFirst(),subscriptionStatus:"active",cancelAtPeriodEnd:false});},`${PLANS[planId].name} activated (demo mode, no charge)`);
        }else{
          await R(async()=>{},`${PLANS[planId].name} activated (demo mode, no charge)`);
        }
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        return;
      }
      if(stripeConfigured!==true){
        toast("Checking billing setup…","info");
        return;
      }
      // Existing Stripe subscription → change plan in place; otherwise Checkout Session.
      if(user.stripeSubscriptionId){
        const r=await api.changeSubscription(planId);
        if(r.error){toast(r.error,"info");return;}
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        await R(async()=>{},`Switched to ${PLANS[planId].name}`);
        return;
      }
      const r=await api.createCheckout(planId);
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    const doCancel=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:true,canceledAt:new Date().toISOString(),currentPeriodEnd:user.currentPeriodEnd||nextMonthFirst()});
        },"Subscription set to cancel at period end");
        if(!ok)throw new Error("Cancel failed");
        return;
      }
      const r=await api.cancelSubscription({resume:false});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription set to cancel at period end");
      await reload();
    };
    const doResume=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:false,canceledAt:null});
        },"Subscription resumed, you're all set");
        if(!ok)throw new Error("Resume failed");
        return;
      }
      const r=await api.cancelSubscription({resume:true});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription resumed, you're all set");
      await reload();
    };
    const openPortal=async()=>{
      if(!stripeReady){toast("Card management opens in Stripe once billing is connected","info");return;}
      const r=await api.createPortalSession();
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    const periodLabel=user.currentPeriodEnd
      ? new Date(user.currentPeriodEnd).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      : "the end of your billing period";
    const nextChargeLabel=user.currentPeriodEnd
      ? new Date(user.currentPeriodEnd).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      : "on the 1st of next month";
    // Require core business details before a plan can be selected (captures data upfront, esp. Google signups).
    const profileComplete=!!(user.businessName&&user.phone&&user.address&&user.city&&user.state&&user.category);
    const invoiceRows=invoices.length?invoices:null;
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
            <Badge type={user.subscriptionStatus==="past_due"?"pending":"active"}/>
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
            <div style={{fontSize:13,color:T.sub,marginTop:6,lineHeight:1.5}}>You keep full access until <b>{periodLabel}</b>. You won't be charged again.</div>
            <Btn variant="green" size="sm" style={{width:"100%",marginTop:12}} onClick={doResume}>Resume subscription</Btn>
          </>):(<>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>{nextChargeLabel}</div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically. Cancel before your renewal date to avoid the next charge, you keep access until the period ends.</div>
            <button onClick={()=>setConfirm({title:"Cancel subscription?",msg:`Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`,danger:true,yes:"Cancel at period end",onYes:doCancel})} style={{marginTop:12,background:"none",border:"none",color:T.faint,fontSize:11.5,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:FONT_B,padding:0}}>Cancel subscription</button>
          </>)}
        </Card>
      </div>)}
      <SectionTitle sub="Pick a plan to start, or upgrade anytime, secure checkout via Stripe">{user.plan?"Change Plan":"Choose Your Plan"}</SectionTitle>
      {demoMode&&<div style={{padding:"10px 14px",background:T.amberSoft,borderRadius:11,marginBottom:14,fontSize:12,color:T.amber,fontWeight:600}}>Demo mode: plans activate instantly with no payment. Real Stripe checkout goes live once billing keys are configured on the server.</div>}
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
              <Btn size="sm" style={{width:"100%",marginTop:10}} onClick={()=>goStripe(id)}>{demoMode?"Activate ":user.plan?"Switch to ":"Subscribe to "}{p.name} →</Btn>}
          </div>);
        })}
      </div>
      {user.plan&&(<Card style={{marginTop:20}}>
        <SectionTitle right={<Btn variant="ghost" size="sm" onClick={openPortal}>💳 Manage billing</Btn>}>Invoice History</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
            <thead><tr>{["Date","Description","Card","Amount","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {invoiceRows?invoiceRows.map(inv=>{
                const dt=inv.createdAt?new Date(inv.createdAt):new Date();
                const amt=((inv.amountCents||0)/100).toFixed(2);
                const last4=user.cardLast4||"••••";
                const paid=inv.status==="paid";
                return(<tr key={inv.id} className="hoverRow">
                  <td style={{padding:"12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{plan.name} plan · monthly</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{user.cardBrand||"Card"} •••• {last4}</td>
                  <td style={{padding:"12px",fontSize:13,fontWeight:800,borderBottom:`1px solid ${T.line}`}}>${amt}</td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={paid?"paid":"pending"}/></td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><button onClick={()=>{const u=inv.invoicePdf||inv.hostedInvoiceUrl;if(openExternalFile(u))return;toast("Open Manage billing to view invoices in Stripe","info");}} style={{background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>PDF ↓</button></td>
                </tr>);
              }):(
                <tr><td colSpan={6} style={{padding:"18px 12px",fontSize:13,color:T.sub}}>No invoices yet. They appear here after your first payment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.line}`,fontSize:11.5,color:T.faint,lineHeight:1.5}}>
          Your primary card shows above. Add or remove cards, and download official invoices, in <b>Manage billing</b> (secure Stripe portal). Card details are never stored on our servers.
        </div>
      </Card>)}
      <Card style={{marginTop:16}}>
        <SectionTitle sub="Download everything we hold about your account, profile, listings, and activity.">Your Data</SectionTitle>
        <Btn variant="ghost" size="sm" onClick={()=>{
          try{
            const mine={profile:user,listings:my,activity:myAct,invoices:invoices||[],exportedAt:new Date().toISOString()};
            downloadBlob(JSON.stringify(mine,null,2),`naporbit-my-data-${Date.now()}.json`,"application/json");
            toast("Your data downloaded");
          }catch(e){
            toast(e.message||"Download failed","info");
          }
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

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={planBadge} showLegalLinks>
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
  {confirm&&<Confirm data={confirm} onClose={()=>setConfirm(null)}/>}
  <Toasts/></>);
}

// First-login user manual + Help-button guide. Explains each section in plain language.
