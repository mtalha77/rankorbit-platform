import { Fragment } from "react";
import { T, FONT_D, SHADOW_LG } from "../../lib/theme";
import { Reveal } from "../Reveal";

export function LandingHowItWorks({ isMobile }) {
  return (
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

  );
}
