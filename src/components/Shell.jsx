// ─── SHELL (nav + layout) ────────────────────────────────────────────────────
import { useState } from "react";
import { T, FONT_B, SHADOW_LG } from "../lib/theme";
import { useWindowSize } from "../hooks";

export default function Shell({user,nav,page,setPage,onLogout,planBadge,badgeCounts={},children,brandTag,showLegalLinks=false,headerRight=null}){
  const w=useWindowSize();const isMobile=w<820;
  const[open,setOpen]=useState(false);
  const go=(id)=>{setPage(id);setOpen(false);};
  const openLegal=()=>{setPage("legal");setOpen(false);};

  const sideStyle={
    width:isMobile?272:236,
    background:T.surface,
    borderRight:`1px solid ${T.line}`,
    display:"flex",
    flexDirection:"column",
    flexShrink:0,
    ...(isMobile?{
      position:"fixed",
      top:0,
      left:open?0:"-290px",
      height:"100vh",
      zIndex:200,
      transition:"left .28s cubic-bezier(.22,.8,.36,1)",
      boxShadow:open?SHADOW_LG:"none",
    }:{}),
  };

  return(
    <div style={{display:"flex",height:"100vh",background:T.bg,color:T.ink,fontFamily:FONT_B,overflow:"hidden"}}>
      <div style={sideStyle}>
        <div style={{padding:"20px 18px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div>
                <img src="/nap-orbit-logo.png" alt="NAP Orbit" style={{height:22,width:"auto",display:"block"}}/>
                {brandTag&&<div style={{fontSize:9.5,fontWeight:800,color:T.red,letterSpacing:".6px",marginTop:3}}>{brandTag}</div>}
              </div>
            </div>
            {isMobile&&(
              <button type="button" onClick={()=>setOpen(false)} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:30,height:30,borderRadius:"50%"}}>×</button>
            )}
          </div>
          {planBadge}
        </div>
        <nav style={{flex:1,overflowY:"auto",paddingBottom:10}}>
          {nav.map((item)=>{
            const active=page===item.id||(item.match&&item.match.includes(page));
            return(
              <div
                key={item.id}
                className="navItem"
                role="button"
                tabIndex={0}
                onClick={()=>go(item.id)}
                onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" ")go(item.id);}}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:11,
                  padding:"10px 14px",
                  margin:"2px 10px",
                  cursor:"pointer",
                  color:active?T.brand:T.sub,
                  background:active?T.brandSoft:"transparent",
                  borderRadius:12,
                  fontWeight:active?800:600,
                  fontSize:13.5,
                }}
              >
                <span style={{fontSize:16}}>{item.icon}</span>
                <span>{item.label}</span>
                {badgeCounts[item.id]>0&&(
                  <span style={{marginLeft:"auto",background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"2px 7px"}}>
                    {badgeCounts[item.id]}
                  </span>
                )}
                {item.locked&&<span style={{marginLeft:"auto",fontSize:11,color:T.faint}}>🔒</span>}
              </div>
            );
          })}
        </nav>
        <div style={{padding:"14px 16px 18px",borderTop:`1px solid ${T.line}`}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>
              {user.avatar||(user.name||"?")[0]}
            </div>
            <div style={{overflow:"hidden",flex:1}}>
              <div style={{fontSize:12.5,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.businessName||user.name}</div>
              <div style={{fontSize:10.5,color:T.faint,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
            </div>
          </div>
          <button type="button" onClick={onLogout} style={{width:"100%",padding:"9px 0",background:T.surface2,border:`1px solid ${T.line}`,borderRadius:10,color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            <span style={{fontSize:13}}>↪</span> Sign Out
          </button>
          {showLegalLinks&&(
            <div style={{marginTop:10,textAlign:"center",fontSize:11.5,color:T.faint,lineHeight:1.5}}>
              <span onClick={openLegal} style={{cursor:"pointer",textDecoration:"underline",color:T.sub}}>Terms</span>
              <span style={{margin:"0 6px",color:T.line}}>·</span>
              <span onClick={openLegal} style={{cursor:"pointer",textDecoration:"underline",color:T.sub}}>Privacy</span>
            </div>
          )}
        </div>
      </div>

      {isMobile&&open&&(
        <div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.35)",zIndex:199}} onClick={()=>setOpen(false)}/>
      )}

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {isMobile&&(
          <div style={{padding:"13px 16px",background:T.surface,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:12,flexShrink:0,justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button type="button" onClick={()=>setOpen(true)} style={{background:T.surface2,border:"none",color:T.ink,fontSize:17,cursor:"pointer",width:36,height:36,borderRadius:10}}>☰</button>
              <img src="/nap-orbit-logo.png" alt="NAP Orbit" style={{height:20,width:"auto",display:"block"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {headerRight}
              <button type="button" onClick={onLogout} style={{background:"none",border:"none",color:T.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Sign Out ↪</button>
            </div>
          </div>
        )}
        {!isMobile&&headerRight&&(
          <div style={{padding:"12px 34px 0",display:"flex",justifyContent:"flex-end",flexShrink:0}}>
            {headerRight}
          </div>
        )}
        <div style={{flex:1,overflow:"auto",padding:isMobile?"18px 16px 40px":"30px 34px 50px"}}>
          {children}
        </div>
      </div>
    </div>
  );
}
