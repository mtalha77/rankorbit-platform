import { T, FONT_D, SHADOW, SHADOW_LG } from "../../lib/theme";
import { Reveal } from "../Reveal";

export function LandingAiDiscovery({ isMobile }) {
  return (
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

  );
}
