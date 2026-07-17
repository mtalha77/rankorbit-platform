import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { Eyebrow, Ico } from "./landingShared";

export function LandingBento({ isMobile }) {
  return (
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

  );
}
