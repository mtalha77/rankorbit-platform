import { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { api } from "../../lib/api";
import { Card, Empty, PageHead } from "../atoms";
import ChatThread from "../ChatThread";

export function StaffMessagesInbox({user,clients,selClient,setSelClient,setChatUnreadTotal,toast,isMobile,isAdmin,isAgent}){
  // Super admin + Agent: team chat only (no client threads). BDM/manager can see clients.
  const teamOnly=Boolean(isAdmin||isAgent);
  const[clientThreads,setClientThreads]=useState([]);
  const[staffThreads,setStaffThreads]=useState([]);
  const[loading,setLoading]=useState(true);
  // active = { kind:"client"|"staff", id }
  const[active,setActive]=useState(!teamOnly&&selClient?{kind:"client",id:selClient}:null);

  const syncTotal=(cT,sT)=>{
    const cu=teamOnly?0:(cT||[]).reduce((s,t)=>s+(t.unread||0),0);
    const su=(sT||[]).reduce((s,t)=>s+(t.unread||0),0);
    setChatUnreadTotal(cu+su);
  };

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const [cr,sr]=await Promise.all([
        teamOnly?Promise.resolve({threads:[]}):api.listChatThreads(),
        api.listStaffThreads(),
      ]);
      if(cancelled)return;
      setLoading(false);
      const cT=cr.error?[]:(cr.threads||[]);
      const sT=sr.error?[]:(sr.threads||[]);
      if(sr.error&&(teamOnly||cr.error)){toast(sr.error,"info");}
      setClientThreads(cT);
      setStaffThreads(sT);
      syncTotal(cT,sT);
      if(!active){
        if(sT[0])setActive({kind:"staff",id:sT[0].staffId});
        else if(!teamOnly&&cT[0])setActive({kind:"client",id:cT[0].clientId});
      }
    })();
    return()=>{cancelled=true;};
  },[user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clientPeer=active?.kind==="client"?clients.find(c=>c.id===active.id):null;
  const staffPeer=active?.kind==="staff"?staffThreads.find(t=>t.staffId===active.id):null;
  const teamTitle="Team";
  const roleLabel=(r)=>r==="super_admin"?"Super Admin":r==="manager"?"Manager":r==="bdm"?"BDM":r==="agent"?"Agent":"Staff";

  const ThreadRow=({label,sub,when,unread,activeSel,onClick})=>(
    <div onClick={onClick}
      style={{padding:"12px 14px",cursor:"pointer",background:activeSel?T.brandSoft:T.surface,borderBottom:`1px solid ${T.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
        <div style={{fontSize:13.5,fontWeight:unread?800:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
        {unread>0&&<span style={{background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"2px 7px",flexShrink:0}}>{unread}</span>}
      </div>
      <div style={{fontSize:12,color:T.sub,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub||"No messages"}</div>
      {when&&<div style={{fontSize:10.5,color:T.faint,marginTop:3}}>{new Date(when).toLocaleString()}</div>}
    </div>
  );
  const SectionLabel=({children})=>(
    <div style={{padding:"9px 14px",fontSize:10.5,fontWeight:800,color:T.faint,letterSpacing:".6px",background:T.surface2,borderBottom:`1px solid ${T.line}`}}>{children}</div>
  );

  return(
  <div style={{
    height:isMobile?"calc(100dvh - 140px)":"calc(100vh - 100px)",
    maxHeight:isMobile?"calc(100dvh - 140px)":"calc(100vh - 100px)",
    display:"flex",
    flexDirection:"column",
    overflow:"hidden",
    margin:isMobile?"0 0 -24px":"0 0 -40px",
    boxSizing:"border-box",
  }}>
    <div style={{flexShrink:0}}>
      <PageHead isMobile={isMobile} title="Messages" sub={teamOnly?"Team chat only — message managers, BDMs, agents, and admins":"Chat with teammates and your assigned clients"}/>
    </div>
    <div style={{flex:1,minHeight:0,marginTop:28,display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:16,alignItems:"stretch"}}>
      <Card style={{padding:0,overflow:"auto",height:"100%",minHeight:0}}>
        {loading?(<div style={{padding:24,textAlign:"center",color:T.faint,fontSize:13}}>Loading…</div>):(
          <div>
            {staffThreads.length>0&&<SectionLabel>{teamTitle}</SectionLabel>}
            {staffThreads.length===0&&(
              <div style={{padding:24}}><Empty icon="💬" title="No teammates yet" sub="When other team members are added, you can message them here."/></div>
            )}
            {staffThreads.map(t=>(
              <ThreadRow key={`s_${t.staffId}`}
                label={`${t.name}`}
                sub={t.lastMessage?.body||roleLabel(t.role)}
                when={t.lastMessage?.createdAt}
                unread={t.unread}
                activeSel={active?.kind==="staff"&&active.id===t.staffId}
                onClick={()=>setActive({kind:"staff",id:t.staffId})}/>
            ))}
            {!teamOnly&&(<>
              <SectionLabel>Clients</SectionLabel>
              {clientThreads.length===0?(
                <div style={{padding:24}}><Empty icon="💬" title="No client chats yet" sub="When a client messages you, it appears here."/></div>
              ):clientThreads.map(t=>(
                <ThreadRow key={`c_${t.clientId}`}
                  label={t.clientName}
                  sub={t.lastMessage?.body}
                  when={t.lastMessage?.createdAt}
                  unread={t.unread}
                  activeSel={active?.kind==="client"&&active.id===t.clientId}
                  onClick={()=>{setActive({kind:"client",id:t.clientId});setSelClient(t.clientId);}}/>
              ))}
            </>)}
          </div>
        )}
      </Card>
      <div style={{height:"100%",minHeight:0,overflow:"hidden"}}>
        {active?.kind==="staff"?(
          <ChatThread
            key={`staff_${active.id}`}
            variant="staff"
            staffId={active.id}
            myId={user.id}
            peerLabel={staffPeer?`${staffPeer.name} · ${roleLabel(staffPeer.role)}`:"Teammate"}
            toast={toast}
            fill
            onUnreadChange={(n)=>{
              if(n===0)setStaffThreads(prev=>{const next=prev.map(t=>t.staffId===active.id?{...t,unread:0}:t);syncTotal(clientThreads,next);return next;});
            }}
          />
        ):active?.kind==="client"&&!teamOnly?(
          <ChatThread
            key={`client_${active.id}`}
            clientId={active.id}
            myId={user.id}
            peerLabel={clientPeer?.businessName||clientPeer?.name||"Client"}
            toast={toast}
            fill
            onUnreadChange={(n)=>{
              if(n===0)setClientThreads(prev=>{const next=prev.map(t=>t.clientId===active.id?{...t,unread:0}:t);syncTotal(next,staffThreads);return next;});
            }}
          />
        ):(
          <Card style={{height:"100%"}}><Empty icon="💬" title="Select a conversation" sub="Pick a teammate on the left."/></Card>
        )}
      </div>
    </div>
  </div>);
}
