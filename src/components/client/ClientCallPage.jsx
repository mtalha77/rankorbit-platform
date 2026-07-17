import { useState, useEffect } from "react";
import { T, FONT_D, FONT_B, SHADOW } from "../../lib/theme";
import { api } from "../../lib/api";
import { isBookingPast, CALL_SLOT_TIMES, isSlotStillOpen, slotKey } from "../../lib/helpers";
import { Badge, Card, Btn, Input, Confirm, Empty, PageHead, SectionTitle } from "../atoms";

export function ClientCallPage({user,isMobile,toast,reload,onOpenMessages}){
  const now=new Date();
  const nowY=now.getFullYear();
  const nowM=now.getMonth();
  const startOfToday=new Date(nowY,nowM,now.getDate());
  const maxView=new Date(nowY,nowM+2,1); // current + next 2 months
  const[viewY,setViewY]=useState(nowY);
  const[viewM,setViewM]=useState(nowM);
  const monthName=new Date(viewY,viewM,1).toLocaleString("en-US",{month:"long"});
  const totalDays=new Date(viewY,viewM+1,0).getDate();
  const firstDay=new Date(viewY,viewM,1).getDay();
  const[selDay,setSelDay]=useState(null);
  const[selTime,setSelTime]=useState(null);
  const[note,setNote]=useState("");
  const[busy,setBusy]=useState(false);
  const[bdm,setBdm]=useState(null);
  const[supportPeer,setSupportPeer]=useState(false);
  const[bookings,setBookings]=useState([]);
  const[takenSlots,setTakenSlots]=useState([]);
  const[showScheduler,setShowScheduler]=useState(false);
  const[rescheduleId,setRescheduleId]=useState(null);
  const[loadingCall,setLoadingCall]=useState(true);
  const[confirm,setConfirm]=useState(null);
  const shiftMonth=(delta)=>{
    const d=new Date(viewY,viewM+delta,1);
    const min=new Date(nowY,nowM,1);
    if(d<min||d>maxView)return;
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
    setSelDay(null);
    setSelTime(null);
  };
  const canPrev=new Date(viewY,viewM,1)>new Date(nowY,nowM,1);
  const canNext=new Date(viewY,viewM+1,1)<=maxView;
  const loadCall=async()=>{
    setLoadingCall(true);
    try{
      const r=await api.getMyBdm();
      setBdm(r.agent||null);
      setSupportPeer(!!r.support||!!r.needsBdm);
      const rows=r.bookings||[];
      setBookings(rows);
      setTakenSlots(Array.isArray(r.takenSlots)?r.takenSlots:[]);
      const hasActive=rows.some(b=>(b.status==="pending"||b.status==="confirmed")&&!isBookingPast(b.slotDate,b.slotTime));
      if(hasActive&&!rescheduleId)setShowScheduler(false);
    }finally{
      setLoadingCall(false);
    }
  };
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoadingCall(true);
      const r=await api.getMyBdm();
      if(cancelled)return;
      setBdm(r.agent||null);
      setSupportPeer(!!r.support||!!r.needsBdm);
      const rows=r.bookings||[];
      setBookings(rows);
      setTakenSlots(Array.isArray(r.takenSlots)?r.takenSlots:[]);
      if(rows.some(b=>(b.status==="pending"||b.status==="confirmed")&&!isBookingPast(b.slotDate,b.slotTime)))setShowScheduler(false);
      setLoadingCall(false);
    })();
    return()=>{cancelled=true;};
  },[user.id,user.assignedAgentId]);
  const upcomingBookings=bookings.filter(b=>!isBookingPast(b.slotDate,b.slotTime));
  const activeBooking=upcomingBookings.find(b=>b.status==="confirmed")||upcomingBookings.find(b=>b.status==="pending")||null;
  const showCalendar=!loadingCall&&(showScheduler||!activeBooking);
  const times=CALL_SLOT_TIMES;
  const bdmLabel=supportPeer?(bdm?.name||"a team member"):(bdm?.name||bdm?.email||"your BDM");
  const slotDateLabel=selDay?`${monthName} ${selDay}, ${viewY}`:"";
  const takenKeys=new Set((takenSlots||[]).map(s=>slotKey(s.slotDate,s.slotTime)));
  // While rescheduling, keep the current slot selectable until the new booking replaces it.
  const freeOwnSlot=rescheduleId&&activeBooking?slotKey(activeBooking.slotDate,activeBooking.slotTime):null;
  const availableTimes=selDay
    ? times.filter(t=>{
        const k=slotKey(slotDateLabel,t);
        if(takenKeys.has(k)&&k!==freeOwnSlot)return false;
        return isSlotStillOpen(slotDateLabel,t);
      })
    : [];
  const dayHasSlots=(day)=>{
    const label=`${monthName} ${day}, ${viewY}`;
    return times.some(t=>{
      const k=slotKey(label,t);
      if(takenKeys.has(k)&&k!==freeOwnSlot)return false;
      return isSlotStillOpen(label,t);
    });
  };
  const confirmBooking=async()=>{
    if(!selDay||!selTime)return;
    setBusy(true);
    const r=await api.bookCall({
      slotDate:slotDateLabel,
      slotTime:selTime,
      note,
      replaceBookingId:rescheduleId||undefined,
    });
    setBusy(false);
    if(r.error){toast(r.error,"info");return;}
    if(r.agent){setBdm(r.agent);setSupportPeer(!!r.support||!!r.needsBdm);}
    toast(rescheduleId
      ?"Rescheduled — waiting for confirmation"
      :(r.support||supportPeer)
        ?"Request sent — a team member will confirm"
        :"Request sent — waiting for your BDM to confirm");
    setSelDay(null);setSelTime(null);setNote("");
    setShowScheduler(false);
    setRescheduleId(null);
    await loadCall();
    await reload();
  };
  const cancelMeeting=async()=>{
    if(!activeBooking?.id)return;
    setBusy(true);
    const r=await api.cancelCall({bookingId:activeBooking.id});
    setBusy(false);
    if(r.error){toast(r.error,"info");return;}
    toast("Meeting cancelled");
    setShowScheduler(false);
    setRescheduleId(null);
    await loadCall();
    await reload();
  };
  const startReschedule=()=>{
    if(!activeBooking?.id)return;
    setRescheduleId(activeBooking.id);
    setShowScheduler(true);
    setSelDay(null);
    setSelTime(null);
  };
  const statusLabel=(s)=>({pending:"Awaiting BDM confirmation",confirmed:"Confirmed"}[s]||s);
  const statusColor=(s)=>s==="confirmed"?T.green:T.amber;
  return(<div>
    <PageHead isMobile={isMobile} title="Book a Call" sub={bdm?`30 minutes with ${supportPeer?(bdm.name||"our team"):(bdm.name||"your BDM")}`:"30 minutes with your dedicated Business Development Manager"}/>
    {loadingCall&&(
      <Card style={{marginBottom:16,padding:28,textAlign:"center",color:T.faint,fontSize:13}}>
        Loading your meeting…
      </Card>
    )}

    {!loadingCall&&bdm&&(<Card style={{marginBottom:16,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".7px"}}>{supportPeer?"YOUR TEAM CONTACT":"YOUR BDM"}</div>
        <div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>{bdm.name||(supportPeer?"Team support":"Assigned manager")}</div>
        {bdm.email&&<div style={{fontSize:12.5,color:T.sub}}>{bdm.email}</div>}
      </div>
      <div style={{fontSize:12,color:T.sub}}>
        {supportPeer
          ?"No dedicated BDM yet — a manager can take this call and assign one."
          :"You'll get matched automatically when you subscribe if you don't have one yet."}
      </div>
    </Card>)}

    {!loadingCall&&!bdm&&(
      <Card style={{marginBottom:16,padding:"14px 16px",background:T.amberSoft,border:`1.5px solid ${T.amber}33`}}>
        <div style={{fontSize:13,fontWeight:800,color:T.amber,marginBottom:6}}>Team temporarily unavailable</div>
        <div style={{fontSize:12.5,color:T.sub,lineHeight:1.45,marginBottom:10}}>No agent or manager is free to take calls right now. Try again shortly, or message us.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn variant="soft" size="sm" onClick={()=>loadCall()}>Try again</Btn>
          {typeof onOpenMessages==="function"&&<Btn size="sm" onClick={onOpenMessages}>Open Messages →</Btn>}
        </div>
      </Card>
    )}

    {!loadingCall&&activeBooking&&!showScheduler&&(
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${activeBooking.status==="confirmed"?T.greenSoft:T.amberSoft},#fff)`,border:`1.5px solid ${activeBooking.status==="confirmed"?T.green:T.amber}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:".7px",color:statusColor(activeBooking.status)}}>YOUR MEETING</div>
            <div style={{fontFamily:FONT_D,fontSize:20,fontWeight:800,marginTop:4}}>
              {activeBooking.slotDate} · {activeBooking.slotTime}
            </div>
          </div>
          <span style={{fontSize:11.5,fontWeight:800,color:statusColor(activeBooking.status),background:"#fff",padding:"5px 12px",borderRadius:20}}>
            {statusLabel(activeBooking.status)}
          </span>
        </div>
        <div style={{fontSize:13.5,color:T.ink,marginBottom:6}}>
          With <b>{activeBooking.agent?.name||bdmLabel}</b>
          {activeBooking.agent?.email?` · ${activeBooking.agent.email}`:""}
        </div>
        {activeBooking.note&&<div style={{fontSize:12.5,color:T.sub,marginBottom:10}}>Note: {activeBooking.note}</div>}
        {activeBooking.status==="pending"&&(
          <div style={{fontSize:12.5,color:T.sub,marginBottom:12}}>
            {supportPeer
              ?"A team member will confirm and share a Zoom link here. Your dedicated BDM is being assigned."
              :"Your BDM will confirm and share a Zoom link here."}
          </div>
        )}
        {activeBooking.meetingUrl?(
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
            <a href={activeBooking.meetingUrl} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 18px",background:T.brand,color:"#fff",borderRadius:12,fontWeight:800,fontSize:13.5,textDecoration:"none",fontFamily:FONT_B}}>
              Join Zoom meeting →
            </a>
            <button type="button" onClick={()=>{navigator.clipboard?.writeText(activeBooking.meetingUrl);toast("Meeting link copied");}}
              style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:12,padding:"11px 14px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,color:T.sub}}>
              Copy link
            </button>
          </div>
        ):activeBooking.status==="confirmed"?(
          <div style={{padding:"12px 14px",background:T.amberSoft,borderRadius:12,marginBottom:12}}>
            <div style={{fontSize:12.5,color:T.amber,fontWeight:700,marginBottom:8}}>Confirmed — join link not shared yet.</div>
            <div style={{fontSize:12,color:T.sub,marginBottom:12,lineHeight:1.45}}>Message your BDM and ask for the Zoom link, or refresh this page after they send it.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {typeof onOpenMessages==="function"&&(
                <Btn size="sm" onClick={onOpenMessages}>Message BDM →</Btn>
              )}
              <Btn variant="soft" size="sm" onClick={()=>loadCall()}>Refresh</Btn>
            </div>
          </div>
        ):null}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
          <Btn variant="soft" size="sm" disabled={busy} onClick={startReschedule}>Reschedule</Btn>
          <Btn variant="danger" size="sm" disabled={busy} onClick={()=>setConfirm({
            title:"Cancel this meeting?",
            msg:`Cancel ${activeBooking.slotDate} at ${activeBooking.slotTime}? Your BDM will be notified.`,
            danger:true,
            yes:"Cancel meeting",
            onYes:cancelMeeting,
          })}>Cancel meeting</Btn>
        </div>
      </Card>
    )}

    {showCalendar&&bdm&&(
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 0.8fr",gap:16}}>
      <Card>
        {rescheduleId&&(
          <div style={{padding:"10px 12px",background:T.amberSoft,borderRadius:11,marginBottom:12,fontSize:12.5,color:T.amber,fontWeight:700,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span>Pick a new time — your current meeting is replaced when you confirm.</span>
            <Btn variant="ghost" size="sm" onClick={()=>{setRescheduleId(null);setShowScheduler(false);setSelDay(null);setSelTime(null);}}>Keep current</Btn>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:12}}>
          <button type="button" disabled={!canPrev} onClick={()=>shiftMonth(-1)}
            style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${T.line}`,background:canPrev?T.surface2:T.surface,color:canPrev?T.ink:T.faint,cursor:canPrev?"pointer":"default",fontWeight:800,fontFamily:FONT_B}}>‹</button>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800}}>{monthName} {viewY}</div>
          <button type="button" disabled={!canNext} onClick={()=>shiftMonth(1)}
            style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${T.line}`,background:canNext?T.surface2:T.surface,color:canNext?T.ink:T.faint,cursor:canNext?"pointer":"default",fontWeight:800,fontFamily:FONT_B}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.faint,fontWeight:800,padding:"3px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:totalDays}).map((_,i)=>{
            const day=i+1;
            const isSel=selDay===day;
            const cell=new Date(viewY,viewM,day);
            const isPast=cell<startOfToday;
            const isWknd=(firstDay+i)%7===0||(firstDay+i)%7===6;
            const noSlots=!isPast&&!isWknd&&!dayHasSlots(day);
            const dead=isPast||isWknd||noSlots;
            return(<div key={day} onClick={()=>!dead&&(setSelDay(day),setSelTime(null))} style={{textAlign:"center",padding:"8px 2px",borderRadius:10,fontSize:12.5,fontWeight:isSel?800:600,cursor:dead?"default":"pointer",background:isSel?T.brand:dead?"transparent":T.surface2,color:isSel?"#fff":dead?T.faint:T.ink,position:"relative",transition:"all .15s"}}>
              {day}
            </div>);
          })}
        </div>
      </Card>
      <Card>
        {selDay?(<>
          <SectionTitle sub="Open 30-minute slots with your BDM">{slotDateLabel}</SectionTitle>
          {availableTimes.length===0?(
            <Empty icon="📅" title="No open times" sub="All slots for this day are booked or past. Try another weekday."/>
          ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {availableTimes.map(t=>{const isSel=selTime===t;
              return(<div key={t} onClick={()=>setSelTime(t)} style={{padding:"10px 8px",borderRadius:10,textAlign:"center",border:`1.5px solid ${isSel?T.brand:T.line}`,background:isSel?T.brandSoft:T.surface,color:isSel?T.brand:T.ink,fontSize:12.5,fontWeight:isSel?800:600,cursor:"pointer",transition:"all .15s"}}>{t}</div>);})}
          </div>
          )}
          {selTime&&availableTimes.includes(selTime)&&(<div className="pop" style={{marginTop:14}}>
            <div style={{padding:13,background:T.greenSoft,borderRadius:12,marginBottom:12}}>
              <div style={{fontSize:13,color:T.green,fontWeight:800}}>✓ {slotDateLabel} at {selTime}</div>
              <div style={{fontSize:11.5,color:T.sub,marginTop:2}}>30 min with {bdmLabel}</div>
            </div>
            <Btn variant="green" style={{width:"100%"}} onClick={confirmBooking} disabled={busy}>
              {busy?"Saving…":rescheduleId?"Confirm new time":"Confirm Booking"}
            </Btn>
          </div>)}
        </>):(<Empty icon="📅" title="Pick a date" sub="Choose a weekday with open times. You can browse this month and the next two."/>)}
      </Card>
      <Card>
        <SectionTitle>What we'll cover</SectionTitle>
        {["Your listings progress","NAP score walkthrough","Next month's targets","Plan questions"].map((item,i)=>(<div key={i} style={{display:"flex",gap:9,marginBottom:10,alignItems:"center"}}>
          <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>✓</div>
          <span style={{fontSize:12.5,color:T.sub}}>{item}</span>
        </div>))}
        <div style={{height:1,background:T.line,margin:"14px 0"}}/>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note with your booking request" style={{width:"100%",padding:"10px 13px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:12.5,resize:"none",height:74,boxSizing:"border-box",fontFamily:FONT_B}}/>
        <div style={{marginTop:12,padding:"12px 13px",background:T.brandSoft,borderRadius:12}}>
          <div style={{fontSize:12.5,fontWeight:800,color:T.brand,marginBottom:4}}>Need to chat with {bdmLabel}?</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:10,lineHeight:1.45}}>Use Messages for ongoing chat — Book a Call is for scheduling only.</div>
          <Btn variant="soft" size="sm" style={{width:"100%"}} onClick={()=>onOpenMessages?.()}>Open Messages →</Btn>
        </div>
      </Card>
    </div>)}
    {confirm&&<Confirm data={confirm} onClose={()=>setConfirm(null)}/>}
  </div>);
}
