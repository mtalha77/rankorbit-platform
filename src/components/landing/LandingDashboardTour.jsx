import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { Ico } from "./landingShared";
import { DashboardPreview } from "./DashboardPreview";

export function LandingDashboardTour({ isMobile }) {
  return (
    <div style={{background:`linear-gradient(180deg,#FAF9FF 0%,#F0F2FA 55%,#EEF0F8 100%)`,padding:isMobile?"48px 16px":"80px 24px"}}>
      <div style={{maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"grid",gridTemplateColumns:isMobile?"1fr":"0.95fr 1.15fr",gap:isMobile?32:48,alignItems:"center"}}>
        {/* Left copy */}
        <div>
          <Reveal>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:T.violetSoft,border:`1px solid rgba(138,79,216,.2)`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.violet,letterSpacing:".5px",marginBottom:16}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.violet}}/>
              YOUR DASHBOARD
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.3px",margin:"0 0 14px",lineHeight:1.12,color:T.ink}}>
              Your online presence.<br/>One <span style={{color:T.brand}}>clear</span> view.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{fontSize:isMobile?15:16.5,color:T.sub,lineHeight:1.65,margin:"0 0 22px",maxWidth:440}}>
              See every listing, understand your visibility and act only when something genuinely needs your attention.
            </p>
          </Reveal>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[
              {t:"Every listing at a glance",b:"Live, pending and needs-attention in one view.",icon:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,bg:T.brandSoft,c:T.brand},
              {t:"One visibility score",b:"Understand your online health instantly.",icon:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,bg:T.blueSoft,c:T.blue},
              {t:"Only relevant actions",b:"We flag the rare task that genuinely needs you.",icon:<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></>,bg:T.violetSoft,c:T.violet},
            ].map((f,i)=>(
              <Reveal key={f.t} delay={140+i*70}>
                <div className="lift" style={{display:"flex",gap:14,alignItems:"center",background:"#fff",border:`1px solid ${T.line}`,borderRadius:16,padding:"14px 16px",boxShadow:SHADOW}}>
                  <div style={{width:42,height:42,borderRadius:12,background:f.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ico d={f.icon} c={f.c} s={20}/>
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:T.ink,marginBottom:2}}>{f.t}</div>
                    <div style={{fontSize:13.5,color:T.sub,lineHeight:1.45}}>{f.b}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div style={{marginTop:18,fontSize:13,color:T.faint,fontWeight:600}}>Built for busy local business owners.</div>
          </Reveal>
        </div>

        {/* Right: dashboard mockup */}
        <Reveal delay={160}>
          <DashboardPreview isMobile={isMobile} chartId="tourDashChartFill" />
        </Reveal>
      </div>
    </div>
  );
}
