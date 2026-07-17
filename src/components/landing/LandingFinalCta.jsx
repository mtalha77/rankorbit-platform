import { T, FONT_D, SHADOW_LG } from "../../lib/theme";
import { Reveal } from "../Reveal";
import CssIoButton from "../CssIoButton";

export function LandingFinalCta({ isMobile, user, goDash, goSignup }) {
  return (
    <div style={{width:"100%",padding:0,boxSizing:"border-box"}}>
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
            padding:isMobile?"16px 20px 0":"20px 40px 0",
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
  );
}
