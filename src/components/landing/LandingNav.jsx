import { T, FONT_D, FONT_B } from "../../lib/theme";
import { Btn } from "../atoms";

export function LandingNav({ isMobile, navSolid, user, isStaff = false, avatarLetter, displayName, goDash, goLogin, goSignup }) {
  const dashLabel = isStaff || user?.plan ? "Dashboard" : "Choose a plan";
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:navSolid?"rgba(255,255,255,.86)":"transparent",backdropFilter:navSolid?"blur(12px)":"none",borderBottom:navSolid?`1px solid ${T.line}`:"1px solid transparent",transition:"background .22s ease,border-color .22s ease,backdrop-filter .22s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"13px 8px":"15px 8px",maxWidth:1400,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <img src="/nap-orbit-logo-nav.png" alt="NAP Orbit" width={140} height={30} style={{height:isMobile?26:30,width:"auto",display:"block"}}/>
        </div>
        <div style={{display:"flex",gap:isMobile?8:14,alignItems:"center"}}>
          {user?(<>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:isMobile?32:36,height:isMobile?32:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:isMobile?13:14,flexShrink:0}}>{avatarLetter}</div>
              {!isMobile&&<span style={{fontSize:14.5,fontWeight:700,color:navSolid?T.ink:"#fff",textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)"}}>{displayName}</span>}
            </div>
            <Btn size={isMobile?"sm":"md"} onClick={goDash}>{dashLabel}</Btn>
          </>):(<>
            {!isMobile&&<button onClick={goLogin} style={{background:"none",border:"none",color:navSolid?T.sub:"#fff",fontSize:14.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,textShadow:navSolid?"none":"0 1px 10px rgba(0,0,0,.25)"}}>Sign in</button>}
            <Btn size={isMobile?"sm":"md"} onClick={goSignup}>Get started</Btn>
          </>)}
        </div>
      </div>
    </div>
  );
}
