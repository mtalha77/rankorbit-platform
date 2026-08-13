import { T, FONT_D, FONT_B, SHADOW } from "../../lib/theme";
import { Btn } from "../atoms";

// Only transform/opacity are animated — animating top/padding/border-radius
// relayouts the bar every frame, which is what made the switch feel jumpy.
const EASE = "cubic-bezier(.22,1,.36,1)";
const DUR = ".26s";
const FADE = ".2s";

export function LandingNav({ isMobile, navSolid, user, isStaff = false, avatarLetter, displayName, goDash, goLogin, goSignup }) {
  const dashLabel = "Dashboard";
  const inset = isMobile ? 12 : 18;
  const slide = `transform ${DUR} ${EASE}`;

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,pointerEvents:"none"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 8px",boxSizing:"border-box",transform:navSolid?`translateY(${isMobile?10:15}px)`:"translateY(0)",transition:slide,willChange:"transform"}}>
        <div style={{position:"relative"}}>
          {/* The pill itself — fades and settles into place behind the content. */}
          <div
            aria-hidden="true"
            style={{position:"absolute",inset:0,borderRadius:isMobile?18:999,background:"rgba(255,255,255,.82)",backdropFilter:"blur(14px) saturate(150%)",WebkitBackdropFilter:"blur(14px) saturate(150%)",border:`1px solid ${T.line}`,boxShadow:SHADOW,opacity:navSolid?1:0,transform:navSolid?"scale(1)":"scale(1.02)",transition:`opacity ${FADE} ${EASE},transform ${DUR} ${EASE}`,willChange:"transform,opacity",pointerEvents:"none"}}
          />
          <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"11px 0":"13px 0",pointerEvents:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:11,transform:navSolid?`translateX(${inset}px)`:"translateX(0)",transition:slide,willChange:"transform"}}>
              {/* Artwork is black; flip it to white while the nav sits over the dark hero. */}
              <img src="/nap-orbit-logo-nav.png" alt="NAP Orbit" width={140} height={30} style={{height:isMobile?26:30,width:"auto",display:"block",filter:navSolid?"none":"brightness(0) invert(1) drop-shadow(0 1px 10px rgba(0,0,0,.35))",transition:`filter ${FADE} ${EASE}`}}/>
            </div>
            <div style={{display:"flex",gap:isMobile?8:14,alignItems:"center",transform:navSolid?`translateX(-${inset}px)`:"translateX(0)",transition:slide,willChange:"transform"}}>
              {user?(<>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:isMobile?32:36,height:isMobile?32:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:isMobile?13:14,flexShrink:0}}>{avatarLetter}</div>
                  {!isMobile&&<span style={{fontSize:14.5,fontWeight:700,color:navSolid?T.ink:"#fff",textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)",transition:`color ${FADE} ${EASE}`}}>{displayName}</span>}
                </div>
                <Btn size={isMobile?"sm":"md"} onClick={goDash}>{dashLabel}</Btn>
              </>):(<>
                {!isMobile&&<button onClick={goLogin} style={{background:"none",border:"none",color:navSolid?T.sub:"#fff",fontSize:14.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)",transition:`color ${FADE} ${EASE}`}}>Sign in</button>}
                <Btn size={isMobile?"sm":"md"} onClick={goSignup}>Get started</Btn>
              </>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
