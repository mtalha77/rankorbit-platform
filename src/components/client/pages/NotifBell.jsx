import { T, FONT_D, FONT_B, SHADOW_LG } from "../../../lib/theme";
import { useClient } from "../ClientContext";

export function NotifBell() {
  const { notifOpen, setNotifOpen, unreadSys, isMobile, markAllRead, setPage, recentNotifs, openNotif, notifIcon } = useClient();
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>{setNotifOpen(o=>!o);}} aria-label="Notifications" style={{position:"relative",width:42,height:42,borderRadius:12,background:notifOpen?T.brandSoft:T.surface,border:`1.5px solid ${notifOpen?T.brand:T.line}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={notifOpen?T.brand:T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unreadSys>0&&<span style={{position:"absolute",top:-3,right:-3,background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,minWidth:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"2px solid #fff"}}>{unreadSys}</span>}
      </button>
      {notifOpen&&(<><div style={{position:"fixed",inset:0,zIndex:80}} onClick={()=>setNotifOpen(false)}/>
        <div className="pop" style={{position:"absolute",top:50,right:0,width:isMobile?280:340,maxWidth:"min(340px, calc(100vw - 24px))",boxSizing:"border-box",background:T.surface,borderRadius:16,boxShadow:SHADOW_LG,border:`1px solid ${T.line}`,zIndex:90,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,minWidth:0}}>
            <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,flexShrink:0}}>Notifications</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:1,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {unreadSys>0&&<button onClick={markAllRead} style={{background:"none",border:"none",color:T.brand,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,whiteSpace:"nowrap",padding:0}}>Mark all read</button>}
              <button onClick={()=>{setNotifOpen(false);setPage("notifications");}} style={{background:"none",border:"none",color:T.sub,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,whiteSpace:"nowrap",padding:0}}>View all</button>
            </div>
          </div>
          <div style={{maxHeight:360,overflowY:"auto",overflowX:"hidden"}}>
            {recentNotifs.length===0?<div style={{padding:"26px 16px",textAlign:"center",fontSize:13,color:T.faint}}>You're all caught up.</div>:
              recentNotifs.map(a=>(<div key={a.id} onClick={()=>openNotif(a)} className="hoverRow" style={{display:"flex",gap:11,padding:"13px 16px",borderBottom:`1px solid ${T.line}`,alignItems:"flex-start",cursor:"pointer",opacity:a.read?0.9:1,background:a.read?"transparent":T.brandSoft,minWidth:0}}>
                <span style={{fontSize:16,marginTop:1,flexShrink:0}}>{notifIcon(a.type)}</span>
                <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                  <div style={{fontSize:13,fontWeight:a.read?600:800,lineHeight:1.45,color:T.ink,overflowWrap:"anywhere",wordBreak:"break-word"}}>{a.title}</div>
                  {a.desc&&a.desc!==a.title&&<div style={{fontSize:12,color:T.sub,marginTop:3,lineHeight:1.4,overflowWrap:"anywhere",wordBreak:"break-word"}}>{a.desc}</div>}
                  <div style={{fontSize:11,color:T.faint,marginTop:4}}>{a.date}</div>
                </div>
                {!a.read&&<span style={{width:8,height:8,borderRadius:"50%",background:T.brand,flexShrink:0,marginTop:6}}/>}
              </div>))}
          </div>
        </div></>)}
    </div>
  );
}
