import { T, FONT_D, FONT_B, SHADOW } from "../../lib/theme";

export function LandingFooter({ isMobile, isTab, user, nav, goDash, goLogin, goSignup, scrollPricing }) {
  return (
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
            <img src="/nap-orbit-logo-removebg-preview.png" alt="NAP Orbit" width={150} height={32} style={{height:isMobile?28:32,width:"auto",display:"block",marginBottom:18}}/>
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
                {t:"500+ directories",c:T.brand},
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
  );
}
