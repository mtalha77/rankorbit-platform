import { FONT_D } from "../../lib/theme";
import CssIoButton from "../CssIoButton";
import CtaFillButton from "../CtaFillButton";
import { Reveal } from "../Reveal";
import { HeroScene } from "./HeroScene";

export function LandingHero({ isMobile, isTab, user, goDash, goSignup }) {
  return (
    <div style={{position:"relative",overflow:"hidden",background:"#080a1e"}}>
      <HeroScene isMobile={isMobile} />
      {/* Shade only where the copy sits, so the artwork is never dimmed: bottom-up
          on mobile (copy below the art), left-to-right on desktop (copy beside it). */}
      <div aria-hidden="true" style={{position:"absolute",inset:0,background:isMobile?"linear-gradient(180deg,rgba(15,15,28,0) 0%,rgba(15,15,28,.12) 32%,rgba(15,15,28,.48) 58%,rgba(15,15,28,.62) 100%)":"linear-gradient(90deg,rgba(15,15,28,.62) 0%,rgba(15,15,28,.46) 30%,rgba(15,15,28,.16) 50%,rgba(15,15,28,0) 66%)"}}/>
      <div style={{position:"relative",maxWidth:1400,margin:"0 auto",padding:isMobile?"96px 8px 40px":"132px 8px 64px",textAlign:"left",width:"100%",boxSizing:"border-box"}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,0.78fr) minmax(0,1.22fr)",gap:isMobile?36:40,alignItems:"center"}}>
          <div>
            <Reveal delay={80}>
              <h1 style={{fontFamily:FONT_D,fontSize:isMobile?36:isTab?48:58,fontWeight:800,lineHeight:1.06,letterSpacing:isMobile?"-1.5px":"-2.2px",margin:"0 0 18px",maxWidth:640,color:"#fff",textShadow:"0 2px 24px rgba(0,0,0,.25)"}}>
                When customers<br/>search, make sure they find <span style={{color:"#B8B8FF",position:"relative"}}>you</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p style={{fontSize:isMobile?16:18.5,color:"rgba(255,255,255,.88)",lineHeight:1.6,maxWidth:590,margin:"0 0 28px",fontWeight:450,textShadow:"0 1px 12px rgba(0,0,0,.2)"}}>
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

          {/* Kept empty on purpose — the animated map scene shows through here.
              On mobile it leads, so the art sits above the copy. */}
          <div aria-hidden="true" style={{minHeight:isMobile?300:440,order:isMobile?-1:0}}/>
        </div>
      </div>
    </div>
  );
}
