import { T, FONT_D } from "../../lib/theme";
import CssIoButton from "../CssIoButton";
import CtaFillButton from "../CtaFillButton";
import { Reveal } from "../Reveal";
import { Eyebrow } from "./landingShared";

export function LandingHero({ isMobile, isTab, user, goDash, goSignup }) {
  return (
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
  );
}
