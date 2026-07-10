// ─── USER MANUAL (guided walkthrough) ────────────────────────────────────────
import { useState } from "react";
import { T, FONT_D, FONT_B } from "../lib/theme";
import { Modal, Btn } from "../components/atoms";

export default function UserManual({user,plan,onClose,goTo}){
  const isGmb=plan?.name==="GMB Pro";
  // Guided walkthrough steps. Each explains one area of the platform.
  const steps=[
    {icon:"👋",name:"Welcome to NAP Orbit",body:`Hi ${user.name?.split(" ")[0]||"there"}! Let's take a quick tour so you know exactly where everything is. It takes about a minute, and you can skip anytime.`,page:null},
    {icon:"🏠",name:"Home",body:"Your starting point every time you log in. See how many listings are live, pending, or need your attention, plus your overall visibility score at a glance.",page:"home"},
    {icon:"📋",name:"Listings",body:"Every directory we're building for you, with live status and a link to each one. Watch for amber \"action needed\" flags, those are the only times we need something from you.",page:"listings"},
    {icon:"📍",name:"GMB Management",body:isGmb?"Your Google Business Profile performance, views, calls, directions, plus the posts and Q&A we manage. Set your monthly report email here too.":"Available on GMB Pro. Upgrade anytime to unlock full Google Business Profile management and monthly reports.",page:"gmb"},
    {icon:"📈",name:"Analytics",body:"Your growth over time in simple charts. See how your listings and visibility improve month over month, no jargon, just progress.",page:"analytics"},
    {icon:"💳",name:"Plan & Billing",body:"Your plan, next charge, invoices, and secure card management. Cancel anytime and keep access until your period ends. Download all your data whenever you like.",page:"billing"},
    {icon:"📞",name:"Book a Call",body:"Grab a 30-minute slot with your dedicated account manager whenever you want to talk strategy or ask questions.",page:"call"},
    {icon:"✅",name:"You're all set",body:"That's the whole platform. Look for \"action needed\" flags, everything else we handle for you. Reopen this tour anytime with the Help button in the corner.",page:null},
  ];
  const[i,setI]=useState(0);
  const step=steps[i];
  const last=i===steps.length-1;
  const pct=Math.round(((i+1)/steps.length)*100);
  return(<Modal open onClose={onClose} title="" width={560}>
    {/* Progress bar */}
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,color:T.faint,marginBottom:7}}>
        <span>Step {i+1} of {steps.length}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontFamily:FONT_B,fontWeight:700,fontSize:11.5,textDecoration:"underline"}}>Skip tour</button>
      </div>
      <div style={{height:6,background:T.surface2,borderRadius:4,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${T.brand},${T.violet})`,borderRadius:4,transition:"width .35s cubic-bezier(.22,.8,.36,1)"}}/>
      </div>
    </div>
    {/* Step content */}
    <div style={{textAlign:"center",padding:"8px 0 4px"}}>
      <div style={{width:72,height:72,borderRadius:20,background:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 18px"}}>{step.icon}</div>
      <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,marginBottom:10,letterSpacing:"-.4px"}}>{step.name}</div>
      <div style={{fontSize:14,color:T.sub,lineHeight:1.65,maxWidth:420,margin:"0 auto 8px"}}>{step.body}</div>
      {step.page&&<button onClick={()=>goTo(step.page)} style={{background:"none",border:"none",color:T.brand,fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:FONT_B,marginTop:4}}>Take me there →</button>}
    </div>
    {/* Nav */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:22}}>
      <Btn variant="ghost" size="sm" onClick={()=>setI(x=>Math.max(0,x-1))} style={{visibility:i===0?"hidden":"visible"}}>← Back</Btn>
      <div style={{display:"flex",gap:6}}>{steps.map((_,idx)=><span key={idx} onClick={()=>setI(idx)} style={{width:i===idx?22:8,height:8,borderRadius:4,background:i===idx?T.brand:T.line,cursor:"pointer",transition:"all .25s"}}/>)}</div>
      {last?<Btn size="sm" onClick={onClose}>Finish ✓</Btn>:<Btn size="sm" onClick={()=>setI(x=>Math.min(steps.length-1,x+1))}>Next →</Btn>}
    </div>
  </Modal>);
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
