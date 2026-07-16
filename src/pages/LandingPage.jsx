// ─── LANDING PAGE ────────────────────────────────────────────────────────────
import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, planLive } from "../lib/constants";
import { Btn } from "../components/atoms";
import CssIoButton from "../components/CssIoButton";
import CtaFillButton from "../components/CtaFillButton";
import { Orbit, MiniOrbit } from "../components/Orbit";
import { Reveal } from "../components/Reveal";
import { useWindowSize, useCounter } from "../hooks";

// Brand logo marks, all drawn in a single uniform tone so the set looks
// cohesive (like a professional "works with" logo strip), not a mismatched
// rainbow. Color passed in so AI nodes can tint violet, publishers slate.
function BrandMark({name,size=22,color}){
  const s=size, c=color;
  switch(name){
    case "Google": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 11v2.9h5.9c-.24 1.5-1.75 4.4-5.9 4.4-3.55 0-6.45-2.94-6.45-6.55S8.45 5.2 12 5.2c2.02 0 3.38.86 4.15 1.6l2.83-2.73C17.18 2.4 14.85 1.4 12 1.4 6.5 1.4 2.05 5.85 2.05 11.35S6.5 21.3 12 21.3c5.77 0 9.6-4.06 9.6-9.77 0-.66-.07-1.16-.16-1.66H12z"/></svg>);
    case "Apple": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.05 12.7c-.03-2.7 2.2-4 2.3-4.06-1.25-1.84-3.2-2.09-3.9-2.12-1.66-.17-3.24.97-4.08.97-.84 0-2.14-.95-3.52-.92-1.81.03-3.48 1.05-4.41 2.67-1.88 3.27-.48 8.1 1.35 10.76.9 1.3 1.97 2.76 3.38 2.71 1.35-.05 1.86-.87 3.5-.87s2.1.87 3.53.84c1.46-.03 2.38-1.32 3.27-2.63 1.03-1.5 1.46-2.96 1.48-3.04-.03-.01-2.84-1.09-2.87-4.32M14.6 4.6c.75-.9 1.25-2.16 1.11-3.41-1.08.04-2.38.72-3.15 1.62-.69.8-1.29 2.08-1.13 3.3 1.2.1 2.42-.61 3.17-1.51"/></svg>);
    case "Yelp": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M13.4 12.9l3.9-1.9c.5-.2.6-.9.3-1.4-.1-.1-.2-.2-.3-.3l-3.4-2.2c-.5-.3-1.1-.2-1.4.3-.1.2-.2.4-.2.6l.1 4.3c0 .5.4.9.9.9.1 0 .1 0 .1-.2m-1.9 1.7l-4.3-.4c-.5 0-1 .3-1 .9 0 .2 0 .3.1.5l1.9 3.6c.3.5.9.6 1.4.4.2-.1.3-.3.4-.5l1.9-3.9c.2-.5 0-1-.5-1.2 0 .1-.1.1-.2.1M11 11.6l.6-6.9c.1-.6-.4-1.1-1-1.2h-.4L6.4 4.7c-.6.2-.9.8-.7 1.4 0 .2.1.3.2.4l4 4.9c.4.5 1 .5 1.4.1.1-.1.1-.2.2-.3 0-.1.1-.3.1-.4m2.3 4.5l2.8 3.3c.4.4 1 .5 1.4.1.1-.1.2-.3.3-.4l1-3.5c.2-.6-.2-1.2-.7-1.3-.2 0-.3-.1-.5 0l-3.9.6c-.5.1-.9.6-.8 1.1 0 .2.1.3.2.4"/></svg>);
    case "Bing": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M5.5 2l3.7 1.3v13.4l4.3-2.5-2.1-1-1.3-3.3 6.4 2.3v3.8L9.2 20 5.5 22V2z"/></svg>);
    case "Facebook": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/></svg>);
    case "ChatGPT": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6 6 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.9 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 19.02 19.8a5.98 5.98 0 0 0 4-2.9 6.05 6.05 0 0 0-.74-7.08zM12 20.5a4.4 4.4 0 0 1-2.85-1.03l.14-.08 4.74-2.74a.77.77 0 0 0 .39-.67v-6.7l2 1.16v5.53A4.46 4.46 0 0 1 12 20.5zm-9.6-4.1a4.44 4.44 0 0 1-.53-3l.14.09 4.74 2.73a.77.77 0 0 0 .78 0l5.79-3.34v2.31a.07.07 0 0 1 0 .06L8.62 20a4.46 4.46 0 0 1-6.09-1.63zM1.39 7.63a4.44 4.44 0 0 1 2.32-1.95v5.63a.76.76 0 0 0 .39.67l5.77 3.33-2 1.16a.08.08 0 0 1-.07 0l-4.79-2.76a4.46 4.46 0 0 1-1.62-6.08zm16.44 3.83l-5.79-3.36 2-1.15a.08.08 0 0 1 .07 0l4.79 2.76a4.45 4.45 0 0 1-.67 8.02v-5.63a.78.78 0 0 0-.4-.68zm1.99-3l-.14-.09-4.73-2.75a.77.77 0 0 0-.78 0L9.38 8.97V6.66a.07.07 0 0 1 0-.06l4.79-2.76a4.45 4.45 0 0 1 6.61 4.61zM8.3 12.6l-2-1.15a.08.08 0 0 1 0-.07V5.87a4.45 4.45 0 0 1 7.3-3.42l-.14.08-4.74 2.74a.77.77 0 0 0-.39.67l-.03 6.66zm1.08-2.35L12 8.75l2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z"/></svg>);
    case "Gemini": return(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 0c.55 6.28 5.72 11.45 12 12-6.28.55-11.45 5.72-12 12-.55-6.28-5.72-11.45-12-12C6.28 11.45 11.45 6.28 12 0z"/></svg>);
    case "AIO": return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/></svg>);
    default: return null;
  }
}

// Custom SVG: NAP Orbit hub at center, radiating connection lines to publisher
// and AI-engine nodes shown with their real logos. Animated pulse conveys "instant push".
function PublisherNetworkSVG({isMobile}){
  const W=isMobile?320:460, H=isMobile?340:420;
  const cx=W/2, cy=H/2;
  const R=isMobile?120:160;
  const nodeR=isMobile?26:30;
  // Evenly spaced around the hub. label used only for the small caption under each mark.
  const nodes=[
    {mark:"Google",label:"Google",angle:-90,ai:false},
    {mark:"Apple",label:"Apple",angle:-45,ai:false},
    {mark:"Yelp",label:"Yelp",angle:0,ai:false},
    {mark:"Bing",label:"Bing",angle:45,ai:false},
    {mark:"ChatGPT",label:"ChatGPT",angle:90,ai:true},
    {mark:"Gemini",label:"Gemini",angle:135,ai:true},
    {mark:"AIO",label:"AI Overviews",angle:180,ai:true},
    {mark:"Facebook",label:"Facebook",angle:225,ai:false},
  ];
  const pt=(a)=>[cx+R*Math.cos(a*Math.PI/180), cy+R*Math.sin(a*Math.PI/180)];
  const hubR=isMobile?42:50;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",maxWidth:W,margin:"0 auto"}} role="img" aria-label="NAP Orbit connecting to 200+ publishers and AI engines">
      <defs>
        <radialGradient id="hubGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={T.brand}/><stop offset="100%" stopColor={T.violet}/>
        </radialGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.brand} stopOpacity="0.45"/><stop offset="100%" stopColor={T.brand} stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      {/* connection lines + animated pulse dots */}
      {nodes.map((n,i)=>{const[x,y]=pt(n.angle);const dur=2.6+i*0.16;return(
        <g key={n.label}>
          <line x1={cx} y1={cy} x2={x} y2={y} stroke="url(#lineGrad)" strokeWidth="1.5"/>
          <circle r="3" fill={n.ai?T.violet:T.brand}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M${cx},${cy} L${x},${y}`}/>
            <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} repeatCount="indefinite"/>
          </circle>
        </g>);})}
      {/* outer logo nodes, caption sits BELOW the circle so nothing overflows */}
      {nodes.map((n)=>{const[x,y]=pt(n.angle);return(
        <g key={n.label+"-node"}>
          <circle cx={x} cy={y} r={nodeR} fill={T.surface} stroke={n.ai?T.violetSoft:T.line} strokeWidth="1.5" style={{filter:"drop-shadow(0 2px 6px rgba(23,23,50,0.06))"}}/>
          <g transform={`translate(${x-(isMobile?11:13)},${y-(isMobile?11:13)})`}><BrandMark name={n.mark} size={isMobile?22:26} color={n.ai?T.violet:T.sub}/></g>
          <text x={x} y={y+nodeR+13} textAnchor="middle" fontSize={isMobile?8.5:9.5} fontWeight="700" fill={n.ai?T.violet:T.faint} fontFamily={FONT_B}>{n.label}</text>
        </g>);})}
      {/* center hub */}
      <circle cx={cx} cy={cy} r={hubR} fill="none" stroke={T.brand} strokeOpacity="0.3" strokeWidth="2">
        <animate attributeName="r" values={`${hubR};${hubR+10};${hubR}`} dur="3s" repeatCount="indefinite"/>
        <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx={cx} cy={cy} r={hubR} fill="url(#hubGrad)"/>
      <text x={cx} y={cy-3} textAnchor="middle" fontSize={isMobile?14:16} fontWeight="800" fill="#fff" fontFamily={FONT_D}>NAP</text>
      <text x={cx} y={cy+13} textAnchor="middle" fontSize={isMobile?10:11} fontWeight="700" fill="#fff" fillOpacity="0.9" fontFamily={FONT_B}>Orbit</text>
    </svg>
  );
}

export default function LandingPage({user=null,focusPricing=false,billingFlag=null}){
  const nav=useNavigate();
  const w=useWindowSize();const isMobile=w<768;const isTab=w>=768&&w<1024;
  const[planBusy,setPlanBusy]=useState(null);
  const[planErr,setPlanErr]=useState("");
  const scrollPricing=()=>document.getElementById("pricing")?.scrollIntoView({behavior:"smooth",block:"start"});
  const goLogin=()=>nav("/login");
  const goSignup=()=>nav("/signup");
  const goDash=()=>{
    if(user?.plan)nav("/dashboard");
    else scrollPricing();
  };
  // Logged-in + no plan → Stripe checkout from landing. Guest → signup with plan intent.
  const goPlan=async(planId)=>{
    setPlanErr("");
    if(user?.plan===planId)return;
    if(user?.plan){nav("/dashboard");return;}
    try{sessionStorage.setItem("ro_pending_plan",planId);}catch{}
    if(!user){nav(`/signup?plan=${encodeURIComponent(planId)}`);return;}
    setPlanBusy(planId);
    const r=await api.createCheckout(planId);
    setPlanBusy(null);
    if(r.error){setPlanErr(r.error);scrollPricing();return;}
    if(r.url)window.location.href=r.url;
  };
  useEffect(()=>{
    if(focusPricing||billingFlag==="cancel"){
      const t=setTimeout(scrollPricing,120);
      return()=>clearTimeout(t);
    }
    try{
      if(user&&!user.plan&&sessionStorage.getItem("ro_pending_plan")){
        const t=setTimeout(scrollPricing,200);
        return()=>clearTimeout(t);
      }
    }catch{}
  },[focusPricing,billingFlag,user]);
  const displayName=(user?.name||user?.email||"Account").split(" ")[0];
  const avatarLetter=(user?.avatar||displayName?.[0]||"U").toString().slice(0,1).toUpperCase();
  const pad=isMobile?"0 20px":isTab?"0 32px":"0 40px";
  const maxW=1160;
  // Load which plans are live + any price overrides (set by super-admin control panel).
  const[cfg,setCfg]=useState({});
  useEffect(()=>{(async()=>{try{const s=await api.getSettings?.();if(s?.config)setCfg(s.config);}catch{}})();},[]);
  const[navSolid,setNavSolid]=useState(false);
  useEffect(()=>{
    const onScroll=()=>setNavSolid(window.scrollY>40);
    onScroll();
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>window.removeEventListener("scroll",onScroll);
  },[]);
  const lprice=(id)=>{const m={essentials:"priceEssentials",growth:"priceGrowth",gmb:"priceGmb"};const v=cfg[m[id]];return v!=null&&v!==""?Number(v):PLANS[id]?.price;};

  // Bold section heading
  const Eyebrow=({children,color=T.brand})=>(
    <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:30,fontSize:12.5,fontWeight:800,letterSpacing:".4px",color,marginBottom:18,boxShadow:SHADOW}}>{children}</div>
  );
  const Ico=({d,c=T.brand,s=24})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>);
  const StatNumberCard=({value,suffix,title,sub,accent,icon,suffixColor,splitSuffix})=>{
    const[el,setEl]=useState(null);const[go2,setGo2]=useState(false);
    useEffect(()=>{if(!el)return;const io=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){setGo2(true);io.disconnect();}});},{threshold:.35});io.observe(el);return()=>io.disconnect();},[el]);
    const v=useCounter(go2?value:0,1400);
    return(
      <div ref={setEl} style={{background:"rgba(255,255,255,.05)",border:`1px solid rgba(255,255,255,.08)`,borderLeft:`4px solid ${accent}`,borderRadius:14,padding:"18px 16px 16px",backdropFilter:"blur(6px)"}}>
        <div style={{width:34,height:34,borderRadius:10,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
          <Ico d={icon} c={accent} s={17}/>
        </div>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?30:36,fontWeight:800,color:"#fff",letterSpacing:"-1.2px",lineHeight:1,marginBottom:8}}>
          {splitSuffix?(<>{v}<span style={{color:suffixColor||accent}}>{suffix}</span></>):(<>{v}<span style={{color:suffixColor||accent}}>{suffix}</span></>)}
        </div>
        <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:4}}>{title}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.55)",fontWeight:500,lineHeight:1.4}}>{sub}</div>
      </div>
    );
  };

  return(<div style={{minHeight:"100vh",background:T.bg,fontFamily:FONT_B,color:T.ink,overflowX:"hidden"}}>
    {/* ── Nav ── */}
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:navSolid?"rgba(255,255,255,.86)":"transparent",backdropFilter:navSolid?"blur(12px)":"none",borderBottom:navSolid?`1px solid ${T.line}`:"1px solid transparent",transition:"background .22s ease,border-color .22s ease,backdrop-filter .22s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"13px 8px":"15px 8px",maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <img src="/nap-orbit-logo-removebg-preview.png" alt="NAP Orbit" style={{height:isMobile?26:30,width:"auto",display:"block"}}/>
        </div>
        <div style={{display:"flex",gap:isMobile?8:14,alignItems:"center"}}>
          {user?(<>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:isMobile?32:36,height:isMobile?32:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:isMobile?13:14,flexShrink:0}}>{avatarLetter}</div>
              {!isMobile&&<span style={{fontSize:14.5,fontWeight:700,color:navSolid?T.ink:"#fff",textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)"}}>{displayName}</span>}
            </div>
            <Btn size={isMobile?"sm":"md"} onClick={goDash}>{user.plan?"Dashboard":"Choose a plan"}</Btn>
          </>):(<>
            {!isMobile&&<button onClick={goLogin} style={{background:"none",border:"none",color:navSolid?T.sub:"#fff",fontSize:14.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)"}}>Sign in</button>}
            <Btn size={isMobile?"sm":"md"} onClick={goSignup}>Get started</Btn>
          </>)}
        </div>
      </div>
    </div>

    {/* ── Hero ── */}
    <div style={{position:"relative",overflow:"hidden",backgroundImage:"url(/hero-bg.png)",backgroundSize:"cover",backgroundPosition:"center 35%"}}>
      {/* Light black shade so headline / CTAs stay readable */}
      <div aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(15,15,28,.42) 0%,rgba(15,15,28,.55) 55%,rgba(15,15,28,.62) 100%)"}}/>
      <div style={{position:"relative",maxWidth:1400,margin:"0 auto",padding:isMobile?"96px 8px 40px":"132px 8px 64px",textAlign:"left",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.05fr 0.95fr",gap:isMobile?36:48,alignItems:"center"}}>
          <div>
            <Reveal><Eyebrow color={T.green}><span style={{width:8,height:8,borderRadius:"50%",background:T.green,animation:"pulseDot 2s infinite"}}/>Built for local service businesses</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h1 style={{fontFamily:FONT_D,fontSize:isMobile?36:isTab?48:58,fontWeight:800,lineHeight:1.06,letterSpacing:isMobile?"-1.5px":"-2.2px",margin:"0 0 18px",maxWidth:560,color:"#fff",textShadow:"0 2px 24px rgba(0,0,0,.25)"}}>
                When customers<br/>search, make sure they find <span style={{color:"#B8B8FF",position:"relative"}}>you</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p style={{fontSize:isMobile?16:18.5,color:"rgba(255,255,255,.88)",lineHeight:1.6,maxWidth:520,margin:"0 0 28px",fontWeight:450,textShadow:"0 1px 12px rgba(0,0,0,.2)"}}>
                We get your business onto every map, directory and listing that matters, keep your details correct everywhere, and fix bad edits before they cost you calls. You just watch the customers come in.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div style={{display:"flex",gap:13,justifyContent:"flex-start",flexWrap:"wrap"}}>
                <CssIoButton onClick={user?goDash:goSignup}>Get found now</CssIoButton>
                <CtaFillButton onClick={()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>See how it works</CtaFillButton>
              </div>
              <div style={{marginTop:16,fontSize:13.5,color:"rgba(255,255,255,.72)",fontWeight:600}}>No setup fees. Cancel anytime. Live dashboard from day one.</div>
            </Reveal>
          </div>

          {/* Hero dashboard preview — right side on desktop */}
          <Reveal delay={280}>
            <div className="lift" style={{width:"100%",background:T.surface,borderRadius:isMobile?18:22,padding:isMobile?16:22,boxShadow:"0 30px 80px -20px rgba(23,23,50,.45)",border:`1px solid ${T.line}`,textAlign:"left"}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}>{[T.red,T.amber,T.green].map(c=><div key={c} style={{width:12,height:12,borderRadius:"50%",background:c}}/>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[["Listings live","42",T.green],["Pending","6",T.amber],["NAP match","96%",T.brand],["Edits reverted","8",T.violet]].map(([l,v,c])=>(
                  <div key={l} style={{background:T.surface2,borderRadius:14,padding:"14px 12px"}}>
                    <div style={{fontFamily:FONT_D,fontSize:isMobile?22:24,fontWeight:800,color:c,letterSpacing:"-1px"}}>{v}</div>
                    <div style={{fontSize:11,color:T.faint,fontWeight:700,marginTop:4}}>{l}</div>
                  </div>))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                <span style={{fontSize:13,fontWeight:700,color:T.sub}}>Visibility score</span>
                <span style={{fontSize:13,fontWeight:800,color:T.green}}>84 / 100</span>
              </div>
              <div style={{height:10,background:T.surface2,borderRadius:6,overflow:"hidden"}}><div style={{width:"84%",height:"100%",background:`linear-gradient(90deg,${T.brand},${T.green})`,borderRadius:6}}/></div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>

    {/* ── Marquee strip (before By the Numbers) ── */}
    <div
      role="presentation"
      style={{
        position: "relative",
        background: T.ink,
        borderTop: `1px solid rgba(255,255,255,.08)`,
        borderBottom: `1px solid rgba(255,255,255,.08)`,
        overflow: "hidden",
        padding: isMobile ? "12px 0" : "14px 0",
        marginTop: 0,
      }}
    >
      <div className="marqueeTrack" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 28 : 40,
              paddingRight: isMobile ? 28 : 40,
              whiteSpace: "nowrap",
              fontFamily: FONT_D,
              fontSize: isMobile ? 13 : 15,
              fontWeight: 700,
              letterSpacing: ".02em",
              color: "rgba(255,255,255,.88)",
            }}
          >
            {[
              "Get started and grow your business now with NAP Orbit",
              "Get discovered by customers worldwide",
              "Get started and grow your business now with NAP Orbit",
              "Get discovered by customers worldwide",
            ].map((line, i) => (
              <span key={`${copy}-${i}`} style={{display: "inline-flex", alignItems: "center", gap: isMobile ? 28 : 40}}>
                <span style={{color: i % 2 === 0 ? "#fff" : T.green}}>{line}</span>
                <span style={{width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0, opacity: 0.9}} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <span style={{position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)"}}>
        Get started and grow your business now with NAP Orbit. Get discovered by customers worldwide.
      </span>
    </div>

    {/* ── By the numbers ── */}
    <div style={{background:`linear-gradient(135deg,#0F1028 0%,#171732 45%,#1E1B4B 100%)`,padding:isMobile?"40px 16px":"56px 24px 0",marginTop:0,position:"relative",overflow:"hidden"}}>
      {/* Soft glow */}
      <div aria-hidden="true" style={{position:"absolute",top:"-20%",right:"-10%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.brand}33,transparent 68%)`,pointerEvents:"none"}}/>
      <div aria-hidden="true" style={{position:"absolute",bottom:"-30%",left:"10%",width:360,height:360,borderRadius:"50%",background:`radial-gradient(circle,${T.green}22,transparent 70%)`,pointerEvents:"none"}}/>

      <div style={{maxWidth:1400,margin:"0 auto",position:"relative",display:"grid",gridTemplateColumns:isMobile?"1fr":"0.95fr 1.15fr",gap:isMobile?28:40,alignItems:"center"}}>
        {/* Left: person centered in orbit rings */}
        <div style={{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",order:isMobile?2:1,minHeight:isMobile?440:700}}>
          {(()=>{
            const stage=isMobile?420:680;
            const rings=[
              {scale:1,color:T.green,dur:"22s",dir:"orbitSpin",delay:"0s"},
              {scale:0.74,color:T.brand,dur:"16s",dir:"orbitSpinR",delay:"-4s"},
              {scale:0.5,color:"#B8B8FF",dur:"12s",dir:"orbitSpin",delay:"-2s"},
            ];
            return(
              <div style={{position:"relative",width:stage,height:stage,maxWidth:"100%"}}>
                {rings.map((ring,i)=>{
                  const size=stage*ring.scale;
                  const inset=(stage-size)/2;
                  return(
                    <div key={i} aria-hidden="true" style={{position:"absolute",top:inset,left:inset,width:size,height:size,borderRadius:"50%",border:`1px solid rgba(255,255,255,${0.1+i*0.035})`,pointerEvents:"none"}}>
                      {/* spinner keeps ring still; only the arm rotates so the dot rides the boundary */}
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",animation:`${ring.dir} ${ring.dur} linear infinite`,animationDelay:ring.delay}}>
                        <span style={{
                          position:"absolute",
                          top:-5,
                          left:"50%",
                          transform:"translateX(-50%)",
                          width:10,
                          height:10,
                          borderRadius:"50%",
                          background:ring.color,
                          boxShadow:`0 0 14px ${ring.color}`,
                        }}/>
                      </div>
                    </div>
                  );
                })}
                <img
                  src="/men-cutout.png"
                  alt="NAP Orbit expert"
                  style={{
                    position:"absolute",
                    left:"50%",
                    top:"50%",
                    transform:"translate(-50%,-42%)",
                    zIndex:2,
                    height:isMobile?440:680,
                    width:"auto",
                    maxWidth:"98%",
                    objectFit:"contain",
                    filter:"drop-shadow(0 24px 40px rgba(0,0,0,.45))",
                    display:"block",
                    pointerEvents:"none",
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* Right: copy + stat cards */}
        <div style={{paddingBottom:isMobile?8:56,paddingTop:isMobile?0:24,order:isMobile?1:2}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(15,164,122,.12)",border:`1px solid ${T.green}66`,borderRadius:30,fontSize:11.5,fontWeight:800,color:"#fff",letterSpacing:".5px",marginBottom:18}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
            BY THE NUMBERS
          </div>
          <h2 style={{fontFamily:FONT_D,fontSize:isMobile?30:44,fontWeight:800,letterSpacing:"-1.4px",margin:"0 0 12px",lineHeight:1.12,color:"#fff"}}>
            More visibility.<br/>
            <span style={{color:"#fff"}}>Less </span>
            <span style={{color:T.green}}>manual work.</span>
          </h2>
          <p style={{fontSize:isMobile?14.5:16.5,color:"rgba(255,255,255,.65)",lineHeight:1.6,margin:"0 0 28px",maxWidth:480}}>
            NAP Orbit keeps your business accurate and visible everywhere, while protecting your listings around the clock.
          </p>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
            {[
              {value:60,suffix:"+",title:"Directories managed",sub:"Google, Apple, Yelp and more",accent:T.green,icon:<><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/></>,suffixColor:T.green},
              {value:96,suffix:"%",title:"Average NAP accuracy",sub:"Consistent details everywhere",accent:T.brand,icon:<path d="M20 6 9 17l-5-5"/>,suffixColor:"#B8B8FF"},
              {value:30,suffix:"+",title:"New listings monthly",sub:"Fresh coverage every month",accent:T.green,icon:<><path d="M12 5v14M5 12h14"/></>,suffixColor:T.green},
              {value:24,suffix:"/7",title:"Edit protection",sub:"Unauthorized changes caught fast",accent:T.brand,icon:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,suffixColor:"#B8B8FF",splitSuffix:true},
            ].map((card)=>(
              <StatNumberCard key={card.title} {...card}/>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ── AI discovery ── */}
    <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"40px 12px":"64px 16px",width:"100%",boxSizing:"border-box"}}>
      <Reveal>
        <div style={{
          background:`linear-gradient(135deg,#F4F2FA 0%,#EEF0F8 48%,#F7F5FC 100%)`,
          border:`1px solid ${T.line}`,
          borderRadius:isMobile?24:36,
          padding:isMobile?"32px 22px":"48px 52px",
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":"1.05fr 1fr",
          gap:isMobile?36:48,
          alignItems:"center",
          overflow:"visible",
          position:"relative",
        }}>
          {/* Left copy */}
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(91,91,214,.08)",border:`1px solid rgba(91,91,214,.18)`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.brand,letterSpacing:".6px",marginBottom:18}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/></svg>
              AI DISCOVERY
            </div>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:40,fontWeight:800,letterSpacing:"-1.3px",margin:"0 0 14px",lineHeight:1.12,color:T.ink}}>
              Customers ask AI.<br/>Make sure it finds <span style={{color:T.brand}}>you.</span>
            </h2>
            <p style={{fontSize:isMobile?15:16.5,color:T.sub,lineHeight:1.65,margin:"0 0 22px",maxWidth:460}}>
              NAP Orbit keeps your business details accurate across the trusted sources AI assistants use to recommend local businesses.
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:isMobile?"12px 18px":"14px 22px",marginBottom:22}}>
              {[
                {t:"Accurate",c:T.green},
                {t:"AI trusted",c:T.brand},
                {t:"Local discovery",c:T.blue},
              ].map(x=>(
                <div key={x.t} style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:700,color:T.ink}}>
                  <span style={{width:20,height:20,borderRadius:"50%",background:`${x.c}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={x.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  {x.t}
                </div>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${T.line}`,paddingTop:16,fontSize:13.5,color:T.faint,fontWeight:600}}>
              One consistent business profile. More ways to be found.
            </div>
          </div>

          {/* Right: AI orbit graphic */}
          <div style={{position:"relative",width:"100%",maxWidth:isMobile?360:450,height:isMobile?360:450,margin:isMobile?"0 auto":"0 0 0 auto"}}>
            {/* Dashed orbits + 2 evenly spaced rotating dots per ring */}
            {[
              {scale:1,colors:[T.green,T.brand],dur:"32s",dir:"orbitSpinR",delay:"0s"},
              {scale:0.8,colors:[T.blue,"#B8B8FF"],dur:"26s",dir:"orbitSpin",delay:"-4s"},
              {scale:0.62,colors:[T.brand,T.green],dur:"20s",dir:"orbitSpinR",delay:"-7s"},
              {scale:0.44,colors:[T.blue,T.brand],dur:"14s",dir:"orbitSpin",delay:"-2s"},
            ].map((ring,i)=>(
              <div
                key={i}
                aria-hidden="true"
                style={{
                  position:"absolute",
                  left:"50%",top:"50%",
                  width:`${ring.scale*100}%`,
                  height:`${ring.scale*100}%`,
                  marginLeft:`-${ring.scale*50}%`,
                  marginTop:`-${ring.scale*50}%`,
                  borderRadius:"50%",
                  border:`1.5px dashed rgba(91,91,214,${0.24-i*0.035})`,
                  pointerEvents:"none",
                }}
              >
                <div style={{
                  position:"absolute",
                  inset:0,
                  borderRadius:"50%",
                  animation:`${ring.dir} ${ring.dur} linear infinite`,
                  animationDelay:ring.delay,
                }}>
                  {/* 2 dots opposite each other — same spacing */}
                  {ring.colors.map((c,di)=>(
                    <span
                      key={di}
                      style={{
                        position:"absolute",
                        top:di===0?-5:"auto",
                        bottom:di===1?-5:"auto",
                        left:"50%",
                        transform:"translateX(-50%)",
                        width:9,
                        height:9,
                        borderRadius:"50%",
                        background:c,
                        boxShadow:`0 0 12px ${c}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Center AI sun */}
            <div style={{
              position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
              width:isMobile?72:88,height:isMobile?72:88,borderRadius:"50%",
              background:`linear-gradient(135deg,${T.brand},${T.brandDark})`,
              color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:FONT_D,fontWeight:800,fontSize:isMobile?22:26,letterSpacing:"-0.5px",
              boxShadow:`0 10px 32px ${T.brandGlow}`,zIndex:5,
            }}>
              AI
              <div aria-hidden="true" style={{position:"absolute",inset:-14,borderRadius:"50%",background:`radial-gradient(circle,transparent 55%,${T.brand}22 56%,transparent 70%)`,pointerEvents:"none"}}/>
            </div>

            {/* Orbiting labels — Your Business alone on outermost ring */}
            {[
              {label:"Your Business",dot:T.green,scale:1,dur:"32s",dir:"orbitSpinR",delay:"-6s",business:true},
              {label:"ChatGPT answers",dot:T.green,scale:0.8,dur:"26s",dir:"orbitSpin",delay:"0s"},
              {label:"Google AI",dot:T.blue,scale:0.62,dur:"20s",dir:"orbitSpinR",delay:"-8s"},
              {label:"Gemini",dot:T.brand,scale:0.44,dur:"14s",dir:"orbitSpin",delay:"-4s"},
            ].map((card)=>{
              const reverse=card.dir==="orbitSpin"?"orbitSpinR":"orbitSpin";
              return(
                <div
                  key={card.label}
                  aria-hidden={!card.business}
                  style={{
                    position:"absolute",
                    left:"50%",top:"50%",
                    width:`${card.scale*100}%`,
                    height:`${card.scale*100}%`,
                    marginLeft:`-${card.scale*50}%`,
                    marginTop:`-${card.scale*50}%`,
                    animation:`${card.dir} ${card.dur} linear infinite`,
                    animationDelay:card.delay,
                    zIndex:4,
                    pointerEvents:"none",
                  }}
                >
                  <div style={{
                    position:"absolute",
                    top:0,
                    left:"50%",
                    transform:"translate(-50%,-50%)",
                    animation:`${reverse} ${card.dur} linear infinite`,
                    animationDelay:card.delay,
                  }}>
                    {card.business?(
                      <div style={{
                        background:"#fff",
                        borderRadius:16,
                        padding:"10px 14px",
                        boxShadow:SHADOW_LG,
                        border:`1px solid ${T.line}`,
                        minWidth:isMobile?150:170,
                        pointerEvents:"auto",
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                          <div style={{width:28,height:28,borderRadius:9,background:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                          </div>
                          <div style={{fontSize:13.5,fontWeight:800,color:T.ink,fontFamily:FONT_D}}>Your Business</div>
                        </div>
                        <div style={{fontSize:11.5,fontWeight:700,color:T.green,paddingLeft:36}}>✓ Verified and consistent</div>
                      </div>
                    ):(
                      <div style={{
                        background:"#fff",
                        borderRadius:14,
                        padding:"9px 13px",
                        boxShadow:SHADOW,
                        border:`1px solid ${T.line}`,
                        display:"flex",alignItems:"center",gap:8,
                        fontSize:12.5,fontWeight:700,color:T.ink,
                        whiteSpace:"nowrap",
                        pointerEvents:"auto",
                      }}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:card.dot,boxShadow:`0 0 8px ${card.dot}`,flexShrink:0}}/>
                        {card.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>

    {/* ── Problem → benefit (bento) ── */}
    <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"48px 16px":"80px 24px",width:"100%",boxSizing:"border-box"}}>
      <div style={{marginBottom:isMobile?28:36}}>
        <Reveal><Eyebrow color={T.green}>Why it matters</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h2 style={{fontFamily:FONT_D,fontSize:isMobile?30:44,fontWeight:800,letterSpacing:"-1.4px",margin:0,lineHeight:1.12,color:T.ink}}>
            Bad business data<br/>costs real customers.
          </h2>
        </Reveal>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.35fr 1fr",gap:16,alignItems:"stretch"}}>
        {/* Card 01 — dark featured */}
        <Reveal delay={100}>
          <div style={{
            background:`linear-gradient(145deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`,
            borderRadius:24,
            padding:isMobile?"28px 22px":"32px 32px 28px",
            minHeight:isMobile?320:380,
            display:"grid",
            gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
            gap:20,
            alignItems:"center",
            position:"relative",
            overflow:"hidden",
            height:"100%",
            boxSizing:"border-box",
          }}>
            <div style={{position:"relative",zIndex:2}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:28,borderRadius:8,background:"rgba(255,255,255,.1)",color:"#fff",fontSize:12,fontWeight:800,marginBottom:18,letterSpacing:".4px"}}>01</div>
              <h3 style={{fontFamily:FONT_D,fontSize:isMobile?24:28,fontWeight:800,color:"#fff",margin:"0 0 10px",letterSpacing:"-.6px",lineHeight:1.15}}>Get listed everywhere</h3>
              <p style={{fontSize:14.5,color:"rgba(255,255,255,.68)",lineHeight:1.6,margin:"0 0 22px",maxWidth:280}}>
                Reach customers across maps, directories, apps and AI-powered local search.
              </p>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:20,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",fontSize:12.5,fontWeight:700,color:"#fff"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
                60+ publisher destinations
              </div>
            </div>

            {/* Orbit graphic */}
            <div style={{position:"relative",width:"100%",aspectRatio:"1",maxWidth:isMobile?220:260,margin:isMobile?"0 auto":"0 0 0 auto"}}>
              {[1,0.72,0.5].map((scale,i)=>(
                <div key={i} aria-hidden="true" style={{
                  position:"absolute",left:"50%",top:"50%",
                  width:`${scale*92}%`,height:`${scale*92}%`,
                  marginLeft:`-${scale*46}%`,marginTop:`-${scale*46}%`,
                  borderRadius:"50%",
                  border:`1px solid rgba(255,255,255,${0.14-i*0.03})`,
                }}>
                  <div style={{
                    position:"absolute",inset:0,borderRadius:"50%",
                    animation:`${i%2? "orbitSpinR":"orbitSpin"} ${18+i*6}s linear infinite`,
                  }}>
                    {[T.green,T.brand,T.blue].slice(0,i===0?2:i===1?2:1).map((c,di)=>(
                      <span key={di} style={{
                        position:"absolute",
                        top:di===0?-4:"auto",
                        bottom:di===1?-4:"auto",
                        left:di===2?"auto":"50%",
                        right:di===2?-4:"auto",
                        transform:di<2?"translateX(-50%)":"none",
                        width:8,height:8,borderRadius:"50%",
                        background:c,boxShadow:`0 0 10px ${c}`,
                      }}/>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{
                position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
                width:44,height:44,borderRadius:"50%",
                background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 8px 24px rgba(0,0,0,.25)",zIndex:2,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Cards 02 + 03 stacked */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Reveal delay={160}>
            <div className="lift" style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:22,padding:isMobile?22:26,boxShadow:SHADOW,flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:14,background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.green} s={22}/>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,background:T.greenSoft,fontSize:10.5,fontWeight:800,color:T.green,letterSpacing:".3px"}}>ALL MATCHED</div>
              </div>
              <div style={{fontSize:12,fontWeight:800,color:T.faint,marginBottom:6,letterSpacing:".4px"}}>02 · CONSISTENCY</div>
              <h3 style={{fontFamily:FONT_D,fontSize:20,fontWeight:800,margin:"0 0 8px",letterSpacing:"-.4px"}}>Stay correct everywhere</h3>
              <p style={{fontSize:14,color:T.sub,lineHeight:1.6,margin:0}}>Name, address and phone stay identical across every platform so search engines trust you.</p>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <div className="lift" style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:22,padding:isMobile?22:26,boxShadow:SHADOW,flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:14,background:T.violetSoft,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ico d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} c={T.violet} s={22}/>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,background:T.violetSoft,fontSize:10.5,fontWeight:800,color:T.violet,letterSpacing:".3px"}}>24/7 ACTIVE</div>
              </div>
              <div style={{fontSize:12,fontWeight:800,color:T.faint,marginBottom:6,letterSpacing:".4px"}}>03 · PROTECTION</div>
              <h3 style={{fontFamily:FONT_D,fontSize:20,fontWeight:800,margin:"0 0 8px",letterSpacing:"-.4px"}}>Reverse harmful edits</h3>
              <p style={{fontSize:14,color:T.sub,lineHeight:1.6,margin:0}}>When someone changes your hours or address, we catch it and put the correct details back.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>

    {/* ── How it works ── */}
    <div id="how" style={{background:`linear-gradient(180deg,#F4F2FA 0%,#EEF0F8 100%)`,padding:isMobile?"48px 16px":"80px 24px"}}>
      <div style={{maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        <Reveal>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(91,91,214,.08)",border:`1px solid rgba(91,91,214,.18)`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.brand,letterSpacing:".5px",marginBottom:16}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:T.brand}}/>
            HOW IT WORKS
          </div>
        </Reveal>
        <Reveal delay={60}>
          <h2 style={{fontFamily:FONT_D,fontSize:isMobile?30:44,fontWeight:800,letterSpacing:"-1.4px",margin:"0 0 12px",lineHeight:1.12,color:T.ink}}>
            Set it once. <span style={{color:T.brand}}>We handle the rest.</span>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p style={{fontSize:isMobile?15:16.5,color:T.sub,lineHeight:1.6,margin:"0 0 32px",maxWidth:520}}>
            Share your business details once, then NAP Orbit handles publishing, protection and growth.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div style={{
            background:"#fff",
            borderRadius:isMobile?24:32,
            border:`1px solid ${T.line}`,
            boxShadow:SHADOW_LG,
            padding:isMobile?"28px 20px 22px":"40px 36px 28px",
          }}>
            <div style={{
              display:"grid",
              gridTemplateColumns:isMobile?"1fr":"1fr auto 1fr auto 1fr",
              gap:isMobile?28:12,
              alignItems:"start",
            }}>
              {[
                {
                  badge:"5 MIN SETUP",badgeBg:T.brandSoft,badgeC:T.brand,
                  step:"01 · SHARE",stepC:T.brand,
                  title:"Tell us about your business",
                  body:"Add your name, address, phone and category just once.",
                  iconBg:T.brandSoft,iconC:T.brand,
                  icon:<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></>,
                },
                {
                  badge:"ALWAYS ON",badgeBg:T.greenSoft,badgeC:T.green,
                  step:"02 · PUBLISH",stepC:T.green,
                  title:"We publish and protect",
                  body:"We create listings, verify them and monitor every change.",
                  iconBg:T.greenSoft,iconC:T.green,
                  icon:<><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="20" cy="7" r="1.5" fill="currentColor"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="17" r="1.5" fill="currentColor"/></>,
                },
                {
                  badge:"LIVE RESULTS",badgeBg:T.violetSoft,badgeC:T.violet,
                  step:"03 · GROW",stepC:T.violet,
                  title:"Watch visibility grow",
                  body:"Track listings and progress from one simple dashboard.",
                  iconBg:T.violetSoft,iconC:T.violet,
                  icon:<><path d="M4 19V5M4 19h16"/><path d="M8 15v-3M12 15V9M16 15v-6"/><path d="M14 7l3-3 3 3"/></>,
                },
              ].map((s,i,arr)=>(
                <Fragment key={s.step}>
                  <div style={{textAlign:isMobile?"left":"center",position:"relative"}}>
                    <div style={{display:"flex",justifyContent:isMobile?"flex-start":"center",marginBottom:14}}>
                      <span style={{padding:"5px 11px",borderRadius:20,background:s.badgeBg,color:s.badgeC,fontSize:10.5,fontWeight:800,letterSpacing:".4px"}}>{s.badge}</span>
                    </div>
                    <div style={{width:56,height:56,borderRadius:"50%",background:s.iconBg,display:"flex",alignItems:"center",justifyContent:"center",margin:isMobile?"0 0 14px":"0 auto 14px",color:s.iconC}}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                    </div>
                    <div style={{fontSize:12,fontWeight:800,color:s.stepC,letterSpacing:".4px",marginBottom:8}}>{s.step}</div>
                    <h3 style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,margin:"0 0 8px",letterSpacing:"-.3px",color:T.ink}}>{s.title}</h3>
                    <p style={{fontSize:14,color:T.sub,lineHeight:1.55,margin:0,maxWidth:260,marginLeft:isMobile?0:"auto",marginRight:isMobile?0:"auto"}}>{s.body}</p>
                  </div>
                  {!isMobile&&i<arr.length-1&&(
                    <div aria-hidden="true" style={{display:"flex",alignItems:"center",justifyContent:"center",paddingTop:72}}>
                      <div style={{width:48,height:2,background:`linear-gradient(90deg,${T.brand}55,${T.brand})`,borderRadius:2,position:"relative"}}>
                        <span style={{position:"absolute",right:-2,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"5px solid transparent",borderBottom:"5px solid transparent",borderLeft:`7px solid ${T.brand}`}}/>
                      </div>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            <div style={{marginTop:isMobile?28:32,paddingTop:18,borderTop:`1px solid ${T.line}`,textAlign:"center",fontSize:13,color:T.faint,fontWeight:600}}>
              One simple setup <span style={{margin:"0 8px",opacity:.5}}>·</span> Continuous visibility <span style={{margin:"0 8px",opacity:.5}}>·</span> Clear progress
            </div>
          </div>
        </Reveal>
      </div>
    </div>

    {/* ── Dashboard tour ── */}
    <div style={{background:`linear-gradient(180deg,#FAF9FF 0%,#F0F2FA 55%,#EEF0F8 100%)`,padding:isMobile?"48px 16px":"80px 24px"}}>
      <div style={{maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"grid",gridTemplateColumns:isMobile?"1fr":"0.95fr 1.15fr",gap:isMobile?32:48,alignItems:"center"}}>
        {/* Left copy */}
        <div>
          <Reveal>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:T.violetSoft,border:`1px solid rgba(138,79,216,.2)`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.violet,letterSpacing:".5px",marginBottom:16}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.violet}}/>
              YOUR DASHBOARD
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.3px",margin:"0 0 14px",lineHeight:1.12,color:T.ink}}>
              Your online presence.<br/>One <span style={{color:T.brand}}>clear</span> view.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{fontSize:isMobile?15:16.5,color:T.sub,lineHeight:1.65,margin:"0 0 22px",maxWidth:440}}>
              See every listing, understand your visibility and act only when something genuinely needs your attention.
            </p>
          </Reveal>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[
              {t:"Every listing at a glance",b:"Live, pending and needs-attention in one view.",icon:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,bg:T.brandSoft,c:T.brand},
              {t:"One visibility score",b:"Understand your online health instantly.",icon:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,bg:T.blueSoft,c:T.blue},
              {t:"Only relevant actions",b:"We flag the rare task that genuinely needs you.",icon:<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></>,bg:T.violetSoft,c:T.violet},
            ].map((f,i)=>(
              <Reveal key={f.t} delay={140+i*70}>
                <div className="lift" style={{display:"flex",gap:14,alignItems:"center",background:"#fff",border:`1px solid ${T.line}`,borderRadius:16,padding:"14px 16px",boxShadow:SHADOW}}>
                  <div style={{width:42,height:42,borderRadius:12,background:f.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ico d={f.icon} c={f.c} s={20}/>
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:T.ink,marginBottom:2}}>{f.t}</div>
                    <div style={{fontSize:13.5,color:T.sub,lineHeight:1.45}}>{f.b}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div style={{marginTop:18,fontSize:13,color:T.faint,fontWeight:600}}>Built for busy local business owners.</div>
          </Reveal>
        </div>

        {/* Right: dashboard mockup */}
        <Reveal delay={160}>
          <div style={{
            background:`linear-gradient(160deg,#171732 0%,#1E1B4B 100%)`,
            borderRadius:isMobile?20:28,
            padding:isMobile?10:14,
            boxShadow:"0 32px 80px -20px rgba(23,23,50,.45)",
            border:"1px solid rgba(255,255,255,.08)",
          }}>
            {/* Window chrome */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 6px 12px"}}>
              <div style={{display:"flex",gap:7}}>
                {[T.red,T.amber,T.green].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
              </div>
              <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,.55)",letterSpacing:".6px"}}>NAP ORBIT DASHBOARD</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:"rgba(15,164,122,.18)",border:"1px solid rgba(15,164,122,.35)",fontSize:10,fontWeight:800,color:T.green,letterSpacing:".3px"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`}}/>
                LIVE PREVIEW
              </div>
            </div>

            {/* App shell */}
            <div style={{display:"flex",background:"#F6F7FB",borderRadius:isMobile?14:18,overflow:"hidden",minHeight:isMobile?340:420}}>
              {/* Sidebar */}
              {!isMobile&&(
                <div style={{width:56,background:"#EEF0F6",borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:10,flexShrink:0}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:13,marginBottom:6}}>N</div>
                  {[
                    {active:true,d:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
                    {active:false,d:<><path d="M4 6h16M4 12h16M4 18h10"/></>},
                    {active:false,d:<><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></>},
                    {active:false,d:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>},
                  ].map((nav,i)=>(
                    <div key={i} style={{width:36,height:36,borderRadius:10,background:nav.active?"#fff":"transparent",boxShadow:nav.active?SHADOW:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ico d={nav.d} c={nav.active?T.brand:T.faint} s={17}/>
                    </div>
                  ))}
                </div>
              )}

              {/* Main panel */}
              <div style={{flex:1,padding:isMobile?12:18,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,gap:10}}>
                  <div>
                    <div style={{fontFamily:FONT_D,fontSize:isMobile?16:18,fontWeight:800,color:T.ink,letterSpacing:"-.3px"}}>Visibility overview</div>
                    <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>Everything important, updated in one place</div>
                  </div>
                  <div style={{width:32,height:32,borderRadius:"50%",background:T.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:13,flexShrink:0}}>A</div>
                </div>

                {/* Metric cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?6:10,marginBottom:12}}>
                  {[
                    {l:"LIVE LISTINGS",v:"42",icon:<path d="M20 6 9 17l-5-5"/>,c:T.green,bg:T.greenSoft},
                    {l:"VISIBILITY SCORE",v:"84/100",icon:<><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></>,c:T.blue,bg:T.blueSoft},
                    {l:"NEEDS ATTENTION",v:"2",icon:<path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a1.8 1.8 0 0 0 1.6 2.7h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0z"/>,c:T.amber,bg:T.amberSoft},
                  ].map(m=>(
                    <div key={m.l} style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?"10px 8px":"12px 12px",boxShadow:SHADOW}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{fontSize:isMobile?8.5:10,fontWeight:800,color:T.faint,letterSpacing:".3px"}}>{m.l}</div>
                        <div style={{width:22,height:22,borderRadius:7,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Ico d={m.icon} c={m.c} s={12}/>
                        </div>
                      </div>
                      <div style={{fontFamily:FONT_D,fontSize:isMobile?18:22,fontWeight:800,color:m.c,letterSpacing:"-.6px",lineHeight:1}}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Chart + status column */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:10,marginBottom:10}}>
                  <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?12:14,boxShadow:SHADOW}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:800,color:T.ink}}>Visibility growth</div>
                      <div style={{fontSize:10.5,fontWeight:700,color:T.faint}}>Last 6 months</div>
                    </div>
                    <svg viewBox="0 0 240 90" width="100%" height={isMobile?70:86} preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="dashChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.brand} stopOpacity="0.28"/>
                          <stop offset="100%" stopColor={T.brand} stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M8 72 C40 68, 55 58, 80 52 S120 48, 140 36 S180 28, 200 18 S228 12, 232 10 L232 90 L8 90 Z" fill="url(#dashChartFill)"/>
                      <path d="M8 72 C40 68, 55 58, 80 52 S120 48, 140 36 S180 28, 200 18 S228 12, 232 10" fill="none" stroke="#2A7A7A" strokeWidth="2.5" strokeLinecap="round"/>
                      {[[8,72],[80,52],[140,36],[200,18],[232,10]].map(([x,y],i)=>(
                        <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="#2A7A7A" strokeWidth="2"/>
                      ))}
                    </svg>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:2,padding:"0 2px"}}>
                      {["JAN","FEB","MAR","APR","MAY"].map(m=>(
                        <span key={m} style={{fontSize:9.5,fontWeight:700,color:T.faint}}>{m}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{background:`linear-gradient(145deg,#171732,#1E1B4B)`,borderRadius:14,padding:isMobile?12:14,flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                      <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.45)",letterSpacing:".4px",marginBottom:8}}>{"TODAY'S STATUS"}</div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(15,164,122,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.green} s={14}/>
                        </div>
                        <div>
                          <div style={{fontSize:13.5,fontWeight:800,color:"#fff"}}>All protected</div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:1}}>Last checked 2 min ago</div>
                        </div>
                      </div>
                    </div>
                    <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?12:14,boxShadow:SHADOW}}>
                      <div style={{fontSize:10,fontWeight:800,color:T.faint,letterSpacing:".4px",marginBottom:6}}>QUICK ACTION</div>
                      <div style={{fontSize:13.5,fontWeight:800,color:T.ink,marginBottom:10}}>Review 2 updates</div>
                      <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"7px 12px",borderRadius:10,background:T.brandSoft,color:T.brand,fontSize:11.5,fontWeight:800}}>View activity</div>
                    </div>
                  </div>
                </div>

                {/* Listing health */}
                <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?"12px 12px":"12px 14px",boxShadow:SHADOW}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:11.5,fontWeight:800,color:T.faint,letterSpacing:".3px"}}>LISTING HEALTH</div>
                    <div style={{fontSize:13,fontWeight:800,color:T.green}}>93%</div>
                  </div>
                  <div style={{height:9,background:T.surface2,borderRadius:6,overflow:"hidden"}}>
                    <div style={{width:"93%",height:"100%",background:`linear-gradient(90deg,${T.brand},${T.green})`,borderRadius:6}}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>

    {/* ── Publisher network + AI-ready data ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"48px 20px":"84px 40px"}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.05fr",gap:isMobile?32:56,alignItems:"center"}}>
        {/* Left: copy with the differentiator points */}
        <div>
          <Reveal><Eyebrow>Direct publisher network</Eyebrow></Reveal>
          <Reveal delay={80}><h2 style={{fontFamily:FONT_D,fontSize:isMobile?27:40,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 16px",lineHeight:1.1}}>200+ direct connections.<br/>Instant, accurate updates.</h2></Reveal>
          <Reveal delay={140}><p style={{fontSize:isMobile?15.5:17,color:T.sub,lineHeight:1.65,margin:"0 0 22px"}}>NAP Orbit has 200+ direct publisher connections that push accurate updates the moment your details change, instant and precise in a way competitors relying on slow third-party feeds simply can't match.</p></Reveal>
          {[
            {t:"Structured for AI search",b:"Your data is structured the way AI engines cite it, optimized for Google, Apple, Yelp, and the AI assistants shaping the future of search."},
            {t:"Instant propagation",b:"Direct connections mean an address or hours change reaches publishers immediately, not after a monthly batch sync."},
          ].map((f,i)=>(
            <Reveal key={f.t} delay={200+i*80}>
              <div style={{display:"flex",gap:14,marginBottom:16,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:12,background:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.brand} s={20}/></div>
                <div><h3 style={{fontFamily:FONT_D,fontSize:16.5,fontWeight:800,margin:"0 0 4px",letterSpacing:"-.3px"}}>{f.t}</h3><p style={{fontSize:14.5,color:T.sub,lineHeight:1.6,margin:0}}>{f.b}</p></div>
              </div>
            </Reveal>))}
        </div>
        {/* Right: custom SVG, NAP Orbit hub radiating to publisher + AI nodes */}
        <Reveal delay={120}>
          <div className="lift" style={{background:`linear-gradient(160deg,${T.surface},${T.surface2})`,border:`1px solid ${T.line}`,borderRadius:isMobile?20:26,padding:isMobile?20:30,boxShadow:SHADOW}}>
            <PublisherNetworkSVG isMobile={isMobile}/>
          </div>
        </Reveal>
      </div>
    </div>

    {/* ── Customer stories ── */}
    <div style={{background:`linear-gradient(180deg,#F7F5FC 0%,#EEF0F8 100%)`,padding:isMobile?"48px 16px":"72px 24px"}}>
      <div style={{maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr",gap:isMobile?20:32,alignItems:"end",marginBottom:isMobile?28:36}}>
          <div>
            <Reveal>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",border:`1px solid ${T.line}`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.green,letterSpacing:".5px",marginBottom:16,boxShadow:SHADOW}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.green}}/>
                CUSTOMER STORIES
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.3px",margin:0,lineHeight:1.12,color:T.ink}}>
                Less listing stress.<br/>More calls that <span style={{color:T.brand}}>connect.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div>
              <div style={{fontSize:14.5,color:T.sub,marginBottom:12,fontWeight:600}}>What changes when business information stays accurate:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[
                  {t:"Correct phone",c:T.green},
                  {t:"Accurate hours",c:T.brand},
                  {t:"One dashboard",c:T.blue},
                ].map(x=>(
                  <span key={x.t} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:20,background:"#fff",border:`1px solid ${T.line}`,fontSize:12.5,fontWeight:700,color:T.ink}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:x.c}}/>
                    {x.t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.35fr 1fr",gap:16,alignItems:"stretch"}}>
          {/* Featured dark quote */}
          <Reveal delay={120}>
            <div style={{
              background:`linear-gradient(145deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`,
              borderRadius:24,
              padding:isMobile?"28px 22px":"34px 32px",
              minHeight:isMobile?280:340,
              display:"flex",flexDirection:"column",
              position:"relative",overflow:"hidden",
              height:"100%",boxSizing:"border-box",
            }}>
              <div aria-hidden="true" style={{position:"absolute",top:18,right:22,fontFamily:FONT_D,fontSize:80,fontWeight:800,color:"rgba(255,255,255,.08)",lineHeight:1}}>“</div>
              <div style={{display:"flex",gap:4,marginBottom:18}}>
                {[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={18}/>)}
              </div>
              <p style={{fontFamily:FONT_D,fontSize:isMobile?20:24,fontWeight:700,color:"#fff",lineHeight:1.45,margin:"0 0 auto",letterSpacing:"-.3px",position:"relative",zIndex:1}}>
                “We were getting calls at an old number for months. NAP Orbit fixed it everywhere in a week—the phone actually rings now.”
              </p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:28,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:T.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:18}}>M</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Mike D.</div>
                    <div style={{fontSize:12.5,color:"rgba(255,255,255,.6)"}}>Plumbing · Austin, Texas</div>
                  </div>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:20,background:"rgba(15,164,122,.18)",border:"1px solid rgba(15,164,122,.3)",fontSize:11,fontWeight:800,color:T.green,letterSpacing:".3px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:T.green}}/>
                  PHONE FIXED
                </div>
              </div>
            </div>
          </Reveal>

          {/* Side cards */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Reveal delay={180}>
              <div className="lift" style={{background:"#fff",border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.green}`,borderRadius:20,padding:isMobile?20:24,boxShadow:SHADOW,flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
                  <div style={{display:"flex",gap:3}}>{[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={14}/>)}</div>
                  <span style={{padding:"4px 10px",borderRadius:20,background:T.greenSoft,color:T.green,fontSize:10.5,fontWeight:800,letterSpacing:".3px",whiteSpace:"nowrap"}}>TIME SAVED</span>
                </div>
                <p style={{fontSize:15.5,fontWeight:600,color:T.ink,lineHeight:1.55,margin:"0 0 16px"}}>“I check one dashboard and everything is simply handled.”</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:15}}>S</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>Sarah M.</div>
                    <div style={{fontSize:12,color:T.faint}}>Dental clinic · Houston, Texas</div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="lift" style={{background:"#fff",border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.brand}`,borderRadius:20,padding:isMobile?20:24,boxShadow:SHADOW,flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
                  <div style={{display:"flex",gap:3}}>{[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={14}/>)}</div>
                  <span style={{padding:"4px 10px",borderRadius:20,background:T.violetSoft,color:T.violet,fontSize:10.5,fontWeight:800,letterSpacing:".3px",whiteSpace:"nowrap"}}>EDIT PROTECTED</span>
                </div>
                <p style={{fontSize:15.5,fontWeight:600,color:T.ink,lineHeight:1.55,margin:"0 0 16px"}}>“They caught a harmful hours change before it cost us again.”</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:15}}>J</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>John D.</div>
                    <div style={{fontSize:12,color:T.faint}}>Auto repair · Dallas, Texas</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

      </div>
    </div>

    {/* ── Pricing teaser ── */}
    <div id="pricing" style={{
      background:`linear-gradient(180deg,#F8F7FF 0%,#F4F8F6 45%,#EEF1FF 100%)`,
      padding:isMobile?"48px 16px":isTab?"64px 24px":"80px 24px",
      position:"relative",
      overflow:"hidden",
    }}>
      <div aria-hidden="true" style={{position:"absolute",top:-80,left:-60,width:280,height:280,borderRadius:"50%",background:"rgba(91,91,214,.08)",filter:"blur(40px)",pointerEvents:"none"}}/>
      <div aria-hidden="true" style={{position:"absolute",bottom:-60,right:-40,width:260,height:260,borderRadius:"50%",background:"rgba(15,164,122,.08)",filter:"blur(40px)",pointerEvents:"none"}}/>

      <div style={{maxWidth:1200,margin:"0 auto",width:"100%",boxSizing:"border-box",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:isMobile?28:40}}>
          <Reveal>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",border:`1px solid ${T.line}`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.brand,letterSpacing:".5px",marginBottom:16,boxShadow:SHADOW}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.brand}}/>
              SIMPLE PRICING
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:isTab?36:44,fontWeight:800,letterSpacing:"-1.3px",margin:"0 0 12px",lineHeight:1.12,color:T.ink}}>
              One monthly price. <span style={{color:T.brand}}>No games.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{fontSize:isMobile?15:16.5,color:T.sub,maxWidth:480,margin:"0 auto 18px",lineHeight:1.6}}>
              Choose the level of visibility and support that fits your business.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:isMobile?"10px 16px":"12px 22px"}}>
              {["No setup fees","Cancel anytime","Secure billing"].map(t=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:7,fontSize:13.5,fontWeight:700,color:T.sub}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </Reveal>
          {billingFlag==="cancel"&&<div style={{marginTop:14,fontSize:13,color:T.amber,fontWeight:700}}>Checkout canceled — pick a plan whenever you're ready.</div>}
          {planErr&&<div style={{marginTop:14,fontSize:13,color:T.red,fontWeight:700}}>{planErr}</div>}
          {user&&!user.plan&&<div style={{marginTop:14,fontSize:13,color:T.brand,fontWeight:700}}>Subscribe to a plan to unlock your dashboard.</div>}
        </div>

        {(()=>{
          const cards=[
            {id:"essentials",n:"Essentials",tag:"GETTING STARTED",q:"10 LISTINGS / MONTH",pop:false,f:["10 directory submissions monthly","NAP consistency management","Unauthorized edit protection","AI search visibility","Live dashboard access"]},
            {id:"growth",n:"Growth",tag:"GROWING BUSINESS",q:"20 LISTINGS / MONTH",pop:true,f:["20 directory submissions monthly","Everything in Essentials","Expanded directory coverage","AI search visibility","Priority support"]},
            {id:"gmb",n:"GMB Pro",tag:"MANAGED PRESENCE",q:"20 LISTINGS + GOOGLE PROFILE",pop:false,f:["Everything in Growth","Google Business Profile management","AI search visibility","Monthly posts and Q&A","Dedicated manager"]},
          ].filter(pl=>planLive(pl.id,cfg));

          // Stack on phone + iPad portrait; 3-up from ~900px (iPad landscape / desktop)
          // Middle “Most Popular” column gets a bit more width when 3 cards
          const hasFeatured=cards.some(c=>c.pop)&&!(user?.plan&&cards.find(c=>c.pop)?.id===user.plan);
          const gridCols=w<900
            ?"1fr"
            :cards.length===3&&hasFeatured
              ?"minmax(0,1fr) minmax(0,1.14fr) minmax(0,1fr)"
              :`repeat(${Math.max(cards.length,1)},minmax(0,1fr))`;

          return(<>
            <div style={{
              display:"grid",
              gridTemplateColumns:gridCols,
              gap:isMobile?18:isTab?20:22,
              alignItems:w<900?"stretch":"center",
              maxWidth:cards.length===1?400:cards.length===2?760:1140,
              margin:"0 auto",
            }}>
              {cards.map((pl,i)=>{
                const current=!!user?.plan&&user.plan===pl.id;
                const featured=pl.pop&&!current;
                const dark=featured;
                const checkC=dark?T.green:(pl.id==="gmb"?T.brand:T.green);
                const tagBg=dark?"rgba(255,255,255,.12)":(pl.id==="gmb"?T.violetSoft:T.surface2);
                const tagC=dark?"rgba(255,255,255,.85)":(pl.id==="gmb"?T.violet:T.sub);
                const quotaBg=dark?"rgba(15,164,122,.2)":(pl.id==="gmb"?T.violetSoft:T.surface2);
                const quotaC=dark?T.green:(pl.id==="gmb"?T.violet:T.sub);

                return(
                  <Reveal key={pl.id} delay={i*90}>
                    <div style={{
                      position:"relative",
                      height:dark&&w>=900?"auto":"100%",
                      minHeight:dark?(isMobile?0:w>=900?560:520):undefined,
                      display:"flex",
                      flexDirection:"column",
                      background:dark
                        ?`linear-gradient(165deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`
                        :"#fff",
                      borderRadius:isMobile?22:28,
                      padding:dark
                        ?(isMobile?"32px 24px 26px":"40px 30px 30px")
                        :(isMobile?"28px 22px 22px":"32px 26px 24px"),
                      border:dark?"1px solid rgba(255,255,255,.1)":`1px solid ${T.line}`,
                      boxShadow:dark?SHADOW_LG:SHADOW,
                      marginTop:(current||pl.pop)?14:0,
                      boxSizing:"border-box",
                      zIndex:dark?2:1,
                    }}>
                      {current&&(
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:T.violetSoft,border:`1px solid rgba(138,79,216,.25)`,fontSize:10.5,fontWeight:800,color:T.violet,letterSpacing:".4px",whiteSpace:"nowrap",zIndex:2}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:T.violet}}/>
                          YOUR CURRENT PLAN
                        </div>
                      )}
                      {!current&&pl.pop&&(
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:T.brand,color:"#fff",fontSize:10.5,fontWeight:800,letterSpacing:".4px",whiteSpace:"nowrap",zIndex:2,boxShadow:"0 8px 20px rgba(91,91,214,.35)"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>
                          MOST POPULAR
                        </div>
                      )}

                      <div style={{display:"inline-flex",alignSelf:"flex-start",padding:"5px 11px",borderRadius:20,background:tagBg,color:tagC,fontSize:10.5,fontWeight:800,letterSpacing:".45px",marginBottom:14}}>
                        {pl.tag}
                      </div>
                      <h3 style={{fontFamily:FONT_D,fontSize:isMobile?24:26,fontWeight:800,margin:"0 0 8px",letterSpacing:"-.5px",color:dark?"#fff":T.ink}}>{pl.n}</h3>
                      <div style={{marginBottom:14}}>
                        <span style={{fontFamily:FONT_D,fontSize:isMobile?42:48,fontWeight:800,letterSpacing:"-2px",color:dark?"#fff":T.ink}}>${lprice(pl.id)}</span>
                        <span style={{fontSize:15,fontWeight:600,color:dark?"rgba(255,255,255,.55)":T.faint}}> /month</span>
                      </div>
                      <div style={{display:"inline-flex",alignSelf:"flex-start",padding:"6px 12px",borderRadius:20,background:quotaBg,color:quotaC,fontSize:11,fontWeight:800,letterSpacing:".35px",marginBottom:20}}>
                        {pl.q}
                      </div>

                      <div style={{flex:1,marginBottom:20}}>
                        {pl.f.map(f=>(
                          <div key={f} style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-start"}}>
                            <span style={{width:18,height:18,borderRadius:"50%",background:dark?"rgba(15,164,122,.2)":(pl.id==="gmb"?T.brandSoft:T.greenSoft),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={checkC} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </span>
                            <span style={{fontSize:14,lineHeight:1.45,color:dark?"rgba(255,255,255,.82)":T.sub,fontWeight:500}}>{f}</span>
                          </div>
                        ))}
                      </div>

                      {current?(
                        <button
                          type="button"
                          disabled
                          style={{
                            width:"100%",padding:"14px 18px",borderRadius:14,border:"none",
                            background:T.surface2,color:T.brand,fontSize:15,fontWeight:800,
                            fontFamily:FONT_B,cursor:"default",
                            display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
                          }}
                        >
                          <span style={{width:7,height:7,borderRadius:"50%",background:T.brand}}/>
                          Current plan
                        </button>
                      ):(
                        <button
                          type="button"
                          onClick={()=>goPlan(pl.id)}
                          disabled={!!planBusy}
                          style={{
                            width:"100%",padding:"14px 18px",borderRadius:14,
                            border:dark?"none":`1.5px solid ${T.brand}`,
                            background:dark?"#fff":"transparent",
                            color:dark?T.ink:T.brand,
                            fontSize:15,fontWeight:800,fontFamily:FONT_B,
                            cursor:planBusy?"wait":"pointer",
                            opacity:planBusy&&planBusy!==pl.id?0.6:1,
                          }}
                        >
                          {planBusy===pl.id?"Redirecting…":`Choose ${pl.n}`}
                        </button>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={280}>
              <div style={{textAlign:"center",marginTop:isMobile?22:28,fontSize:12.5,color:T.faint,fontWeight:600}}>
                All prices shown in USD. Cancel before renewal to avoid the next charge.
              </div>
            </Reveal>
          </>);
        })()}
      </div>
    </div>

    {/* ── Final CTA (full-bleed) ── */}
    <div style={{width:"100%",padding:"20px 0 0",boxSizing:"border-box"}}>
      <Reveal>
        <div style={{
          background:`linear-gradient(135deg,#2A2460 0%,${T.brand} 42%,#3D2F8C 100%)`,
          borderRadius:0,
          position:"relative",
          overflow:"hidden",
          width:"100%",
          minHeight:isMobile?0:420,
        }}>
          {/* Diagonal stripes + dots atmosphere */}
          <div aria-hidden="true" style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(-35deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 1px,transparent 18px)",pointerEvents:"none"}}/>
          <div aria-hidden="true" style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px)",backgroundSize:"22px 22px",opacity:.35,pointerEvents:"none"}}/>

          <div style={{
            position:"relative",zIndex:1,
            maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box",
            padding:isMobile?"36px 20px 0":"48px 40px 0",
            display:"grid",
            gridTemplateColumns:isMobile?"1fr":"1.1fr 0.9fr",
            gap:isMobile?8:24,
            alignItems:"end",
          }}>
            {/* Left copy */}
            <div style={{position:"relative",zIndex:2,paddingBottom:isMobile?28:48}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(15,164,122,.15)",border:`1px solid rgba(15,164,122,.35)`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.green,letterSpacing:".5px",marginBottom:18}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
                START GROWING TODAY
              </div>
              <h2 style={{fontFamily:FONT_D,fontSize:isMobile?32:46,fontWeight:800,color:"#fff",letterSpacing:"-1.5px",margin:"0 0 14px",lineHeight:1.1}}>
                Ready to be found<br/>
                <span style={{color:T.green}}>everywhere?</span>
              </h2>
              <p style={{fontSize:isMobile?15:17,color:"rgba(255,255,255,.85)",margin:"0 0 26px",maxWidth:440,lineHeight:1.6}}>
                Set up your business in minutes. We publish, protect and monitor your listings while you focus on your customers.
              </p>
              <CssIoButton variant="light" onClick={user?goDash:goSignup}>
                Get started now
              </CssIoButton>
              <div style={{display:"flex",flexWrap:"wrap",gap:isMobile?"10px 16px":"12px 20px",marginTop:20}}>
                {["No setup fees","Cancel anytime","Live dashboard"].map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:7,fontSize:13.5,fontWeight:700,color:"rgba(255,255,255,.9)"}}>
                    <span style={{width:18,height:18,borderRadius:"50%",background:"rgba(15,164,122,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: man + orbits */}
            <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",alignItems:"flex-end",minHeight:isMobile?300:400}}>
              {(()=>{
                const stage=isMobile?280:380;
                return(
                  <div style={{position:"relative",width:stage,height:stage*1.05}}>
                    {[1,0.74,0.5].map((scale,i)=>(
                      <div key={i} aria-hidden="true" style={{
                        position:"absolute",
                        left:"50%",top:"42%",
                        width:stage*scale,height:stage*scale,
                        marginLeft:-(stage*scale)/2,marginTop:-(stage*scale)/2,
                        borderRadius:"50%",
                        border:`1px solid rgba(255,255,255,${0.18-i*0.03})`,
                        pointerEvents:"none",
                      }}>
                        <div style={{position:"absolute",inset:0,borderRadius:"50%",animation:`${i%2?"orbitSpinR":"orbitSpin"} ${16+i*5}s linear infinite`}}>
                          {[T.green,"#B8B8FF",T.blue].slice(0,2).map((c,di)=>(
                            <span key={di} style={{
                              position:"absolute",
                              top:di===0?-4:"auto",
                              bottom:di===1?-4:"auto",
                              left:"50%",
                              transform:"translateX(-50%)",
                              width:8,height:8,borderRadius:"50%",
                              background:c,boxShadow:`0 0 10px ${c}`,
                            }}/>
                          ))}
                        </div>
                      </div>
                    ))}
                    <img
                      src="/men-cta-cutout.png"
                      alt="Get started with NAP Orbit"
                      style={{
                        position:"relative",zIndex:2,
                        height:isMobile?300:420,
                        width:"auto",maxWidth:"100%",
                        objectFit:"contain",
                        objectPosition:"bottom center",
                        display:"block",
                        margin:"0 auto",
                        filter:"drop-shadow(0 20px 36px rgba(0,0,0,.35))",
                      }}
                    />
                    <div style={{
                      position:"absolute",
                      left:isMobile?8:16,
                      bottom:isMobile?24:40,
                      zIndex:3,
                      background:"#fff",
                      borderRadius:14,
                      padding:"10px 14px",
                      boxShadow:SHADOW_LG,
                      minWidth:140,
                    }}>
                      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10.5,fontWeight:800,color:T.green,letterSpacing:".4px",marginBottom:3}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                        VISIBILITY READY
                      </div>
                      <div style={{fontSize:14.5,fontWeight:800,color:T.ink,fontFamily:FONT_D}}>60+ destinations</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </Reveal>
    </div>

    {/* ── Footer ── */}
    <footer style={{
      background:`linear-gradient(180deg,#F8F7FF 0%,#EEF1FF 100%)`,
      position:"relative",overflow:"hidden",
      padding:isMobile?"56px 0 0":isTab?"72px 0 0":"88px 0 0",
      borderTop:`1px solid ${T.line}`,
    }}>
      {/* Soft orbit rings */}
      <div aria-hidden="true" style={{
        position:"absolute",right:isMobile?-80:isTab?-40:-20,top:isMobile?"auto":"8%",bottom:isMobile?-60:"auto",
        width:isMobile?280:isTab?340:420,height:isMobile?280:isTab?340:420,
        borderRadius:"50%",border:`1px solid ${T.line}`,pointerEvents:"none",
      }}/>
      <div aria-hidden="true" style={{
        position:"absolute",right:isMobile?-40:isTab?20:60,top:isMobile?"auto":"18%",bottom:isMobile?-20:"auto",
        width:isMobile?180:isTab?220:280,height:isMobile?180:isTab?220:280,
        borderRadius:"50%",border:`1px solid ${T.line}`,pointerEvents:"none",
      }}/>

      {/* Full-bleed brand wordmark — no side padding */}
      <div
        aria-hidden="true"
        style={{
          width:"100%",
          marginBottom:isMobile?28:isTab?36:44,
          padding:0,
          lineHeight:0,
        }}
      >
        <svg
          viewBox="0 0 1100 130"
          width="100%"
          height="auto"
          preserveAspectRatio="xMidYMid meet"
          style={{display:"block",userSelect:"none",maxHeight:isMobile?88:isTab?120:150}}
        >
          <text
            x="550"
            y="98"
            textAnchor="middle"
            fontFamily="Syne, Sora, sans-serif"
            fontWeight="800"
            fontSize="108"
            letterSpacing="1"
            fill={T.brand}
            fillOpacity="0.28"
          >
            NAP.RankOrbit
          </text>
        </svg>
      </div>

      <div style={{
        maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box",position:"relative",zIndex:1,
        padding:isMobile?"0 20px":isTab?"0 32px":"0 40px",
      }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":isTab?"1fr 1fr":"1.15fr 1.6fr",
          gap:isMobile?36:isTab?36:48,
          alignItems:"start",
          paddingBottom:isMobile?28:36,
        }}>
          {/* Brand column */}
          <div>
            <img src="/nap-orbit-logo-removebg-preview.png" alt="NAP Orbit" style={{height:isMobile?28:32,width:"auto",display:"block",marginBottom:18}}/>
            <div style={{fontFamily:FONT_D,fontSize:isMobile?22:26,fontWeight:800,color:T.ink,letterSpacing:"-.5px",marginBottom:10,lineHeight:1.2}}>
              Local visibility, kept simple.
            </div>
            <p style={{fontSize:isMobile?13.5:14.5,color:T.sub,lineHeight:1.6,margin:"0 0 18px",maxWidth:360}}>
              Your business data published, protected and trusted across maps, directories and AI-powered search.
            </p>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"7px 12px",borderRadius:10,background:T.greenSoft,border:`1px solid rgba(15,164,122,.25)`,fontSize:11,fontWeight:800,color:T.green,letterSpacing:".4px",marginBottom:16}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              24/7 LISTING PROTECTION
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:isMobile?"10px 14px":"10px 18px"}}>
              {[
                {t:"60+ destinations",c:T.brand},
                {t:"One dashboard",c:T.green},
                {t:"Cancel anytime",c:T.violet},
              ].map(x=>(
                <span key={x.t} style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:12.5,fontWeight:600,color:T.sub}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:x.c,flexShrink:0}}/>
                  {x.t}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns + CTA */}
          <div style={{display:"flex",flexDirection:"column",gap:isMobile?28:24}}>
            <div style={{
              display:"grid",
              gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",
              gap:isMobile?24:isTab?20:28,
            }}>
              {[
                {
                  h:"PLATFORM",
                  links:[
                    {l:"How it works",onClick:()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})},
                    {l:"Pricing",onClick:scrollPricing},
                    {l:"Dashboard",onClick:user?goDash:goLogin},
                  ],
                },
                {
                  h:"FEATURES",
                  links:[
                    {l:"Business listings",onClick:()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})},
                    {l:"Visibility analytics",onClick:()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})},
                    {l:"Edit protection",onClick:()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})},
                  ],
                },
                {
                  h:"ACCOUNT",
                  links:[
                    {l:"Get started",onClick:goSignup},
                    {l:"Sign in",onClick:goLogin},
                    {l:"Book a call",onClick:user?.plan?()=>nav("/dashboard"):goLogin},
                  ],
                },
              ].map(col=>(
                <div key={col.h}>
                  <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:14}}>
                    {col.h==="ACCOUNT"&&<span style={{width:6,height:6,borderRadius:"50%",background:T.green}}/>}
                    {col.h}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {col.links.map(link=>(
                      <button
                        key={link.l}
                        type="button"
                        onClick={link.onClick}
                        style={{
                          background:"none",border:"none",padding:0,margin:0,textAlign:"left",
                          color:T.ink,fontSize:14,fontWeight:600,cursor:"pointer",
                          fontFamily:FONT_B,lineHeight:1.35,
                        }}
                      >
                        {link.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Customer CTA strip */}
            <div style={{
              display:"flex",
              flexDirection:isMobile?"column":"row",
              alignItems:isMobile?"stretch":"center",
              gap:isMobile?14:16,
              padding:isMobile?"16px 16px":"14px 16px",
              borderRadius:16,
              background:"#fff",
              border:`1px solid ${T.line}`,
              boxShadow:SHADOW,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                <div style={{width:36,height:36,borderRadius:10,background:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </div>
                <div style={{fontSize:isMobile?13.5:14,fontWeight:600,color:T.ink,lineHeight:1.45}}>
                  Already a customer? Open your dashboard and check your visibility.
                </div>
              </div>
              <button
                type="button"
                onClick={user?goDash:goLogin}
                style={{
                  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
                  background:T.brand,color:"#fff",border:"none",borderRadius:12,
                  padding:"11px 18px",fontSize:14,fontWeight:800,cursor:"pointer",
                  fontFamily:FONT_B,flexShrink:0,whiteSpace:"nowrap",
                }}
              >
                Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:`1px solid ${T.line}`,
          padding:isMobile?"18px 0 22px":"20px 0 24px",
          display:"flex",
          flexDirection:isMobile?"column":"row",
          alignItems:isMobile?"flex-start":"center",
          justifyContent:"space-between",
          gap:isMobile?14:16,
        }}>
          <div style={{fontSize:12.5,color:T.faint}}>
            © {new Date().getFullYear()} NAP Orbit. All rights reserved.
          </div>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:isMobile?"10px 16px":"10px 20px"}}>
            {[
              {l:"Privacy",onClick:()=>nav("/privacy")},
              {l:"Terms",onClick:()=>nav("/terms")},
              {l:"Accessibility",onClick:()=>nav("/")},
            ].map(x=>(
              <button
                key={x.l}
                type="button"
                onClick={x.onClick}
                style={{
                  background:"none",border:"none",padding:0,cursor:"pointer",
                  color:T.sub,fontSize:12.5,fontWeight:600,fontFamily:FONT_B,
                }}
              >
                {x.l}
              </button>
            ))}
            <span style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:11,fontWeight:800,color:T.green,letterSpacing:".4px"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
              SYSTEMS ACTIVE
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>);
}

