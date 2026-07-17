import { useState, useEffect } from "react";
import { T, FONT_B } from "../../lib/theme";
import { api } from "../../lib/api";
import { isBookingPast } from "../../lib/helpers";
import { Badge, Card, Btn, Input, Empty, PageHead } from "../atoms";
import { filterVisibleStaffNotifs } from "./adminUtils";

export function NotificationsPage({user,isAdmin,isMobile,toast,setNotifBadge,setSelClient,setPage}){
  const[notifs,setNotifs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[busyId,setBusyId]=useState(null);
  const[openId,setOpenId]=useState(null);
  const[zoomByNotif,setZoomByNotif]=useState({});
  const[zoomErr,setZoomErr]=useState({});
  const load=async()=>{
    setLoading(true);
    const rows=await api.listMyNotifications();
    const live=filterVisibleStaffNotifs(rows,user.role);
    setNotifs(live);
    setNotifBadge(live.filter(n=>!n.read).length);
    setLoading(false);
  };
  useEffect(()=>{load();},[user.id,user.role]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread=notifs.filter(n=>!n.read);
  const markAll=async()=>{
    const ids=unread.map(n=>n.id);
    if(!ids.length)return;
    await api.markNotificationsRead(ids);
    setNotifs(prev=>prev.map(n=>({...n,read:true})));
    setNotifBadge(0);
  };
  const openOne=async(n)=>{
    setOpenId(prev=>prev===n.id?null:n.id);
    if(!n.read){
      await api.markNotificationsRead([n.id]);
      setNotifs(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x));
      setNotifBadge(c=>Math.max(0,c-1));
    }
  };
  const respond=async(n,action)=>{
    const bookingId=n.meta?.bookingId;
    if(!bookingId){toast("This notification has no booking linked","info");return;}
    const meetingUrl=(zoomByNotif[n.id]||"").trim();
    if(action==="confirm"||action==="share_link"){
      if(!meetingUrl){
        setZoomErr(prev=>({...prev,[n.id]:"Zoom / meeting link is required"}));
        return;
      }
      try{new URL(meetingUrl);}catch{
        setZoomErr(prev=>({...prev,[n.id]:"Enter a valid Zoom link (https://…)"}));
        return;
      }
    }
    setZoomErr(prev=>({...prev,[n.id]:""}));
    setBusyId(n.id+action);
    const r=await api.respondCall({bookingId,action,notificationId:n.id,meetingUrl:(action==="confirm"||action==="share_link")?meetingUrl:undefined});
    setBusyId(null);
    if(r.error){toast(r.error,"info");return;}
    toast(action==="confirm"
      ?"Meeting confirmed — Zoom link shared with client"
      :action==="share_link"
      ?"Zoom link shared with client"
      :"Meeting cancelled — client notified");
    setNotifs(prev=>prev.map(x=>{
      if(x.id!==n.id&&x.meta?.bookingId!==bookingId)return x;
      return{...x,read:true,meta:{...(x.meta||{}),status:r.status||x.meta?.status,meetingUrl:r.meetingUrl||meetingUrl||null,respondedAt:new Date().toISOString()}};
    }));
  };
  const typeIcon=(t)=>({
    staff_created:"🔑",client_assigned:"👤",client_unassigned:"👤",call_booked:"📅",
    bdm_message:"💬",chat_message:"💬",staff_message:"💬",meeting_confirmed:"✅",meeting_cancelled:"❌",
  }[t]||"🔔");
  const typeLabel=(t)=>({
    staff_created:"Staff",client_assigned:"Assignment",client_unassigned:"Assignment",call_booked:"Meeting",
    bdm_message:"Message",chat_message:"Chat",staff_message:"Team chat",meeting_confirmed:"Meeting",meeting_cancelled:"Meeting",
  }[t]||"Update");
  const canRespond=(n)=>!isAdmin&&n.type==="call_booked"&&n.meta?.bookingId&&(!n.meta?.status||n.meta.status==="pending")&&!n.meta?.reportOnly&&!isBookingPast(n.meta?.slotDate,n.meta?.slotTime);
  const emptySub=isAdmin
    ?"Team chat pings show here. Client and agent activity stays with managers and agents."
    :"When a client is assigned to you or schedules a meeting, it appears here.";
  return(<div>
    <PageHead isMobile={isMobile} title="Notifications"
      sub={isAdmin?"Team messages only — no client or agent ops alerts":"Client assignments, meeting requests, and messages"}
      right={unread.length>0?<Btn variant="soft" size="sm" onClick={markAll}>Mark all read</Btn>:null}/>
    <Card>
      {loading?(<div style={{padding:28,textAlign:"center",color:T.faint,fontSize:13}}>Loading…</div>):
        notifs.length===0?(<Empty icon="📭" title="No notifications yet" sub={emptySub}/>):(
        <div>
          {notifs.map((n,i)=>(
            <div key={n.id} style={{borderBottom:i<notifs.length-1?`1px solid ${T.line}`:"none"}}>
              <div onClick={()=>openOne(n)} style={{display:"flex",gap:12,padding:"14px 6px",cursor:"pointer",opacity:n.read?0.85:1}}>
                <div style={{width:36,height:36,borderRadius:10,background:n.read?T.surface2:T.brandSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{typeIcon(n.type)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                    <div style={{fontSize:13.5,fontWeight:n.read?600:800,color:T.ink}}>{n.title}</div>
                    {!n.read&&<span style={{width:8,height:8,borderRadius:"50%",background:T.brand,flexShrink:0,marginTop:5}}/>}
                  </div>
                  {n.body&&<div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.45}}>{n.body}</div>}
                  <div style={{fontSize:11,color:T.faint,marginTop:5}}>
                    {typeLabel(n.type)}
                    {n.meta?.agentName?` · ${n.meta.agentName}`:""}
                    {n.createdAt?` · ${new Date(n.createdAt).toLocaleString()}`:""}
                    {n.meta?.status&&n.meta.status!=="pending"?` · ${n.meta.status}`:""}
                    {canRespond(n)?" · Action needed":""}
                    {isAdmin&&n.type==="call_booked"&&(!n.meta?.status||n.meta.status==="pending")&&!isBookingPast(n.meta?.slotDate,n.meta?.slotTime)?" · Awaiting agent":""}
                  </div>
                </div>
              </div>
              {openId===n.id&&canRespond(n)&&(
                <div style={{padding:"0 6px 14px 54px"}}>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11.5,fontWeight:700,color:T.sub,marginBottom:6}}>Zoom / meeting link (required)</div>
                    <input
                      value={zoomByNotif[n.id]||""}
                      onChange={e=>{setZoomByNotif(prev=>({...prev,[n.id]:e.target.value}));setZoomErr(prev=>({...prev,[n.id]:""}));}}
                      placeholder="https://zoom.us/j/…"
                      style={{width:"100%",maxWidth:420,padding:"10px 12px",borderRadius:10,border:`1.5px solid ${zoomErr[n.id]?T.red:T.line}`,background:T.surface,color:T.ink,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box"}}
                    />
                    {zoomErr[n.id]&&<div style={{fontSize:11,color:T.red,marginTop:5,fontWeight:600}}>{zoomErr[n.id]}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Btn variant="green" size="sm" disabled={!!busyId} onClick={()=>respond(n,"confirm")}>
                      {busyId===n.id+"confirm"?"Confirming…":"Confirm + share link"}
                    </Btn>
                    <Btn variant="danger" size="sm" disabled={!!busyId} onClick={()=>respond(n,"cancel")}>
                      {busyId===n.id+"cancel"?"Cancelling…":"Cancel meeting"}
                    </Btn>
                  </div>
                </div>
              )}
              {openId===n.id&&n.type==="call_booked"&&n.meta?.status==="confirmed"&&!n.meta?.meetingUrl&&!isAdmin&&(
                <div style={{padding:"0 6px 14px 54px"}}>
                  <div style={{fontSize:12.5,color:T.amber,fontWeight:700,marginBottom:10}}>Confirmed without a join link — share one so the client can join.</div>
                  <div style={{marginBottom:10}}>
                    <input
                      value={zoomByNotif[n.id]||""}
                      onChange={e=>{setZoomByNotif(prev=>({...prev,[n.id]:e.target.value}));setZoomErr(prev=>({...prev,[n.id]:""}));}}
                      placeholder="https://zoom.us/j/…"
                      style={{width:"100%",maxWidth:420,padding:"10px 12px",borderRadius:10,border:`1.5px solid ${zoomErr[n.id]?T.red:T.line}`,background:T.surface,color:T.ink,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box"}}
                    />
                    {zoomErr[n.id]&&<div style={{fontSize:11,color:T.red,marginTop:5,fontWeight:600}}>{zoomErr[n.id]}</div>}
                  </div>
                  <Btn variant="green" size="sm" disabled={!!busyId} onClick={()=>respond(n,"share_link")}>
                    {busyId===n.id+"share_link"?"Sharing…":"Share Zoom link"}
                  </Btn>
                </div>
              )}
              {openId===n.id&&n.type==="call_booked"&&n.meta?.status&&n.meta.status!=="pending"&&!(n.meta.status==="confirmed"&&!n.meta?.meetingUrl&&!isAdmin)&&(
                <div style={{padding:"0 6px 14px 54px",fontSize:12.5,color:n.meta.status==="confirmed"?T.green:T.amber,fontWeight:700}}>
                  Meeting {n.meta.status}.{isAdmin?"":" Client has been notified."}
                  {n.meta.meetingUrl&&(
                    <div style={{marginTop:6,fontWeight:600}}>
                      Link: <a href={n.meta.meetingUrl} target="_blank" rel="noreferrer" style={{color:T.brand}}>{n.meta.meetingUrl}</a>
                    </div>
                  )}
                </div>
              )}
              {openId===n.id&&(n.type==="client_assigned"||n.type==="client_unassigned"||n.type==="call_booked"||n.type==="bdm_message"||n.type==="chat_message"||n.type==="meeting_confirmed"||n.type==="meeting_cancelled")&&n.clientId&&(
                <div style={{padding:"0 6px 14px 54px",display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn variant="soft" size="sm" onClick={()=>{setSelClient(n.clientId);setPage("clientDetail");}}>Open client →</Btn>
                  {(n.type==="chat_message"||n.type==="bdm_message")&&(
                    <Btn size="sm" onClick={()=>{setSelClient(n.clientId);setPage("messages");}}>Open chat →</Btn>
                  )}
                </div>
              )}
              {openId===n.id&&n.type==="staff_message"&&(
                <div style={{padding:"0 6px 14px 54px"}}>
                  <Btn size="sm" onClick={()=>setPage("messages")}>Open chat →</Btn>
                </div>
              )}
              {openId===n.id&&n.type==="staff_created"&&isAdmin&&(
                <div style={{padding:"0 6px 14px 54px"}}>
                  <Btn variant="soft" size="sm" onClick={()=>setPage("team")}>Open Team →</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  </div>);
}
