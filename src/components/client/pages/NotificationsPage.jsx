import { T } from "../../../lib/theme";
import { Card, Btn, Empty, PageHead } from "../../atoms";
import { useClient } from "../ClientContext";

export function NotificationsPage() {
  const { isMobile, unreadSys, markAllRead, liveNotifs, markOneRead, setPage, notifTarget, notifIcon } = useClient();
  return (
    <div>
      <PageHead isMobile={isMobile} title="Notifications" sub="Meeting updates, BDM messages, and account alerts"
        right={unreadSys>0?<Btn variant="soft" size="sm" onClick={markAllRead}>Mark all read</Btn>:null}/>
      <Card>
        {liveNotifs.length===0?(
          <Empty icon="📭" title="No notifications yet" sub="When your BDM confirms a meeting or updates your account, it shows up here."/>
        ):(
          <div>
            {liveNotifs.map((n,i)=>(
              <div key={n.id} onClick={async()=>{await markOneRead(n.id);setPage(notifTarget(n.type));}}
                style={{display:"flex",gap:12,padding:"14px 6px",borderBottom:i<liveNotifs.length-1?`1px solid ${T.line}`:"none",cursor:"pointer",opacity:n.read?0.9:1}}>
                <div style={{width:36,height:36,borderRadius:10,background:n.read?T.surface2:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{notifIcon(n.type)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                    <div style={{fontSize:13.5,fontWeight:n.read?600:800,color:T.ink}}>{n.title}</div>
                    {!n.read&&<span style={{width:8,height:8,borderRadius:"50%",background:T.brand,flexShrink:0,marginTop:5}}/>}
                  </div>
                  {n.body&&<div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.45}}>{n.body}</div>}
                  <div style={{fontSize:11,color:T.faint,marginTop:5}}>{n.createdAt?new Date(n.createdAt).toLocaleString():""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
