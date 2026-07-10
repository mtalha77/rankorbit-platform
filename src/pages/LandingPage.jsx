// ─── LANDING PAGE ────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, planLive } from "../lib/constants";
import { Btn } from "../components/atoms";
import { Orbit, MiniOrbit } from "../components/Orbit";
import { Reveal } from "../components/Reveal";
import { useWindowSize, useCounter } from "../hooks";

// Custom SVG: NAP Orbit hub at center, radiating connection lines to publisher
// and AI-engine nodes. Animated pulse travels outward to convey "instant push".
function PublisherNetworkSVG({isMobile}){
  const W=isMobile?300:420, H=isMobile?300:380;
  const cx=W/2, cy=H/2;
  // Outer nodes: publishers + AI engines around the hub.
  const nodes=[
    {label:"Google",angle:-90,r:1,type:"pub"},
    {label:"Apple",angle:-40,r:1,type:"pub"},
    {label:"Yelp",angle:10,r:1,type:"pub"},
    {label:"Bing",angle:55,r:1,type:"pub"},
    {label:"ChatGPT",angle:100,r:1,type:"ai"},
    {label:"Gemini",angle:150,r:1,type:"ai"},
    {label:"AI Overviews",angle:200,r:1,type:"ai"},
    {label:"Facebook",angle:235,r:1,type:"pub"},
  ];
  const R=isMobile?110:145;
  const pt=(a)=>[cx+R*Math.cos(a*Math.PI/180), cy+R*Math.sin(a*Math.PI/180)];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",maxWidth:W,margin:"0 auto"}} role="img" aria-label="NAP Orbit connecting to 200+ publishers and AI engines">
      <defs>
        <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={T.brand}/><stop offset="100%" stopColor={T.violet}/>
        </radialGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.brand} stopOpacity="0.5"/><stop offset="100%" stopColor={T.brand} stopOpacity="0.12"/>
        </linearGradient>
      </defs>
      {/* connection lines + animated pulse dots */}
      {nodes.map((n,i)=>{const[x,y]=pt(n.angle);const dur=2.4+i*0.18;return(
        <g key={n.label}>
          <line x1={cx} y1={cy} x2={x} y2={y} stroke="url(#lineGrad)" strokeWidth="1.5"/>
          <circle r="3" fill={n.type==="ai"?T.violet:T.brand}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M${cx},${cy} L${x},${y}`}/>
            <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} repeatCount="indefinite"/>
          </circle>
        </g>);})}
      {/* outer nodes */}
      {nodes.map((n)=>{const[x,y]=pt(n.angle);const isAI=n.type==="ai";return(
        <g key={n.label+"-node"}>
          <circle cx={x} cy={y} r={isMobile?20:24} fill={isAI?T.violetSoft:T.surface} stroke={isAI?T.violet:T.line} strokeWidth="1.5"/>
          <text x={x} y={y+3} textAnchor="middle" fontSize={isMobile?7.5:8.5} fontWeight="700" fill={isAI?T.violet:T.sub} fontFamily={FONT_B}>{n.label}</text>
        </g>);})}
      {/* center hub */}
      <circle cx={cx} cy={cy} r={isMobile?40:48} fill="url(#hubGrad)"/>
      <circle cx={cx} cy={cy} r={isMobile?40:48} fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2">
        <animate attributeName="r" values={`${isMobile?40:48};${isMobile?46:56};${isMobile?40:48}`} dur="3s" repeatCount="indefinite"/>
        <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize={isMobile?13:15} fontWeight="800" fill="#fff" fontFamily={FONT_D}>NAP</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize={isMobile?9:10} fontWeight="700" fill="#fff" fillOpacity="0.85" fontFamily={FONT_B}>Orbit</text>
      {/* badge: 200+ */}
      <g transform={`translate(${cx-(isMobile?26:30)},${cy+(isMobile?52:64)})`}>
        <rect width={isMobile?52:60} height={isMobile?22:26} rx={isMobile?11:13} fill={T.ink}/>
        <text x={isMobile?26:30} y={isMobile?15:17} textAnchor="middle" fontSize={isMobile?10:11} fontWeight="800" fill="#fff" fontFamily={FONT_B}>200+ direct</text>
      </g>
    </svg>
  );
}

export default function LandingPage(){
  const nav=useNavigate();
  const w=useWindowSize();const isMobile=w<768;const isTab=w>=768&&w<1024;
  const go=()=>nav("/login");
  const pad=isMobile?"0 20px":isTab?"0 32px":"0 40px";
  const maxW=1160;
  // Load which plans are live + any price overrides (set by super-admin control panel).
  const[cfg,setCfg]=useState({});
  useEffect(()=>{(async()=>{try{const s=await api.getSettings?.();if(s?.config)setCfg(s.config);}catch{}})();},[]);
  const lprice=(id)=>{const m={essentials:"priceEssentials",growth:"priceGrowth",gmb:"priceGmb"};const v=cfg[m[id]];return v!=null&&v!==""?Number(v):PLANS[id]?.price;};

  // Bold section heading
  const Eyebrow=({children,color=T.brand})=>(
    <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:30,fontSize:12.5,fontWeight:800,letterSpacing:".4px",color,marginBottom:18,boxShadow:SHADOW}}>{children}</div>
  );
  const Ico=({d,c=T.brand,s=24})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>);
  const CountStat=({value,suffix,label})=>{
    const[el,setEl]=useState(null);const[go2,setGo2]=useState(false);
    useEffect(()=>{if(!el)return;const io=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){setGo2(true);io.disconnect();}});},{threshold:.4});io.observe(el);return()=>io.disconnect();},[el]);
    const v=useCounter(go2?value:0,1400);
    return(<div ref={setEl} style={{textAlign:"center"}}>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?34:46,fontWeight:800,color:"#fff",letterSpacing:"-1.5px",lineHeight:1}}>{v}{suffix}</div>
      <div style={{fontSize:isMobile?12.5:13.5,color:"rgba(255,255,255,.7)",fontWeight:600,marginTop:8}}>{label}</div>
    </div>);
  };

  return(<div style={{minHeight:"100vh",background:T.bg,fontFamily:FONT_B,color:T.ink,overflowX:"hidden"}}>
    {/* ── Sticky Nav ── */}
    <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,.82)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"13px 20px":"15px 40px",maxWidth:maxW,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <MiniOrbit size={36}/>
          <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,letterSpacing:"-.6px"}}>NAP <span style={{color:T.brand}}>Orbit</span></div>
        </div>
        <div style={{display:"flex",gap:isMobile?8:14,alignItems:"center"}}>
          {!isMobile&&<button onClick={go} style={{background:"none",border:"none",color:T.sub,fontSize:14.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Sign in</button>}
          <Btn size={isMobile?"sm":"md"} onClick={go}>Get started</Btn>
        </div>
      </div>
    </div>

    {/* ── Hero ── */}
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",top:-140,left:"-8%",width:460,height:460,borderRadius:"50%",background:T.brandSoft,filter:"blur(60px)",opacity:.7,animation:"blob 18s ease-in-out infinite"}}/>
      <div style={{position:"absolute",top:80,right:"-8%",width:400,height:400,borderRadius:"50%",background:T.greenSoft,filter:"blur(60px)",opacity:.6,animation:"blob 22s ease-in-out infinite reverse"}}/>
      <div style={{position:"relative",maxWidth:maxW,margin:"0 auto",padding:isMobile?"44px 20px 34px":"72px 40px 54px",textAlign:"center"}}>
        <Reveal><Eyebrow><span style={{width:8,height:8,borderRadius:"50%",background:T.green,animation:"pulseDot 2s infinite"}}/>Built for local service businesses</Eyebrow></Reveal>
        <Reveal delay={80}>
          <h1 style={{fontFamily:FONT_D,fontSize:isMobile?38:isTab?54:66,fontWeight:800,lineHeight:1.04,letterSpacing:isMobile?"-1.5px":"-2.5px",margin:"0 0 20px",maxWidth:900,marginLeft:"auto",marginRight:"auto"}}>
            When customers search,<br/>make sure they find <span style={{color:T.brand,position:"relative"}}>you</span>.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p style={{fontSize:isMobile?16.5:20,color:T.sub,lineHeight:1.6,maxWidth:600,margin:"0 auto 30px",fontWeight:450}}>
            We get your business onto every map, directory and listing that matters, keep your details correct everywhere, and fix bad edits before they cost you calls. You just watch the customers come in.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div style={{display:"flex",gap:13,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn size="lg" onClick={go}>Get found now</Btn>
            <Btn size="lg" variant="ghost" onClick={()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>See how it works</Btn>
          </div>
          <div style={{marginTop:18,fontSize:13.5,color:T.faint,fontWeight:600}}>No setup fees. Cancel anytime. Live dashboard from day one.</div>
        </Reveal>

        {/* Hero dashboard preview */}
        <Reveal delay={340}>
          <div className="lift" style={{marginTop:isMobile?38:52,maxWidth:820,marginLeft:"auto",marginRight:"auto",background:T.surface,borderRadius:isMobile?18:24,padding:isMobile?16:26,boxShadow:"0 30px 80px -20px rgba(23,23,50,.28)",border:`1px solid ${T.line}`,textAlign:"left"}}>
            <div style={{display:"flex",gap:8,marginBottom:18}}>{[T.red,T.amber,T.green].map(c=><div key={c} style={{width:12,height:12,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:18}}>
              {[["Listings live","42",T.green],["Pending","6",T.amber],["NAP match","96%",T.brand],["Edits reverted","8",T.violet]].map(([l,v,c])=>(
                <div key={l} style={{background:T.surface2,borderRadius:14,padding:"16px 12px"}}>
                  <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800,color:c,letterSpacing:"-1px"}}>{v}</div>
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

    {/* ── Stat band ── */}
    <div style={{background:`linear-gradient(135deg,${T.ink},#2B2B58)`,padding:isMobile?"36px 20px":"52px 40px",marginTop:isMobile?20:40}}>
      <div style={{maxWidth:maxW,margin:"0 auto",display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?26:20}}>
        <CountStat value={60} suffix="+" label="Directories we manage"/>
        <CountStat value={96} suffix="%" label="Average NAP accuracy"/>
        <CountStat value={30} suffix="+" label="New listings a month"/>
        <CountStat value={24} suffix="/7" label="Edit protection"/>
      </div>
    </div>

    {/* ── AI search band ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"48px 20px 0":"80px 40px 0"}}>
      <Reveal>
        <div className="lift" style={{background:`linear-gradient(135deg,${T.violetSoft},${T.brandSoft})`,border:`1px solid ${T.line}`,borderRadius:isMobile?20:26,padding:isMobile?"30px 24px":"46px 48px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1.3fr 1fr",gap:isMobile?24:40,alignItems:"center"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",borderRadius:30,fontSize:12.5,fontWeight:800,color:T.violet,marginBottom:16,boxShadow:SHADOW}}>New in 2026</div>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?26:38,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 14px",lineHeight:1.1}}>Now customers ask AI, not just Google.</h2>
            <p style={{fontSize:isMobile?15.5:17.5,color:T.sub,lineHeight:1.65,margin:0}}>When someone asks ChatGPT, Gemini or Google's AI Overviews for "the best plumber near me," those answers come from the same listings and consistent business data we manage for you. Get listed right, and you show up in AI answers too, not just the old blue links.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {["Shows up in ChatGPT & Gemini answers","Feeds Google AI Overviews","Consistent data AI engines trust"].map(x=>(
              <div key={x} style={{display:"flex",gap:12,alignItems:"center",background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:SHADOW}}>
                <div style={{width:34,height:34,borderRadius:10,background:T.violetSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico d={<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>} c={T.violet} s={17}/></div>
                <span style={{fontSize:14.5,fontWeight:700,color:T.ink}}>{x}</span>
              </div>))}
          </div>
        </div>
      </Reveal>
    </div>

    {/* ── Problem → benefit ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"48px 20px":"80px 40px"}}>
      <div style={{textAlign:"center",marginBottom:isMobile?32:52}}>
        <Reveal><Eyebrow color={T.green}>Why it matters</Eyebrow></Reveal>
        <Reveal delay={80}><h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 14px",lineHeight:1.1}}>Wrong info online means<br/>lost customers. Full stop.</h2></Reveal>
        <Reveal delay={140}><p style={{fontSize:isMobile?15.5:17,color:T.sub,maxWidth:560,margin:"0 auto",lineHeight:1.6}}>Most local businesses have wrong phone numbers, old addresses, or missing listings scattered across the web. Every one is a customer who couldn't reach you. We fix that.</p></Reveal>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:isMobile?16:22}}>
        {[
          {t:"Get listed everywhere",b:"We put your business on the maps, directories and apps your customers actually use, and add new ones every month. This also feeds the data AI search tools like ChatGPT and Google AI Overviews rely on, so you get found there too.",ic:<><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/></>,c:T.brand,cs:T.brandSoft},
          {t:"Kept correct everywhere",b:"Your name, address and phone stay identical across every platform. Search engines trust consistent businesses, and rank them higher.",ic:<><path d="M20 6 9 17l-5-5"/></>,c:T.green,cs:T.greenSoft},
          {t:"Bad edits reversed",b:"When Google or Apple lets a stranger change your hours or address, we catch it and change it back. You stay in control of your own business.",ic:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,c:T.violet,cs:T.violetSoft},
        ].map((f,i)=>(
          <Reveal key={f.t} delay={i*100}>
            <div className="lift" style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:20,padding:isMobile?24:28,height:"100%",boxShadow:SHADOW}}>
              <div style={{width:52,height:52,borderRadius:15,background:f.cs,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18}}><Ico d={f.ic} c={f.c} s={26}/></div>
              <h3 style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,margin:"0 0 10px",letterSpacing:"-.4px"}}>{f.t}</h3>
              <p style={{fontSize:14.5,color:T.sub,lineHeight:1.65,margin:0}}>{f.b}</p>
            </div>
          </Reveal>))}
      </div>
    </div>

    {/* ── How it works ── */}
    <div id="how" style={{background:T.surface2,padding:isMobile?"48px 20px":"80px 40px"}}>
      <div style={{maxWidth:maxW,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:isMobile?32:52}}>
          <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
          <Reveal delay={80}><h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 14px",lineHeight:1.1}}>Three steps. Then we handle it.</h2></Reveal>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:isMobile?20:26}}>
          {[
            {n:"1",t:"Tell us about your business",b:"Share your business name, address, phone and category once. That is all we need to start."},
            {n:"2",t:"We get you listed",b:"We submit and verify your business across dozens of directories, and monitor them constantly."},
            {n:"3",t:"You watch it grow",b:"Track live listings, your visibility score and new activity from one simple dashboard. We do the work."},
          ].map((s,i)=>(
            <Reveal key={s.n} delay={i*120}>
              <div style={{position:"relative",background:T.surface,borderRadius:20,padding:isMobile?26:30,border:`1px solid ${T.line}`,boxShadow:SHADOW,height:"100%"}}>
                <div style={{fontFamily:FONT_D,fontSize:56,fontWeight:800,color:T.brandSoft,lineHeight:.8,letterSpacing:"-3px",marginBottom:14}}>{s.n}</div>
                <h3 style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,margin:"0 0 10px",letterSpacing:"-.4px"}}>{s.t}</h3>
                <p style={{fontSize:14.5,color:T.sub,lineHeight:1.65,margin:0}}>{s.b}</p>
              </div>
            </Reveal>))}
        </div>
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

    {/* ── Dashboard tour ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"48px 20px":"80px 40px"}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?28:56,alignItems:"center"}}>
        <div>
          <Reveal><Eyebrow color={T.violet}>Your dashboard</Eyebrow></Reveal>
          <Reveal delay={80}><h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:40,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 18px",lineHeight:1.1}}>Everything in plain English. No jargon.</h2></Reveal>
          <Reveal delay={140}><p style={{fontSize:isMobile?15.5:17,color:T.sub,lineHeight:1.65,margin:"0 0 24px"}}>You are busy running your business. Your dashboard shows what matters in seconds, and flags the rare times we need something from you.</p></Reveal>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {[
              ["See every listing at a glance","Live, pending and needs-attention, all on one screen."],
              ["One visibility score","A single number for your online health that climbs as we work."],
              ["Know what needs you","We flag the rare action needed, so nothing ever stalls."],
            ].map(([t,b],i)=>(
              <Reveal key={t} delay={180+i*80}>
                <div style={{display:"flex",gap:13,alignItems:"flex-start"}}>
                  <div style={{width:26,height:26,borderRadius:8,background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.green} s={16}/></div>
                  <div><div style={{fontSize:15.5,fontWeight:800,marginBottom:2}}>{t}</div><div style={{fontSize:14,color:T.sub,lineHeight:1.55}}>{b}</div></div>
                </div>
              </Reveal>))}
          </div>
        </div>
        <Reveal delay={200}>
          <div className="lift" style={{background:T.surface,borderRadius:22,padding:isMobile?18:24,boxShadow:"0 24px 60px -18px rgba(23,23,50,.24)",border:`1px solid ${T.line}`}}>
            {[["Home","Live listings, score, what needs action"],["Listings","Every directory, its status and live link"],["Analytics","Your growth over time in simple charts"],["Plan & Billing","Plan, invoices, card and secure cancellation"],["Book a Call","Time with your dedicated manager, anytime"]].map(([t,b],idx,arr)=>(
              <div key={t} style={{display:"flex",gap:13,padding:"13px 4px",borderBottom:idx<arr.length-1?`1px solid ${T.line}`:"none",alignItems:"center"}}>
                <div style={{width:40,height:40,borderRadius:12,background:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ico d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} c={T.brand} s={18}/></div>
                <div><div style={{fontSize:14.5,fontWeight:800}}>{t}</div><div style={{fontSize:12.5,color:T.faint}}>{b}</div></div>
              </div>))}
          </div>
        </Reveal>
      </div>
    </div>

    {/* ── Social proof ── */}
    <div style={{background:T.surface2,padding:isMobile?"48px 20px":"72px 40px"}}>
      <div style={{maxWidth:maxW,margin:"0 auto"}}>
        <Reveal><div style={{textAlign:"center",marginBottom:isMobile?30:44}}><Eyebrow color={T.green}>Loved by local businesses</Eyebrow><h2 style={{fontFamily:FONT_D,fontSize:isMobile?26:38,fontWeight:800,letterSpacing:"-1.2px",margin:0,lineHeight:1.1}}>Owners who stopped worrying about listings</h2></div></Reveal>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:isMobile?16:22}}>
          {[
            {q:"We were getting calls at an old number for months and had no idea. NAP Orbit fixed it everywhere in a week. The phone actually rings now.",n:"Mike D.",r:"Plumbing, Austin TX"},
            {q:"I do not have time to manage dozens of websites. I check one dashboard and everything is just handled. That is worth every penny.",n:"Sarah M.",r:"Dental clinic, Houston TX"},
            {q:"Someone changed our hours on Google and we lost a whole Saturday of walk-ins. Now that never happens. They catch it instantly.",n:"John D.",r:"Auto repair, Dallas TX"},
          ].map((t,i)=>(
            <Reveal key={t.n} delay={i*100}>
              <div style={{background:T.surface,borderRadius:20,padding:isMobile?24:28,border:`1px solid ${T.line}`,boxShadow:SHADOW,height:"100%",display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",gap:3,marginBottom:16}}>{[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={17}/>)}</div>
                <p style={{fontSize:15,color:T.ink,lineHeight:1.6,margin:"0 0 18px",fontWeight:500,flex:1}}>"{t.q}"</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:16}}>{t.n[0]}</div>
                  <div><div style={{fontSize:14,fontWeight:800}}>{t.n}</div><div style={{fontSize:12.5,color:T.faint}}>{t.r}</div></div>
                </div>
              </div>
            </Reveal>))}
        </div>
        <Reveal delay={200}><div style={{textAlign:"center",marginTop:22,fontSize:12.5,color:T.faint,fontStyle:"italic"}}>Illustrative examples shown for demonstration.</div></Reveal>
      </div>
    </div>

    {/* ── Pricing teaser ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"48px 20px":"80px 40px"}}>
      <div style={{textAlign:"center",marginBottom:isMobile?30:44}}>
        <Reveal><Eyebrow>Simple pricing</Eyebrow></Reveal>
        <Reveal delay={80}><h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.2px",margin:"0 0 12px",lineHeight:1.1}}>One flat monthly price. No credits, no games.</h2></Reveal>
        <Reveal delay={140}><p style={{fontSize:isMobile?15.5:17,color:T.sub,maxWidth:520,margin:"0 auto",lineHeight:1.6}}>Pick a plan and we get to work. Cancel anytime before your renewal.</p></Reveal>
      </div>
      {(()=>{const cards=[
          {id:"essentials",n:"Essentials",q:"10 listings a month",pop:false,f:["10 directory submissions monthly","NAP consistency management","Unauthorized edit protection","Helps you get found in AI searches","Live dashboard access"]},
          {id:"growth",n:"Growth",q:"20 listings a month",pop:true,f:["20 directory submissions monthly","Everything in Essentials","Helps you get found in AI searches","Expanded directory coverage","Priority support"]},
          {id:"gmb",n:"GMB Pro",q:"20 listings + Google Profile",pop:false,f:["Everything in Growth","Google Business Profile management","Get found in AI searches (ChatGPT, Gemini, AI Overviews)","Monthly posts & Q&A","Dedicated manager"]},
        ].filter(pl=>planLive(pl.id,cfg));
      const gt=isMobile?"1fr":`repeat(${cards.length},1fr)`;
      return(<div style={{display:"grid",gridTemplateColumns:gt,gap:isMobile?16:22,maxWidth:cards.length===1?420:cards.length===2?720:960,margin:"0 auto"}}>
        {cards.map((pl,i)=>(
          <Reveal key={pl.n} delay={i*100}>
            <div className="lift" style={{background:T.surface,borderRadius:20,padding:isMobile?26:30,border:pl.pop?`2px solid ${T.brand}`:`1px solid ${T.line}`,boxShadow:pl.pop?SHADOW_LG:SHADOW,position:"relative",height:"100%",display:"flex",flexDirection:"column"}}>
              {pl.pop&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",fontSize:11,fontWeight:800,padding:"4px 16px",borderRadius:20,letterSpacing:".4px"}}>MOST POPULAR</div>}
              <h3 style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,margin:"0 0 4px"}}>{pl.n}</h3>
              <div style={{margin:"6px 0 4px"}}><span style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,letterSpacing:"-2px"}}>${lprice(pl.id)}</span><span style={{fontSize:15,color:T.faint,fontWeight:600}}>/mo</span></div>
              <div style={{fontSize:13.5,color:T.sub,fontWeight:700,marginBottom:18}}>{pl.q}</div>
              <div style={{height:1,background:T.line,marginBottom:18}}/>
              <div style={{flex:1}}>{pl.f.map(f=>(<div key={f} style={{display:"flex",gap:9,marginBottom:11,alignItems:"flex-start"}}><Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.green} s={17}/><span style={{fontSize:13.5,color:T.sub,lineHeight:1.5}}>{f}</span></div>))}</div>
              <Btn size="md" variant={pl.pop?"primary":"ghost"} style={{width:"100%",marginTop:18}} onClick={go}>Choose {pl.n}</Btn>
            </div>
          </Reveal>))}
      </div>);})()}
    </div>

    {/* ── Final CTA ── */}
    <div style={{maxWidth:maxW,margin:"0 auto",padding:isMobile?"20px 20px 56px":"20px 40px 80px"}}>
      <Reveal>
        <div style={{background:`linear-gradient(135deg,${T.brand},${T.violet})`,borderRadius:isMobile?24:32,padding:isMobile?"40px 26px":"64px 54px",textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-80,right:-60,width:280,height:280,borderRadius:"50%",background:"rgba(255,255,255,.14)",filter:"blur(50px)"}}/>
          <div style={{position:"absolute",bottom:-100,left:-40,width:260,height:260,borderRadius:"50%",background:"rgba(255,255,255,.1)",filter:"blur(50px)"}}/>
          <div style={{position:"relative"}}>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:44,fontWeight:800,color:"#fff",letterSpacing:"-1.5px",margin:"0 0 14px",lineHeight:1.1}}>Ready to get found everywhere?</h2>
            <p style={{fontSize:isMobile?16:18.5,color:"rgba(255,255,255,.9)",margin:"0 auto 28px",maxWidth:500,lineHeight:1.6}}>Set up in minutes. Watch your listings go live and the calls start coming. All tracked in one dashboard.</p>
            <button onClick={go} style={{background:"#fff",color:T.brand,border:"none",borderRadius:14,padding:isMobile?"15px 32px":"17px 42px",fontSize:isMobile?16:18,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,boxShadow:"0 12px 30px rgba(0,0,0,.2)"}}>Get started now</button>
            <div style={{marginTop:16,fontSize:13.5,color:"rgba(255,255,255,.8)",fontWeight:600}}>No setup fees. Cancel anytime.</div>
          </div>
        </div>
      </Reveal>
    </div>

    {/* ── Footer ── */}
    <div style={{borderTop:`1px solid ${T.line}`,padding:isMobile?"26px 20px":"30px 40px"}}>
      <div style={{maxWidth:maxW,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><MiniOrbit size={30}/><span style={{fontWeight:800,fontSize:15,fontFamily:FONT_D}}>NAP Orbit</span></div>
        <div style={{fontSize:13,color:T.faint}}>© {new Date().getFullYear()} NAP Orbit. All rights reserved.</div>
        <div style={{display:"flex",gap:18,fontSize:13.5}}>
          <button onClick={go} style={{background:"none",border:"none",color:T.sub,cursor:"pointer",fontFamily:FONT_B,fontWeight:700}}>Client login</button>
        </div>
      </div>
    </div>
  </div>);
}

