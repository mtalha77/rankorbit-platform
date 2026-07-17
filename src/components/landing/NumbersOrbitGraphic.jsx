import { T, FONT_D, SHADOW_LG } from "../../lib/theme";
import { BrandMark } from "./BrandMark";

export function NumbersOrbitGraphic({isMobile}){
  const nodes=[
    {title:"Google Maps",sub:"Ready to discover",angle:-90,color:T.blue,mark:"Google"},
    {title:"Apple Maps",sub:"Listings synchronized",angle:-30,color:T.green,mark:"Apple"},
    {title:"Gemini",sub:"Trusted business data",angle:40,color:T.violet,mark:"Gemini"},
    {title:"AI Search",sub:"AI-ready results",angle:100,color:T.violet,mark:"AIO"},
    {title:"ChatGPT",sub:"AI-powered discovery",angle:160,color:T.green,mark:"ChatGPT"},
    {title:"Directories",sub:"60+ destinations",angle:-150,color:T.brand,mark:null},
  ];
  const orbitR=38; // % from center
  return(
    <div style={{position:"relative",width:"100%",maxWidth:isMobile?340:520,aspectRatio:"1",margin:"0 auto"}} role="img" aria-label="NAP Orbit connected to maps, AI search, and directories">
      {/* Orbit rings */}
      {[86,67,50].map((pct,i)=>(
        <div key={i} aria-hidden="true" style={{
          position:"absolute",left:"50%",top:"50%",
          width:`${pct}%`,height:`${pct}%`,
          marginLeft:`-${pct/2}%`,marginTop:`-${pct/2}%`,
          borderRadius:"50%",
          border:`1px solid rgba(255,255,255,${0.08+i*0.04})`,
          boxShadow:i===0?`inset 0 0 40px rgba(91,91,214,.12)`:"none",
        }}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",animation:`${i%2?"orbitSpin":"orbitSpinR"} ${22+i*6}s linear infinite`}}>
            <span style={{position:"absolute",top:-4,left:"50%",transform:"translateX(-50%)",width:8,height:8,borderRadius:"50%",background:i===1?T.green:T.brand,boxShadow:`0 0 12px ${i===1?T.green:T.brand}`}}/>
          </div>
        </div>
      ))}

      {/* Center hub */}
      <div style={{
        position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:3,
        width:isMobile?"34%":"28%",aspectRatio:"1",borderRadius:"50%",
        background:"radial-gradient(circle at 40% 30%,#3D3A7A 0%,#171732 55%,#0B0C1C 100%)",
        border:"2px solid rgba(255,255,255,.14)",
        boxShadow:"0 16px 48px rgba(0,0,0,.45), 0 0 0 10px rgba(255,255,255,.04)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
      }}>
        <img src="/nap-orbit-logo-removebg-preview.png" alt="" style={{height:isMobile?26:32,width:"auto",display:"block",filter:"brightness(0) invert(1)"}}/>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?11:13,fontWeight:800,color:"#fff",letterSpacing:".4px",lineHeight:1}}>NAP ORBIT</div>
        <div style={{fontSize:isMobile?7.5:8.5,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:".8px"}}>LOCAL VISIBILITY</div>
      </div>

      {/* Destination cards */}
      {nodes.map((n)=>{
        const rad=(n.angle*Math.PI)/180;
        const left=50+orbitR*Math.cos(rad);
        const top=50+orbitR*Math.sin(rad);
        return(
          <div key={n.title} style={{
            position:"absolute",left:`${left}%`,top:`${top}%`,transform:"translate(-50%,-50%)",zIndex:4,
            background:"#fff",borderRadius:14,padding:isMobile?"7px 9px":"10px 12px",
            boxShadow:SHADOW_LG,border:`1px solid ${T.line}`,
            display:"flex",alignItems:"center",gap:8,width:isMobile?132:158,
          }}>
            <div style={{
              width:isMobile?26:30,height:isMobile?26:30,borderRadius:9,flexShrink:0,
              background:`${n.color}18`,display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {n.mark?(
                <BrandMark name={n.mark} size={isMobile?13:15} color={n.color}/>
              ):(
                <svg width={isMobile?13:15} height={isMobile?13:15} viewBox="0 0 24 24" fill="none" stroke={n.color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              )}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:isMobile?11:12.5,fontWeight:800,color:T.ink,fontFamily:FONT_D,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.title}</div>
              <div style={{fontSize:isMobile?9.5:10.5,fontWeight:600,color:T.sub,marginTop:2,lineHeight:1.2}}>{n.sub}</div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
