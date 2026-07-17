import { T, FONT_D } from "../../lib/theme";
import { Reveal } from "../Reveal";
import CssIoButton from "../CssIoButton";
import { GrowthOrbitGraphic } from "./GrowthOrbitGraphic";

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
            padding:isMobile?"16px 20px 28px":"20px 40px 36px",
            display:"grid",
            gridTemplateColumns:isMobile?"1fr":"1.1fr 0.9fr",
            gap:isMobile?8:24,
            alignItems:"center",
          }}>
            {/* Left copy */}
            <div style={{position:"relative",zIndex:2,paddingBottom:isMobile?8:12}}>
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

            {/* Right: coded growth orbit (no human/cutout image) */}
            <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",alignItems:"center",minHeight:isMobile?300:400}}>
              <GrowthOrbitGraphic isMobile={isMobile}/>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
