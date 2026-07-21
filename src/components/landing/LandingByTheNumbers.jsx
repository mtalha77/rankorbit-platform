import { T, FONT_D } from "../../lib/theme";
import { NumbersOrbitGraphic } from "./NumbersOrbitGraphic";
import { StatNumberCard } from "./landingShared";

export function LandingByTheNumbers({ isMobile }) {
  return (
    <div style={{background:`linear-gradient(135deg,#0F1028 0%,#171732 45%,#1E1B4B 100%)`,padding:isMobile?"40px 16px":"56px 24px 0",marginTop:0,position:"relative",overflow:"visible"}}>
      {/* Soft glow */}
      <div aria-hidden="true" style={{position:"absolute",top:"-20%",right:"-10%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.brand}33,transparent 68%)`,pointerEvents:"none"}}/>
      <div aria-hidden="true" style={{position:"absolute",bottom:"-30%",left:"10%",width:360,height:360,borderRadius:"50%",background:`radial-gradient(circle,${T.green}22,transparent 70%)`,pointerEvents:"none"}}/>

      <div style={{maxWidth:1400,margin:"0 auto",position:"relative",display:"grid",gridTemplateColumns:isMobile?"1fr":"0.95fr 1.15fr",gap:isMobile?28:40,alignItems:"center"}}>
        {/* Left: coded orbit graphic (maps / AI / directories) */}
        <div style={{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",order:isMobile?2:1,minHeight:isMobile?360:560,padding:isMobile?"8px 0 16px":"12px 0 40px"}}>
          <NumbersOrbitGraphic isMobile={isMobile}/>
        </div>

        {/* Right: copy + stat cards */}
        <div style={{paddingBottom:isMobile?8:56,paddingTop:isMobile?0:24,order:isMobile?1:2}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(15,164,122,.12)",border:`1px solid ${T.green}66`,borderRadius:30,fontSize:11.5,fontWeight:800,color:"#fff",letterSpacing:".5px",marginBottom:18}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
            BY THE NUMBERS
          </div>
          <h2 style={{fontFamily:FONT_D,fontSize:isMobile?30:44,fontWeight:800,letterSpacing:"-1.4px",margin:"0 0 12px",lineHeight:1.12,color:"#fff"}}>
            More visibility.<br/>
            <span style={{color:"#fff"}}>Less </span>
            <span style={{color:T.green}}>manual work.</span>
          </h2>
          <p style={{fontSize:isMobile?14.5:16.5,color:"rgba(255,255,255,.65)",lineHeight:1.6,margin:"0 0 28px",maxWidth:480}}>
            NAP Orbit keeps your business accurate and visible everywhere, while protecting your listings around the clock.
          </p>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
            {[
              {
                value:500,suffix:"+",title:"Directories managed",sub:"Google, Apple, Yelp and more",accent:T.green,suffixColor:T.green,
                // Network / connected directories
                icon:<><circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="7" r="1.8"/><circle cx="19" cy="7" r="1.8"/><circle cx="5" cy="17" r="1.8"/><circle cx="19" cy="17" r="1.8"/><path d="M10.2 11.2 6.5 8.2M13.8 11.2l3.7-3M10.2 12.8 6.5 15.8M13.8 12.8l3.7 3"/></>,
              },
              {
                value:99,suffix:"%",title:"Average NAP accuracy",sub:"Consistent details everywhere",accent:T.brand,suffixColor:"#B8B8FF",
                // Target / precision bullseye
                icon:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"/></>,
              },
              {
                value:30,suffix:"+",title:"New listings monthly",sub:"Fresh coverage every month",accent:T.green,suffixColor:T.green,
                // Calendar + sparkle (new listings)
                icon:<><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13.2v4.2M9.9 15.3h4.2"/><path d="M17.5 12.2l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z"/></>,
              },
              {
                value:24,suffix:"/7",title:"Edit protection",sub:"Unauthorized changes caught fast",accent:T.brand,suffixColor:"#B8B8FF",
                // Shield with check
                icon:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12.2l2 2 4.2-4.5"/></>,
              },
            ].map((card)=>(
              <StatNumberCard key={card.title} {...card} isMobile={isMobile}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
