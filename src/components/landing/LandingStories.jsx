import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { Ico } from "./landingShared";

export function LandingStories({ isMobile }) {
  return (
    <div style={{background:`linear-gradient(180deg,#F7F5FC 0%,#EEF0F8 100%)`,padding:isMobile?"48px 16px":"72px 24px"}}>
      <div style={{maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr",gap:isMobile?20:32,alignItems:"end",marginBottom:isMobile?28:36}}>
          <div>
            <Reveal>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",border:`1px solid ${T.line}`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.green,letterSpacing:".5px",marginBottom:16,boxShadow:SHADOW}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.green}}/>
                CUSTOMER STORIES
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:42,fontWeight:800,letterSpacing:"-1.3px",margin:0,lineHeight:1.12,color:T.ink}}>
                Less listing stress.<br/>More calls that <span style={{color:T.brand}}>connect.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div>
              <div style={{fontSize:14.5,color:T.sub,marginBottom:12,fontWeight:600}}>What changes when business information stays accurate:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[
                  {t:"Correct phone",c:T.green},
                  {t:"Accurate hours",c:T.brand},
                  {t:"One dashboard",c:T.blue},
                ].map(x=>(
                  <span key={x.t} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:20,background:"#fff",border:`1px solid ${T.line}`,fontSize:12.5,fontWeight:700,color:T.ink}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:x.c}}/>
                    {x.t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.35fr 1fr",gap:16,alignItems:"stretch"}}>
          {/* Featured dark quote */}
          <Reveal delay={120}>
            <div style={{
              background:`linear-gradient(145deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`,
              borderRadius:24,
              padding:isMobile?"28px 22px":"34px 32px",
              minHeight:isMobile?280:340,
              display:"flex",flexDirection:"column",
              position:"relative",overflow:"hidden",
              height:"100%",boxSizing:"border-box",
            }}>
              <div aria-hidden="true" style={{position:"absolute",top:18,right:22,fontFamily:FONT_D,fontSize:80,fontWeight:800,color:"rgba(255,255,255,.08)",lineHeight:1}}>“</div>
              <div style={{display:"flex",gap:4,marginBottom:18}}>
                {[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={18}/>)}
              </div>
              <p style={{fontFamily:FONT_D,fontSize:isMobile?20:24,fontWeight:700,color:"#fff",lineHeight:1.45,margin:"0 0 auto",letterSpacing:"-.3px",position:"relative",zIndex:1}}>
                “We were getting calls at an old number for months. NAP Orbit fixed it everywhere in a week—the phone actually rings now.”
              </p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:28,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:T.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:18}}>M</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Mike D.</div>
                    <div style={{fontSize:12.5,color:"rgba(255,255,255,.6)"}}>Plumbing · Austin, Texas</div>
                  </div>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:20,background:"rgba(15,164,122,.18)",border:"1px solid rgba(15,164,122,.3)",fontSize:11,fontWeight:800,color:T.green,letterSpacing:".3px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:T.green}}/>
                  PHONE FIXED
                </div>
              </div>
            </div>
          </Reveal>

          {/* Side cards */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Reveal delay={180}>
              <div className="lift" style={{background:"#fff",border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.green}`,borderRadius:20,padding:isMobile?20:24,boxShadow:SHADOW,flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
                  <div style={{display:"flex",gap:3}}>{[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={14}/>)}</div>
                  <span style={{padding:"4px 10px",borderRadius:20,background:T.greenSoft,color:T.green,fontSize:10.5,fontWeight:800,letterSpacing:".3px",whiteSpace:"nowrap"}}>TIME SAVED</span>
                </div>
                <p style={{fontSize:15.5,fontWeight:600,color:T.ink,lineHeight:1.55,margin:"0 0 16px"}}>“I check one dashboard and everything is simply handled.”</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:15}}>S</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>Sarah M.</div>
                    <div style={{fontSize:12,color:T.faint}}>Dental clinic · Houston, Texas</div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="lift" style={{background:"#fff",border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.brand}`,borderRadius:20,padding:isMobile?20:24,boxShadow:SHADOW,flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
                  <div style={{display:"flex",gap:3}}>{[0,1,2,3,4].map(s=><Ico key={s} d={<path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z"/>} c={T.amber} s={14}/>)}</div>
                  <span style={{padding:"4px 10px",borderRadius:20,background:T.violetSoft,color:T.violet,fontSize:10.5,fontWeight:800,letterSpacing:".3px",whiteSpace:"nowrap"}}>EDIT PROTECTED</span>
                </div>
                <p style={{fontSize:15.5,fontWeight:600,color:T.ink,lineHeight:1.55,margin:"0 0 16px"}}>“They caught a harmful hours change before it cost us again.”</p>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:15}}>J</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>John D.</div>
                    <div style={{fontSize:12,color:T.faint}}>Auto repair · Dallas, Texas</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

      </div>
    </div>
  );
}
