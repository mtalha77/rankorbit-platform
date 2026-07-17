import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { Eyebrow, Ico } from "./landingShared";
import { PublisherNetworkSVG } from "./PublisherNetworkSVG";

export function LandingPublisherBlock({ isMobile }) {
  return (
    <div style={{maxWidth:1160,margin:"0 auto",padding:isMobile?"48px 20px":"84px 40px"}}>
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

  );
}
