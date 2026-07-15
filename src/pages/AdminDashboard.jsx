// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, FONT_D, FONT_B, SHADOW } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, CATEGORIES, US_CA_STATES, livePlanEntries } from "../lib/constants";
import { today, todayFull, uid, actIcon, toDateInputValue, fromDateInputValue } from "../lib/helpers";
import { Badge, Card, Btn, Input, Select, Modal, Confirm, StatCard, ChartTip, SectionTitle, Empty, ListToolbar, PageHead } from "../components/atoms";
import Shell from "../components/Shell";
import ChatThread from "../components/ChatThread";
import ClientDashboard from "./ClientDashboard";
import { useWindowSize, useToast } from "../hooks";

function StaffMessagesInbox({user,clients,selClient,setSelClient,setChatUnreadTotal,toast,isMobile,isAdmin}){
  const[clientThreads,setClientThreads]=useState([]);
  const[staffThreads,setStaffThreads]=useState([]);
  const[loading,setLoading]=useState(true);
  // active = { kind:"client"|"staff", id }
  const[active,setActive]=useState(selClient?{kind:"client",id:selClient}:null);

  const syncTotal=(cT,sT)=>{
    const cu=(cT||[]).reduce((s,t)=>s+(t.unread||0),0);
    const su=(sT||[]).reduce((s,t)=>s+(t.unread||0),0);
    setChatUnreadTotal(cu+su);
  };

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      // Super admin: staff (team) chat only — no client↔BDM threads.
      const [cr,sr]=await Promise.all([
        isAdmin?Promise.resolve({threads:[]}):api.listChatThreads(),
        api.listStaffThreads(),
      ]);
      if(cancelled)return;
      setLoading(false);
      const cT=cr.error?[]:(cr.threads||[]);
      const sT=sr.error?[]:(sr.threads||[]);
      if(sr.error&&(isAdmin||cr.error)){toast(sr.error,"info");}
      setClientThreads(cT);
      setStaffThreads(sT);
      syncTotal(cT,sT);
      if(!active){
        if(sT[0])setActive({kind:"staff",id:sT[0].staffId});
        else if(cT[0])setActive({kind:"client",id:cT[0].clientId});
      }
    })();
    return()=>{cancelled=true;};
  },[user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clientPeer=active?.kind==="client"?clients.find(c=>c.id===active.id):null;
  const staffPeer=active?.kind==="staff"?staffThreads.find(t=>t.staffId===active.id):null;
  const teamTitle="Team";
  const roleLabel=(r)=>r==="super_admin"?"Super Admin":r==="manager"?"Manager":r==="agent"?"Agent":"Staff";

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

  return(<div>
    <PageHead isMobile={isMobile} title="Messages" sub="Chat with any teammate — agents, managers, and admins have the same access"/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:16,alignItems:"stretch"}}>
      <Card style={{padding:0,overflow:"auto",maxHeight:isMobile?"none":"min(640px, calc(100vh - 200px))"}}>
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
            {!isAdmin&&(<>
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
      <div>
        {active?.kind==="staff"?(
          <ChatThread
            key={`staff_${active.id}`}
            variant="staff"
            staffId={active.id}
            myId={user.id}
            peerLabel={staffPeer?`${staffPeer.name} · ${roleLabel(staffPeer.role)}`:"Teammate"}
            toast={toast}
            onUnreadChange={(n)=>{
              if(n===0)setStaffThreads(prev=>{const next=prev.map(t=>t.staffId===active.id?{...t,unread:0}:t);syncTotal(clientThreads,next);return next;});
            }}
          />
        ):active?.kind==="client"?(
          <ChatThread
            key={`client_${active.id}`}
            clientId={active.id}
            myId={user.id}
            peerLabel={clientPeer?.businessName||clientPeer?.name||"Client"}
            toast={toast}
            onUnreadChange={(n)=>{
              if(n===0)setClientThreads(prev=>{const next=prev.map(t=>t.clientId===active.id?{...t,unread:0}:t);syncTotal(next,staffThreads);return next;});
            }}
          />
        ):(
          <Card><Empty icon="💬" title="Select a conversation" sub="Pick a teammate on the left."/></Card>
        )}
      </div>
    </div>
  </div>);
}

export default function AdminDashboard({user,data,reload,onLogout}){
  const[page,setPage]=useState("overview");
  const[selClient,setSelClient]=useState(null);
  const[modal,setModal]=useState(null);
  const[confirm,setConfirm]=useState(null);
  const[toast,Toasts]=useToast();
  const w=useWindowSize();const isMobile=w<820;
  const{users,listings,gmb,analytics,activity,settings}=data;
  const allClients=users.filter(u=>u.role==="client");
  const staff=users.filter(u=>u.role!=="client");
  const isAdmin=user.role==="super_admin";
  const isStaffMgr=user.role==="super_admin"||user.role==="manager";
  const isAgent=user.role==="agent";
  // Agents only see clients assigned to them by a manager. Staff/managers see all.
  const clients=isAgent?allClients.filter(c=>c.assignedAgentId===user.id):allClients;
  // Read-only impersonation: super-admin always; managers only if granted canImpersonate.
  const canImpersonate=isAdmin||(user.role==="manager"&&user.canImpersonate);
  const[viewAs,setViewAs]=useState(null); // client being viewed read-only
  const acfg=settings?.config||{};
  const livePlans=livePlanEntries(acfg); // [id,plan] pairs for plans currently live
  const revenue=clients.reduce((s,c)=>s+(PLANS[c.plan]?.price||0),0);
  const flat=Object.values(listings).flat();
  const totalLive=flat.filter(l=>l.status==="live").length;
  const totalPending=flat.filter(l=>l.status==="pending").length;
  const totalFlagged=flat.filter(l=>l.status==="flagged"||l.status==="rejected").length;
  const actionNeeded=flat.filter(l=>l.actionNeeded).length;

  const addActivity=async(clientId,type,desc)=>{await api.addActivity({id:uid(),clientId,type,desc,date:todayFull(),by:user.name});};
  // Audit trail: records the acting staff member for any sensitive action.
  const audit=async(action,{targetType,targetId,targetName,detail}={})=>{
    await api.logAudit({actor:user,action,targetType,targetId,targetName,detail});
  };
  // When an AGENT edits/deletes a listing, flag it for managers (activity + staff email route).
  // Uses an internal clientId sentinel so it appears in admin activity but NEVER in the client's feed.
  const notifyManagersIfAgent=async(action,listing)=>{
    if(user.role!=="agent")return;
    const clientName=clients.find(c=>c.id===listing.clientId)?.businessName||"a client";
    await api.addActivity({id:uid(),clientId:"__internal",type:"edit_blocked",desc:`Manager review: ${user.name} ${action} "${listing.directory}" for ${clientName}`,date:todayFull(),by:"System"});
    api.notifyClient({
      clientId:listing.clientId,
      type:"agent_edit",
      title:`Agent ${action} a listing`,
      body:`${user.name} ${action} "${listing.directory}" for ${clientName}. Review in the admin dashboard.`,
      meta:{directory:listing.directory,action},
    });
    if(typeof window!=="undefined")window.__pendingManagerAlerts=(window.__pendingManagerAlerts||0)+1;
  };
  const R=async(fn,msg)=>{try{await fn();if(msg)toast(msg);await reload();}catch(e){console.error(e);toast(e.message||"Save failed","info");}};

  const[notifBadge,setNotifBadge]=useState(0);
  const[chatUnreadTotal,setChatUnreadTotal]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    const pull=async()=>{
      const rows=await api.listMyNotifications();
      if(cancelled)return;
      const n=(rows||[]).filter(x=>!x.read).length;
      setNotifBadge(prev=>prev===n?prev:n);
    };
    pull();
    const t=setInterval(pull,45000);
    return()=>{cancelled=true;clearInterval(t);};
  },[user.id]);

  const pageRef=useRef(page);
  pageRef.current=page;
  useEffect(()=>{
    let cancelled=false;
    const pull=async()=>{
      if(pageRef.current==="messages")return;
      // Super admin sees team chat only; managers/agents also count client threads.
      const [cr,sr]=await Promise.all([
        isAdmin?Promise.resolve({unreadTotal:0}):api.listChatThreads(),
        api.listStaffThreads(),
      ]);
      if(cancelled)return;
      const cu=cr.error?0:(cr.unreadTotal||0);
      const su=sr.error?0:(sr.unreadTotal||0);
      setChatUnreadTotal(cu+su);
    };
    pull();
    const t=setInterval(pull,25000);
    return()=>{cancelled=true;clearInterval(t);};
  },[user.id]);

  const nav=[
    {id:"overview",icon:"📊",label:"Overview",roles:["super_admin","manager","agent"]},
    {id:"notifications",icon:"🔔",label:"Notifications",roles:["super_admin","manager","agent"]},
    {id:"messages",icon:"💬",label:"Messages",roles:["super_admin","manager","agent"]},
    {id:"clients",icon:"👥",label:"Clients",roles:["super_admin","manager","agent"],match:["clientDetail"]},
    {id:"listings",icon:"📋",label:"All Listings",roles:["super_admin","manager","agent"]},
    {id:"gmb",icon:"📍",label:"GMB",roles:["super_admin","manager"]},
    {id:"team",icon:"🔑",label:"Team",roles:["super_admin","manager"]},
    {id:"activity",icon:"📜",label:"Activity Log",roles:["super_admin","manager"]},
    {id:"finance",icon:"💰",label:"Finance",roles:["super_admin"]},
    {id:"audit",icon:"🛡️",label:"Audit Trail",roles:["super_admin"]},
    {id:"trash",icon:"🗑️",label:"Trash",roles:["super_admin"]},
    {id:"settings",icon:"⚙️",label:"Settings",roles:["super_admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const roleBadge=(<div style={{marginTop:14,padding:"9px 13px",background:T.surface2,borderRadius:12}}>
    <div style={{fontSize:10,color:T.faint,fontWeight:800,letterSpacing:".5px"}}>SIGNED IN AS</div>
    <div style={{fontSize:13,fontWeight:800,color:T.brand,marginTop:2}}>{user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent"}</div>
  </div>);

  // ── MODALS ──
  const AddListingModal=({clientId,onClose})=>{
    const[f,setF]=useState({directory:"",da:"",notes:"",actionNeeded:false,actionNote:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title="Add New Listing">
      <Input label="Directory Name" value={f.directory} onChange={v=>set("directory",v)} placeholder="e.g. Apple Business Connect"/>
      <Input label="Domain Authority" value={f.da} onChange={v=>set("da",v)} placeholder="e.g. 96" type="number"/>
      <Input label="Internal Notes" value={f.notes} onChange={v=>set("notes",v)} placeholder="Notes for your team"/>
      <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:T.amberSoft,borderRadius:11,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.actionNeeded} onChange={e=>set("actionNeeded",e.target.checked)} style={{width:16,height:16,accentColor:T.amber}}/>
        <span style={{fontSize:12.5,fontWeight:700,color:T.amber}}>Client action required (e.g. Apple postcard verification)</span>
      </label>
      {f.actionNeeded&&<Input label="What the client must do" value={f.actionNote} onChange={v=>set("actionNote",v)} placeholder="e.g. Enter the code from the Apple postcard"/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>R(async()=>{
          await api.upsertListing({id:uid(),clientId,directory:f.directory,status:"submitted",submitted:today(),liveDate:"–",napMatch:"–",liveLink:"",da:parseInt(f.da)||0,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
          await addActivity(clientId,"submitted",`${f.directory} submitted`);
        },`${f.directory} added`).then(onClose)}>Add Listing</Btn>
      </div>
    </Modal>);
  };
  const UpdateListingModal=({listing,clientId,onClose})=>{
    const[f,setF]=useState({status:listing.status,liveLink:listing.liveLink||"",liveDate:listing.liveDate||"–",napMatch:listing.napMatch||"–",notes:listing.notes||"",actionNeeded:!!listing.actionNeeded,actionNote:listing.actionNote||""});
    const[errs,setErrs]=useState({liveLink:"",liveDate:""});
    const set=(k,v)=>{
      setF(x=>({...x,[k]:v}));
      if(k==="liveLink"||k==="liveDate")setErrs(e=>({...e,[k]:""}));
    };
    const onStatus=(v)=>{
      setF(x=>{
        const next={...x,status:v};
        // When marking live with no date yet, default the calendar to today.
        if(v==="live"&&(!x.liveDate||x.liveDate==="–"||x.liveDate==="-"))next.liveDate=todayFull();
        return next;
      });
    };
    const validateLiveFields=()=>{
      const next={liveLink:"",liveDate:""};
      const link=String(f.liveLink||"").trim();
      const hasDate=f.liveDate&&f.liveDate!=="–"&&f.liveDate!=="-";
      if(!link)next.liveLink="Live Listing URL is required";
      else{
        try{
          const u=new URL(link);
          if(u.protocol!=="http:"&&u.protocol!=="https:")next.liveLink="URL must start with http:// or https://";
        }catch{next.liveLink="Enter a valid Live Listing URL";}
      }
      if(!hasDate)next.liveDate="Live Date is required";
      setErrs(next);
      return !next.liveLink&&!next.liveDate;
    };
    return(<Modal open onClose={onClose} title={`Update · ${listing.directory}`}>
      <Select label="Status" value={f.status} onChange={onStatus} options={["submitted","pending","live","rejected","flagged"].map(s=>({value:s,label:s[0].toUpperCase()+s.slice(1)}))}/>
      <Input label="Live Listing URL" value={f.liveLink} onChange={v=>set("liveLink",v)} placeholder="https://directory.com/business" required error={errs.liveLink}/>
      <Input
        label="Live Date"
        type="date"
        value={toDateInputValue(f.liveDate)}
        onChange={v=>set("liveDate",v?fromDateInputValue(v):"–")}
        required
        error={errs.liveDate}
      />
      <Select label="NAP Match" value={f.napMatch} onChange={v=>set("napMatch",v)} options={[{value:"–",label:"– Pending"},{value:"match",label:"✓ Match"},{value:"mismatch",label:"Mismatch"},{value:"fixed",label:"Fixed"}]}/>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>NOTES (CLIENT CAN READ)</label>
        <textarea value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Progress notes, context, anything the client should know…" style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B,resize:"vertical",minHeight:70}}/>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:T.amberSoft,borderRadius:11,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.actionNeeded} onChange={e=>set("actionNeeded",e.target.checked)} style={{width:16,height:16,accentColor:T.amber}}/>
        <span style={{fontSize:12.5,fontWeight:700,color:T.amber}}>Client action required (verification, etc.)</span>
      </label>
      {f.actionNeeded&&<Input label="What the client must do" value={f.actionNote} onChange={v=>set("actionNote",v)} placeholder="e.g. Enter the Apple postcard code"/>}
      <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
        <Btn variant="danger" onClick={()=>setConfirm({title:"Delete listing?",msg:`Move ${listing.directory} to Trash? It can be restored for 30 days, then permanently removed.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteListing(listing.id);await addActivity(clientId,"rejected",`${listing.directory} listing removed`);await audit("listing.delete",{targetType:"listing",targetId:listing.id,targetName:listing.directory});await notifyManagersIfAgent("deleted",listing);},"Listing moved to Trash").then(onClose)})}>Delete</Btn>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>{
            if(!validateLiveFields())return;
            const link=String(f.liveLink||"").trim();
            R(async()=>{
            let liveDate=f.liveDate;
            await api.upsertListing({...listing,status:f.status,liveLink:link,liveDate,napMatch:f.napMatch,notes:f.notes,actionNeeded:f.actionNeeded,actionNote:f.actionNote});
            await audit("listing.edit",{targetType:"listing",targetId:listing.id,targetName:listing.directory,detail:`status→${f.status}`});
            await notifyManagersIfAgent("edited",listing);
            if(f.status==="live"&&listing.status!=="live"){
              await addActivity(clientId,"listing_live",`${listing.directory} listing went live`);
              api.notifyClient({clientId,type:"listing_live",title:`${listing.directory} is live`,body:`Your ${listing.directory} listing is now live.${link?` View it: ${link}`:""}${f.notes?` Note: ${f.notes}`:""}`});
            }
            if(f.status==="rejected"&&listing.status!=="rejected"){
              await addActivity(clientId,"rejected",`${listing.directory} rejected. ${f.notes}`);
              api.notifyClient({clientId,type:"rejected",title:`${listing.directory} was rejected`,body:`Your ${listing.directory} listing was rejected.${f.notes?` ${f.notes}`:" Check your dashboard for details."}`});
            }
            if(f.status==="flagged"&&listing.status!=="flagged"){
              await addActivity(clientId,"flagged",`${listing.directory} flagged. ${f.notes}`);
              api.notifyClient({clientId,type:"flagged",title:`${listing.directory} flagged`,body:`Your ${listing.directory} listing was flagged for review.${f.notes?` ${f.notes}`:""}`});
            }
          },"Listing updated").then(onClose);
          }}>Save Changes</Btn>
        </div>
      </div>
    </Modal>);
  };
  const ClientFormModal=({client,onClose})=>{
    const[f,setF]=useState(client||{role:"client",plan:"",status:"active",category:"Home Services"});
    const[errs,setErrs]=useState({name:"",email:"",businessName:""});
    const set=(k,v)=>{setF(x=>({...x,[k]:v}));if(errs[k])setErrs(e=>({...e,[k]:""}));};
    const editing=!!client;
    return(<Modal open onClose={onClose} title={editing?"Edit Client":"Add New Client"} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Mike Johnson" required error={errs.name}/>
        <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing" required error={errs.businessName}/>
        <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="mike@business.com" validate="email" required error={errs.email}/>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000" validate="usphone"/>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Select label="State / Province" value={f.state} onChange={v=>set("state",v)} options={[{value:"",label:"Select…"},...US_CA_STATES.map(s=>({value:s.code,label:`${s.code} — ${s.name}`}))]}/>
      </div>
      <Input label="Street Address" value={f.address} onChange={v=>set("address",v)} placeholder="123 Main St"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Select label="Plan" value={f.plan} onChange={v=>set("plan",v)} options={[{value:"",label:"No plan yet"},...livePlans.map(([id,p])=>({value:id,label:`${p.name} $${p.price}/mo`})),...(f.plan&&!livePlans.find(([id])=>id===f.plan)?[{value:f.plan,label:`${PLANS[f.plan]?.name} (hidden)`}]:[])]}/>
        <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={CATEGORIES.map(o=>({value:o,label:o}))}/>
      </div>
      {editing&&<Select label="Status" value={f.status} onChange={v=>set("status",v)} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]}/>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{
          const next={name:"",email:"",businessName:""};
          if(!String(f.name||"").trim())next.name="This field is required";
          if(!String(f.businessName||"").trim())next.businessName="This field is required";
          if(!String(f.email||"").trim())next.email="This field is required";
          else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))next.email="Enter a valid email address";
          setErrs(next);
          if(next.name||next.email||next.businessName)return;
          (async()=>{
            try{
              if(editing){await api.upsertProfile(f);toast("Client updated");}
              else{await api.upsertProfile({...f,id:uid(),avatar:(f.name||"?")[0].toUpperCase(),napScore:0,createdAt:new Date().toISOString()});await addActivity("","client",`New client added: ${f.businessName||f.name}`);toast(`${f.businessName||f.name} added`);}
              await reload();onClose();
            }catch(e){toast("Could not save: "+(e.message||"unknown"),"info");}
          })();
        }}>{editing?"Save Changes":"Add Client"}</Btn>
      </div>
      {!editing&&api.mode==="supabase"&&<div style={{marginTop:12,fontSize:11,color:T.faint,lineHeight:1.5}}>Note: this creates a profile record. For the client to log in, they sign up themselves (email/Google) with this email, or you send them a reset link.</div>}
    </Modal>);
  };
  const NapConfirmModal=({client,newScore,onClose})=>{
    const hist=client.napHistory||[];
    const last3=hist.slice(-3).reverse();
    const roleLabel=user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent";
    const[saving,setSaving]=useState(false);
    const save=async()=>{
      setSaving(true);
      try{
        const entry={score:newScore,date:new Date().toISOString(),by:roleLabel};
        await api.patchProfile(client.id,{napScore:newScore,napHistory:[...hist,entry].slice(-20)});
        await audit("nap.update",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:`${client.napScore||0}% → ${newScore}%`});
        await addActivity(client.id,"nap_fix",`NAP consistency updated to ${newScore}%`);
        api.notifyClient({clientId:client.id,type:"nap_fix",title:"NAP score updated",body:`Your NAP consistency score is now ${newScore}% (was ${client.napScore||0}%).`});
        await reload();toast(`NAP score saved: ${newScore}%`);onClose();
      }catch(e){toast("Could not save NAP","info");}
      setSaving(false);
    };
    const fmt=(d)=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    return(<Modal open onClose={onClose} title="Confirm NAP score update">
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"10px 0 18px"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.faint,fontWeight:700}}>CURRENT</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:T.faint}}>{client.napScore||0}%</div></div>
        <span style={{fontSize:22,color:T.faint}}>→</span>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:T.brand,fontWeight:700}}>NEW</div><div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:newScore>=90?T.green:newScore>=70?T.amber:T.red}}>{newScore}%</div></div>
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>LAST 3 NAP UPDATES</div>
      {last3.length===0?<div style={{fontSize:12.5,color:T.faint,padding:"8px 0 16px"}}>No previous updates recorded.</div>:
        <div style={{marginBottom:16}}>{last3.map((h,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:12.5,fontWeight:700}}>{h.score}%</span>
          <span style={{fontSize:11.5,color:T.faint}}>{fmt(h.date)} · {h.by}</span>
        </div>))}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Confirm & save"}</Btn></div>
    </Modal>);
  };
  const LogEditModal=({client,onClose})=>{
    const[note,setNote]=useState("");
    const[shareWithClient,setShare]=useState(false);
    const[saving,setSaving]=useState(false);
    const save=async()=>{
      setSaving(true);
      try{
        const base="Unauthorized edit blocked and reverted";
        const desc=note.trim()?`${base}: ${note.trim()}`:base;
        // If shared with client it goes to their feed; otherwise internal only.
        await addActivity(shareWithClient?client.id:"__internal","edit_blocked",desc);
        await audit("edit.revert",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:note.trim()||"no note"});
        await reload();toast("Unauthorized edit logged & reverted");onClose();
      }catch(e){toast("Could not log","info");}
      setSaving(false);
    };
    return(<Modal open onClose={onClose} title="Log unauthorized edit">
      <div style={{fontSize:12.5,color:T.sub,marginBottom:14,lineHeight:1.5}}>Record an unauthorized change you caught and reverted. Add a note describing what was found.</div>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>NOTES (what was changed?)</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Business hours changed on Google without authorization, reverted to correct hours." rows={3} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:12}}/>
      <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",marginBottom:16}}>
        <input type="checkbox" checked={shareWithClient} onChange={e=>setShare(e.target.checked)} style={{width:16,height:16,accentColor:T.brand}}/>
        <span style={{fontSize:12.5,color:T.sub}}>Show this note to the client in their activity feed</span>
      </label>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={save} disabled={saving}>{saving?"Logging…":"Log & revert"}</Btn></div>
    </Modal>);
  };
  const SuspendModal=({client,onClose})=>{
    const[reason,setReason]=useState("");
    const[saving,setSaving]=useState(false);
    const roleLabel=user.role==="super_admin"?"Super Admin":"Manager";
    const doSuspend=async()=>{
      setSaving(true);
      try{
        await api.patchProfile(client.id,{status:"suspended",suspendedAt:new Date().toISOString(),suspendReason:reason.trim(),suspendedBy:roleLabel});
        await audit("client.suspend",{targetType:"client",targetId:client.id,targetName:client.businessName||client.name,detail:reason.trim()||"no reason given"});
        await reload();toast("Client suspended");onClose();
      }catch(e){toast("Could not suspend","info");}
      setSaving(false);
    };
    return(<Modal open onClose={onClose} title={`Suspend ${client.businessName||client.name}?`}>
      <div style={{fontSize:12.5,color:T.sub,marginBottom:14,lineHeight:1.5}}>The client won't be able to log in until reactivated. Add a short reason for the record (staff only).</div>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>REASON / NOTES</label>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Payment failed, client requested pause, policy issue…" rows={3} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:16}}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={doSuspend} disabled={saving}>{saving?"Suspending…":"Suspend client"}</Btn></div>
    </Modal>);
  };
  const AssignModal=({agent,onClose})=>{
    const[sel,setSel]=useState(new Set(allClients.filter(c=>c.assignedAgentId===agent.id).map(c=>c.id)));
    const[saving,setSaving]=useState(false);
    const[q,setQ]=useState("");
    // Granular permissions, default all-on. What this agent may change for assigned clients.
    const defPerms={listings:true,nap:true,logEdit:true,gmb:true};
    const[perms,setPerms]=useState({...defPerms,...(agent.perms||{})});
    const togglePerm=(k)=>setPerms(p=>({...p,[k]:!p[k]}));
    const toggle=(id)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
    const list=allClients.filter(c=>!q||`${c.businessName} ${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
    const save=async()=>{
      setSaving(true);
      try{
        for(const c of allClients){
          const was=c.assignedAgentId===agent.id;const now=sel.has(c.id);
          if(now&&!was)await api.assignClient(c.id,agent.id);
          else if(!now&&was)await api.assignClient(c.id,null);
        }
        await api.patchProfile(agent.id,{perms});
        await audit("agent.assign",{targetType:"staff",targetId:agent.id,targetName:agent.name,detail:`${sel.size} clients`});
        await reload();toast(`Saved: ${sel.size} clients`);onClose();
      }catch(e){toast("Could not save assignments","info");}
      setSaving(false);
    };
    const permList=[["listings","Update listings"],["nap","Update NAP score"],["logEdit","Log unauthorized edits"],["gmb","GMB changes"]];
    return(<Modal open onClose={onClose} title={`Assign clients to ${agent.name}`}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>WHAT THIS AGENT CAN DO</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {permList.map(([k,label])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:perms[k]?T.brandSoft:T.surface2,border:`1.5px solid ${perms[k]?T.brand:T.line}`,borderRadius:10,cursor:"pointer",transition:"all .12s"}}>
            <input type="checkbox" checked={!!perms[k]} onChange={()=>togglePerm(k)} style={{width:15,height:15,accentColor:T.brand}}/>
            <span style={{fontSize:12.5,fontWeight:700,color:perms[k]?T.brand:T.sub}}>{label}</span>
          </label>))}
      </div>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>ASSIGNED CLIENTS</div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍  Search clients…" style={{width:"100%",padding:"10px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",marginBottom:12}}/>
      <div style={{maxHeight:260,overflowY:"auto",marginBottom:16}}>
        {list.length===0?<div style={{padding:"20px",textAlign:"center",fontSize:12.5,color:T.faint}}>No clients found.</div>:
          list.map(c=>(<label key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 8px",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
            <input type="checkbox" checked={sel.has(c.id)} onChange={()=>toggle(c.id)} style={{width:16,height:16,accentColor:T.brand}}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.businessName||c.name}</div><div style={{fontSize:11,color:T.faint}}>{c.email}{c.assignedAgentId&&c.assignedAgentId!==agent.id?" · assigned to another agent":""}</div></div>
            {c.plan&&<Badge type="submitted" label={PLANS[c.plan]?.name}/>}
          </label>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:12.5,color:T.sub,fontWeight:700}}>{sel.size} selected</span>
        <div style={{display:"flex",gap:8}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Btn></div>
      </div>
    </Modal>);
  };
  const TeamModal=({onClose})=>{
    const genPw=()=>{const cs="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";let p="";for(let i=0;i<12;i++)p+=cs[Math.floor(Math.random()*cs.length)];return p;};
    const[f,setF]=useState({role:isAdmin?"manager":"agent",password:genPw()});
    const[errs,setErrs]=useState({name:"",email:"",password:""});
    const[saving,setSaving]=useState(false);
    const set=(k,v)=>{setF(x=>({...x,[k]:v}));if(errs[k])setErrs(e=>({...e,[k]:""}));};
    const create=async()=>{
      const next={name:"",email:"",password:""};
      if(!String(f.name||"").trim())next.name="This field is required";
      if(!String(f.email||"").trim())next.email="This field is required";
      else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))next.email="Enter a valid email address";
      if(!f.password||f.password.length<8)next.password="Password must be at least 8 characters";
      setErrs(next);
      if(next.name||next.email||next.password)return;
      setSaving(true);
      const r=await api.createStaff({name:f.name,email:f.email,password:f.password,role:f.role});
      setSaving(false);
      if(r.error){toast(r.error,"info");return;}
      await audit("staff.create",{targetType:"staff",targetName:f.name,detail:f.role});
      await reload();toast(`${f.name} created. Login ready.`);onClose();
    };
    // Managers can only create agents; super-admin can create super-admins, managers, or agents.
    const roleOpts=isAdmin?[{value:"super_admin",label:"Super Admin"},{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]:[{value:"agent",label:"Agent"}];
    return(<Modal open onClose={onClose} title="Create Team Member Login">
      <div style={{fontSize:12.5,color:T.sub,marginBottom:16,lineHeight:1.5}}>This creates a working login immediately. Share the email and password with your team member, they can sign in at the staff portal right away.</div>
      <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Team member name" required error={errs.name}/>
      <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="name@naporbit.com" validate="email" required error={errs.email}/>
      <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>PASSWORD <span style={{color:T.red}}>*</span></label>
      <div style={{display:"flex",gap:8,marginBottom:errs.password?6:14}}>
        <input value={f.password} onChange={e=>set("password",e.target.value)} style={{flex:1,padding:"11px 15px",background:T.surface,border:`1.5px solid ${errs.password?T.red:T.line}`,borderRadius:11,fontSize:13.5,fontFamily:"monospace",boxSizing:"border-box"}}/>
        <Btn variant="ghost" size="sm" onClick={()=>set("password",genPw())}>🎲 Generate</Btn>
      </div>
      {errs.password&&<div style={{fontSize:11,color:T.red,marginTop:0,marginBottom:14,fontWeight:600}}>{errs.password}</div>}
      <Select label="Role" value={f.role} onChange={v=>set("role",v)} options={roleOpts}/>
      <div style={{padding:"11px 14px",background:T.amberSoft,borderRadius:11,fontSize:11.5,color:T.amber,fontWeight:600,lineHeight:1.5,marginBottom:16}}>Save these credentials, they'll also stay visible on the Team page for you to copy later.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={create} disabled={saving}>{saving?"Creating…":"Create login"}</Btn>
      </div>
    </Modal>);
  };
  const GmbModal=({client,onClose})=>{
    const ex=gmb[client.id]||{views:0,calls:0,directions:0,source:"manual",trend:[],posts:[],qa:[],photos:0,completeness:{category:false,description:false,hours:false,photo:false,services:false,attributes:false}};
    const[f,setF]=useState({views:ex.views,calls:ex.calls,directions:ex.directions,postTitle:"",postType:"update",postContent:"",postScheduled:false,postDate:"",qaQ:"",qaA:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`GMB Update · ${client.businessName}`} width={580}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>ENGAGEMENT METRICS (MANUAL)</div>
        <Badge type="manual"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <Input label="Views" value={f.views} onChange={v=>set("views",v)} type="number"/>
        <Input label="Calls" value={f.calls} onChange={v=>set("calls",v)} type="number"/>
        <Input label="Directions" value={f.directions} onChange={v=>set("directions",v)} type="number"/>
      </div>
      <div style={{background:T.surface2,borderRadius:14,padding:16,margin:"6px 0 14px"}}>
        <div style={{fontSize:11,fontWeight:800,color:T.violet,letterSpacing:".6px",marginBottom:12}}>📝 CREATE A GMB POST (OPTIONAL)</div>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>POST TYPE</label>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {[["update","📢 Update"],["offer","🎁 Offer"],["event","📅 Event"],["product","🛍️ Product"]].map(([v,label])=>(
            <button key={v} onClick={()=>set("postType",v)} style={{padding:"7px 13px",borderRadius:10,border:`1.5px solid ${f.postType===v?T.violet:T.line}`,background:f.postType===v?T.violetSoft:T.surface,color:f.postType===v?T.violet:T.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>{label}</button>))}
        </div>
        <Input label="Post title" value={f.postTitle} onChange={v=>set("postTitle",v)} placeholder="e.g. Summer Special, 10% Off"/>
        <label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>CONTENT</label>
        <textarea value={f.postContent} onChange={e=>set("postContent",e.target.value)} placeholder="What's this post about? This shows to the client." rows={2} style={{width:"100%",padding:"11px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,fontSize:13,fontFamily:FONT_B,boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={f.postScheduled} onChange={e=>set("postScheduled",e.target.checked)} style={{width:15,height:15,accentColor:T.violet}}/>
          <span style={{fontSize:12.5,color:T.sub}}>Schedule for later (instead of publishing now)</span>
        </label>
        {f.postScheduled&&<Input label="Scheduled date" value={f.postDate} onChange={v=>set("postDate",v)} placeholder="e.g. Jul 15" style={{marginTop:10}}/>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Q&A Question (optional)" value={f.qaQ} onChange={v=>set("qaQ",v)} placeholder="Customer question"/>
        <Input label="Answer" value={f.qaA} onChange={v=>set("qaA",v)} placeholder="Your reply"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>R(async()=>{
          const trend=[...ex.trend,{m:new Date().toLocaleString("en-US",{month:"short"}),v:+f.views||0,c:+f.calls||0,d:+f.directions||0}];
          const newPost=f.postTitle?{title:f.postTitle,type:f.postType,content:f.postContent,date:f.postScheduled?(f.postDate||"soon"):today(),status:f.postScheduled?"scheduled":"live"}:null;
          const posts=newPost?[newPost,...ex.posts]:ex.posts;
          const qa=f.qaQ&&f.qaA?[...ex.qa,{q:f.qaQ,a:f.qaA,date:today()}]:ex.qa;
          await api.upsertGmb(client.id,{...ex,views:+f.views||0,calls:+f.calls||0,directions:+f.directions||0,source:"manual",trend,posts,qa});
          await addActivity(client.id,"gmb_update",newPost?`GMB post published: ${f.postTitle}`:`GMB data updated for ${client.businessName}`);
        },"GMB update saved").then(onClose)}>Save GMB Update</Btn>
      </div>
    </Modal>);
  };
  const AnalyticsModal=({client,onClose})=>{
    const ex=analytics[client.id]||{sessions:0,users:0,pageviews:0,avgTime:"0:00",source:"manual",trend:[]};
    const[f,setF]=useState({sessions:ex.sessions,users:ex.users,pageviews:ex.pageviews,avgTime:ex.avgTime});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`Analytics · ${client.businessName}`} width={520}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>MANUAL ANALYTICS ENTRY</div><Badge type="manual"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Sessions" value={f.sessions} onChange={v=>set("sessions",v)} type="number"/>
        <Input label="Users" value={f.users} onChange={v=>set("users",v)} type="number"/>
        <Input label="Page Views" value={f.pageviews} onChange={v=>set("pageviews",v)} type="number"/>
        <Input label="Avg. Time (m:ss)" value={f.avgTime} onChange={v=>set("avgTime",v)} placeholder="2:34"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>R(async()=>{
          const trend=[...(ex.trend||[]),{m:new Date().toLocaleString("en-US",{month:"short"}),s:+f.sessions||0,u:+f.users||0}];
          await api.upsertAnalytics(client.id,{sessions:+f.sessions||0,users:+f.users||0,pageviews:+f.pageviews||0,avgTime:f.avgTime||"0:00",source:"manual",trend});
          await addActivity(client.id,"analytics",`Analytics updated for ${client.businessName}`);
        },"Analytics saved").then(onClose)}>Save Analytics</Btn>
      </div>
    </Modal>);
  };
  const IntegrationsModal=({client,onClose})=>{
    const[gaId,setGaId]=useState(client.gaId||"");
    const[gbpId,setGbpId]=useState(client.gbpId||"");
    return(<Modal open onClose={onClose} title={`Integrations · ${client.businessName}`} width={520}>
      <div style={{padding:"12px 14px",background:T.blueSoft,borderRadius:11,marginBottom:16,fontSize:12,color:T.blue,lineHeight:1.5}}>
        Store the client's IDs here. Live auto-pull (OAuth) is coming next; for now, use the manual GMB/Analytics entry to feed their dashboards.
      </div>
      <Input label="Google Analytics 4 Measurement ID" value={gaId} onChange={setGaId} placeholder="G-XXXXXXXXXX"/>
      <Input label="Google Business Profile ID / Name" value={gbpId} onChange={setGbpId} placeholder="accounts/123/locations/456"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>R(async()=>api.upsertProfile({...client,gaId,gbpId}),"Integration IDs saved").then(onClose)}>Save</Btn>
      </div>
    </Modal>);
  };

  // ── ADMIN PAGES ──
  const NotificationsPage=()=>{
    const[notifs,setNotifs]=useState([]);
    const[loading,setLoading]=useState(true);
    const[busyId,setBusyId]=useState(null);
    const[openId,setOpenId]=useState(null);
    const[zoomByNotif,setZoomByNotif]=useState({}); // notificationId -> zoom url
    const[zoomErr,setZoomErr]=useState({}); // notificationId -> error text
    const load=async()=>{
      setLoading(true);
      const rows=await api.listMyNotifications();
      setNotifs(rows||[]);
      setNotifBadge((rows||[]).filter(n=>!n.read).length);
      setLoading(false);
    };
    useEffect(()=>{load();},[user.id]);
    const unread=notifs.filter(n=>!n.read);
    const markAll=async()=>{
      const ids=unread.map(n=>n.id);
      if(!ids.length)return;
      await api.markNotificationsRead(ids);
      setNotifs(prev=>prev.map(n=>({...n,read:true})));
      setNotifBadge(0);
    };
    const openOne=async(n)=>{
      setOpenId(openId===n.id?null:n.id);
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
      if(action==="confirm"&&meetingUrl){
        try{new URL(meetingUrl);}catch{
          setZoomErr(prev=>({...prev,[n.id]:"Enter a valid Zoom link (https://…)"}));
          return;
        }
      }
      setZoomErr(prev=>({...prev,[n.id]:""}));
      setBusyId(n.id+action);
      const r=await api.respondCall({bookingId,action,notificationId:n.id,meetingUrl:action==="confirm"?meetingUrl:undefined});
      setBusyId(null);
      if(r.error){toast(r.error,"info");return;}
      toast(action==="confirm"
        ?(meetingUrl?"Meeting confirmed — Zoom link shared with client":"Meeting confirmed — client notified")
        :"Meeting cancelled — client notified");
      setNotifs(prev=>prev.map(x=>{
        if(x.id!==n.id&&x.meta?.bookingId!==bookingId)return x;
        return{...x,read:true,meta:{...(x.meta||{}),status:r.status,meetingUrl:r.meetingUrl||meetingUrl||null,respondedAt:new Date().toISOString()}};
      }));
    };
    const typeIcon=(t)=>({
      staff_created:"🔑",
      client_assigned:"👤",
      client_unassigned:"👤",
      call_booked:"📅",
      bdm_message:"💬",
      chat_message:"💬",
      staff_message:"💬",
      meeting_confirmed:"✅",
      meeting_cancelled:"❌",
    }[t]||"🔔");
    const typeLabel=(t)=>({
      staff_created:"Staff",
      client_assigned:"Assignment",
      client_unassigned:"Assignment",
      call_booked:"Meeting",
      bdm_message:"Message",
      chat_message:"Chat",
      staff_message:"Team chat",
      meeting_confirmed:"Meeting",
      meeting_cancelled:"Meeting",
    }[t]||"Update");
    // Super admins get report copies — agents act on call_booked.
    const canRespond=(n)=>!isAdmin&&n.type==="call_booked"&&n.meta?.bookingId&&(!n.meta?.status||n.meta.status==="pending")&&!n.meta?.reportOnly;
    const emptySub=isAdmin
      ?"When staff are added, clients are assigned, or meetings are booked, it shows here."
      :"When a client is assigned to you or schedules a meeting, it appears here.";
    return(<div>
      <PageHead isMobile={isMobile} title="Notifications"
        sub={isAdmin?"Staff adds, client assignments, and meeting activity across the platform":"Client assignments, meeting requests, and messages"}
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
                      {isAdmin&&n.type==="call_booked"&&(!n.meta?.status||n.meta.status==="pending")?" · Awaiting agent":""}
                    </div>
                  </div>
                </div>
                {openId===n.id&&canRespond(n)&&(
                  <div style={{padding:"0 6px 14px 54px"}}>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:11.5,fontWeight:700,color:T.sub,marginBottom:6}}>Zoom / meeting link (optional, shared with client)</div>
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
                {openId===n.id&&n.type==="call_booked"&&n.meta?.status&&n.meta.status!=="pending"&&(
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
  };

  const Overview=()=>{
    const revData=[{m:"Mar",r:138},{m:"Apr",r:187},{m:"May",r:236},{m:"Jun",r:revenue},{m:"Jul",r:revenue}];
    const listData=[{m:"Mar",n:12,l:12},{m:"Apr",n:10,l:18},{m:"May",n:8,l:26},{m:"Jun",n:10,l:totalLive}];
    return(<div>
      <PageHead isMobile={isMobile} title="Platform Overview" sub={`Welcome back, ${user.name.split(" ")[0]}`}
        right={notifBadge>0?<Btn variant="soft" size="sm" onClick={()=>setPage("notifications")}>🔔 {notifBadge} new</Btn>:null}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":`repeat(${isAdmin?4:3},1fr)`,gap:14,marginBottom:20}}>
        {isAdmin&&<StatCard label="Monthly Revenue" value={`$${revenue}`} sub={`${clients.length} active subscriptions`} icon="💰" color={T.green} soft={T.greenSoft} trend={8} delay={0}/>}
        <StatCard label="Clients" value={clients.length} sub="Across all plans" icon="👥" delay={70}/>
        <StatCard label="Listings Live" value={totalLive} sub={`${totalPending} pending`} icon="🌐" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Needs Attention" value={totalFlagged} sub={`${actionNeeded} awaiting client action`} icon="🚩" color={T.red} soft={T.redSoft} delay={210}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
        {isAdmin?(<Card><SectionTitle sub="Monthly recurring revenue (Super Admin only)">Revenue Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revData}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.25}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={38}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="r" name="MRR $" stroke={T.green} strokeWidth={2.5} fill="url(#rev)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} animationDuration={1100}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>):(<Card><SectionTitle sub="New live vs cumulative total">Listings Activity</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={listData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="n" name="New" fill={T.brand} radius={[6,6,0,0]} animationDuration={900}/>
              <Bar dataKey="l" name="Total live" fill={T.green} radius={[6,6,0,0]} animationDuration={1200}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>)}
        <Card><SectionTitle>Plan Distribution</SectionTitle>
          <div style={{display:"flex",justifyContent:"center"}}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={Object.entries(PLANS).map(([id,p])=>({n:p.name,v:clients.filter(c=>c.plan===id).length}))} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="v" strokeWidth={0} animationDuration={1000}>
                {[T.blue,T.brand,T.violet].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie><Tooltip content={<ChartTip/>}/></PieChart>
            </ResponsiveContainer>
          </div>
          {Object.entries(PLANS).map(([id,p],i)=>(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:[T.blue,T.brand,T.violet][i]}}/><span style={{fontSize:12.5,color:T.sub}}>{p.name} ${p.price}</span></div>
            <span style={{fontSize:13,fontWeight:800}}>{clients.filter(c=>c.plan===id).length}</span>
          </div>))}
        </Card>
      </div>
      <Card><SectionTitle>Client Health</SectionTitle>
        {clients.length===0?<Empty icon="👥" title="No clients yet" sub="Add your first client to get started."/>:
        clients.map((c,i)=>{const cl=listings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const an=cl.filter(l=>l.actionNeeded).length;
          return(<div key={c.id} className="hoverRow" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 10px",borderRadius:12,cursor:"pointer",borderBottom:i<clients.length-1?`1px solid ${T.line}`:"none",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${PLANS[c.plan]?.color||T.faint},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
              <div><div style={{fontSize:13.5,fontWeight:800}}>{c.businessName||c.name}</div><div style={{fontSize:11,color:T.faint}}>{c.plan?`${PLANS[c.plan].name} · $${PLANS[c.plan].price}/mo`:"No plan"}</div></div>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              {an>0&&<Badge type="pending" label={`${an} action`}/>}
              {c.status==="suspended"&&<Badge type="suspended"/>}
              <span style={{fontSize:12,color:T.sub,fontWeight:700}}>{lv} live</span>
              <span style={{fontSize:12,fontWeight:800,color:c.napScore>=90?T.green:c.napScore>=70?T.amber:T.red}}>NAP {c.napScore||0}%</span>
              <span style={{color:T.brand,fontSize:12.5,fontWeight:800}}>→</span>
            </div>
          </div>);})}
      </Card>
    </div>);
  };

  const Clients=()=>{
    const[search,setSearch]=useState("");
    const[planF,setPlanF]=useState("all");
    const[statusF,setStatusF]=useState("all");
    const filtered=clients.filter(c=>{
      if(search&&!`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase()))return false;
      if(planF!=="all"&&c.plan!==planF)return false;
      if(statusF!=="all"&&(c.status||"active")!==statusF)return false;
      return true;
    });
    const exportCols=[
      {key:"businessName",label:"Business"},{key:"name",label:"Contact"},{key:"email",label:"Email"},
      {key:"phone",label:"Phone"},{key:"city",label:"City"},{key:"state",label:"State"},
      {key:"plan",label:"Plan",get:c=>c.plan?PLANS[c.plan]?.name:"None"},
      {key:"status",label:"Status",get:c=>c.status||"active"},
      {key:"napScore",label:"NAP %"},
      {label:"Live Listings",get:c=>(listings[c.id]||[]).filter(l=>l.status==="live").length},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Clients" sub={`${clients.length} clients`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"clientForm"})}>+ Add Client</Btn>}/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search by business, name, email, city…"
        filters={[
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]},
        ]}
        rows={filtered} cols={exportCols} exportName="naporbit-clients" exportTitle="Clients"/>
      {filtered.length===0?<Card><Empty icon="🔍" title="No clients found" sub="Try a different search or filter, or add a client."/></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((c,idx)=>{
          const cl=listings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const pd=cl.filter(l=>l.status==="pending").length;const fl=cl.filter(l=>l.status==="flagged"||l.status==="rejected").length;const an=cl.filter(l=>l.actionNeeded).length;
          return(<Card key={c.id} hover style={{cursor:"pointer"}}>
            <div onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${PLANS[c.plan]?.color||T.faint},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",flexShrink:0}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,display:"flex",alignItems:"center",gap:8}}>{c.businessName||c.name}{c.status==="suspended"&&<Badge type="suspended"/>}</div>
                  <div style={{fontSize:12,color:T.sub}}>{c.name} · {c.city||"–"}{c.state?", "+c.state:""} · {c.category||"–"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:isMobile?12:18,alignItems:"center",flexWrap:"wrap"}}>
                {an>0&&<Badge type="pending" label={`${an} action`}/>}
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.green,fontFamily:FONT_D}}>{lv}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>LIVE</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.amber,fontFamily:FONT_D}}>{pd}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>PENDING</div></div>
                {fl>0&&<div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.red,fontFamily:FONT_D}}>{fl}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>FLAGS</div></div>}
                <Badge type="submitted" label={c.plan?`$${PLANS[c.plan].price}/mo`:"No plan"}/>
                <span style={{color:T.brand,fontWeight:800}}>→</span>
              </div>
            </div>
          </Card>);})}
      </div>}
    </div>);
  };

  const ClientDetail=()=>{
    const c=clients.find(x=>x.id===selClient);
    const[nap,setNap]=useState(0);
    const[chatOpen,setChatOpen]=useState(false);
    useEffect(()=>{
      if(c)setNap(c.napScore||0);
      setChatOpen(false);
    },[c?.id]);
    if(!c)return(
      <Card>
        <Empty icon="👤" title="Client not found" sub="Go back to Clients and pick another account."/>
        <Btn variant="soft" size="sm" onClick={()=>{setPage("clients");setSelClient(null);}}>← Clients</Btn>
      </Card>
    );
    const cl=listings[c.id]||[];
    // Agents reach ClientDetail only for clients assigned to them (clients list is pre-scoped),
    // so if an agent can open this client, they're allowed to edit it.
    const canEdit=isStaffMgr||(isAgent&&c.assignedAgentId===user.id);
    // Per-action permissions. Staff/managers have all; agents limited by their granted perms.
    const ap=user.perms||{listings:true,nap:true,logEdit:true,gmb:true};
    const can=(action)=>isStaffMgr||(isAgent&&c.assignedAgentId===user.id&&ap[action]!==false);
    const fmtDT=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"";
    return(<div>
      {c.status==="suspended"&&<Card style={{marginBottom:16,background:T.redSoft,border:`1px solid ${T.red}33`}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>⏸</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:T.red}}>Account suspended</div>
            <div style={{fontSize:12.5,color:T.sub,marginTop:4,lineHeight:1.6}}>
              {c.suspendedAt&&<>Suspended on <b>{fmtDT(c.suspendedAt)}</b></>}{c.suspendedBy&&<> by <b>{c.suspendedBy}</b></>}.
              {c.suspendReason?<><br/>Reason: {c.suspendReason}</>:<><br/>No reason recorded.</>}
            </div>
          </div>
        </div>
      </Card>}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,padding:"7px 14px",color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>← Clients</button>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?17:21,fontWeight:800}}>{c.businessName||c.name}</div>
        <Badge type={c.status==="suspended"?"suspended":"active"}/>{c.plan&&<Badge type="submitted" label={`${PLANS[c.plan].name} $${PLANS[c.plan].price}/mo`}/>}
      </div>
      {(canEdit||can("gmb")||can("nap")||can("logEdit")||can("listings"))&&<div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <Btn variant={chatOpen?"soft":"ghost"} size="sm" onClick={()=>setChatOpen(o=>!o)}>{chatOpen?"Hide chat":"💬 Open chat"}</Btn>
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"clientForm",client:c})}>✏️ Edit Info</Btn>}
        {canImpersonate&&<Btn variant="soft" size="sm" onClick={()=>{audit("client.impersonate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});setViewAs(c.id);}}>👁️ Open Account (read-only)</Btn>}
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>🔗 Integrations</Btn>}
        {isStaffMgr&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"analytics",client:c})}>📈 Update Analytics</Btn>}
        {c.plan==="gmb"&&can("gmb")&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>📍 Update GMB</Btn>}
        {c.plan==="gmb"&&isStaffMgr&&<Btn variant="soft" size="sm" onClick={()=>{const month=new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"});setConfirm({title:"Mark report as sent?",msg:`Confirm you've emailed the ${month} GMB report to ${c.reportEmail||c.email}. The client will see "Report sent for ${month}".`,yes:"Mark sent",onYes:()=>R(async()=>{await api.patchProfile(c.id,{reportSentMonth:month});await audit("report.sent",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name,detail:month});await addActivity(c.id,"gmb_update",`Monthly report sent for ${month}`);},"Report marked as sent")});}}>📤 Mark Report Sent</Btn>}
        {isStaffMgr&&(c.status==="active"?
          <Btn variant="ghost" size="sm" onClick={()=>setModal({type:"suspend",client:c})}>⏸ Suspend</Btn>:
          <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.patchProfile(c.id,{status:"active",suspendedAt:null,suspendReason:null,suspendedBy:null});await audit("client.reactivate",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client reactivated")}>▶ Reactivate</Btn>)}
        {isAdmin&&!c.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Delete client?",msg:`Move ${c.businessName||c.name} to Trash? Recoverable for 30 days, then permanently removed with all their listings.`,danger:true,yes:"Delete",onYes:()=>R(async()=>{await api.deleteUser(c.id);await audit("client.delete",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client moved to Trash").then(()=>{setPage("clients");setSelClient(null);})})}>🗑 Delete</Btn>}
        {c.protected&&<span style={{fontSize:11,color:T.faint,alignSelf:"center"}}>🔒 Demo account (protected)</span>}
      </div>}
      {!(canEdit||can("gmb")||can("nap")||can("logEdit")||can("listings"))&&(
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          <Btn variant={chatOpen?"soft":"ghost"} size="sm" onClick={()=>setChatOpen(o=>!o)}>{chatOpen?"Hide chat":"💬 Open chat"}</Btn>
        </div>
      )}
      {chatOpen&&(
        <div style={{marginBottom:18}}>
          <ChatThread
            clientId={c.id}
            myId={user.id}
            peerLabel={c.businessName||c.name||c.email}
            toast={toast}
            compact
          />
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:18}}>
        <Card><SectionTitle>Business Info</SectionTitle>
          {[["Owner",c.name],["Email",c.email],["Phone",c.phone],["Address",`${c.address||"–"}${c.city?", "+c.city:""}${c.state?", "+c.state:""}`],["Website",c.website||"–"],["Category",c.category||"–"],["GA4 ID",c.gaId||"Not connected"],["GBP ID",c.gbpId||"Not connected"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{fontSize:12.5,color:T.faint,fontWeight:700}}>{k}</span><span style={{fontSize:12.5,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{v}</span>
            </div>))}
        </Card>
        <Card><SectionTitle>NAP Consistency</SectionTitle>
          <div style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,textAlign:"center",padding:"8px 0",color:nap>=90?T.green:nap>=70?T.amber:T.red}}>{nap}%</div>
          {can("nap")||can("logEdit")?<>
          {can("nap")&&<><input type="range" min="0" max="100" value={nap} onChange={e=>setNap(+e.target.value)} style={{width:"100%",accentColor:T.brand}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>setModal({type:"napConfirm",client:c,newScore:nap})}>Save NAP Score</Btn></>}
          {can("logEdit")&&<button onClick={()=>setModal({type:"logEdit",client:c})} style={{width:"100%",marginTop:10,padding:"11px 0",background:T.redSoft,border:"none",borderRadius:11,color:T.red,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:FONT_B}}>🛡️ Log Unauthorized Edit + Revert</button>}</>:
          <div style={{fontSize:12,color:T.faint,textAlign:"center"}}>View only</div>}
        </Card>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Listings ({cl.length})</div>
          {can("listings")&&<Btn size="sm" onClick={()=>setModal({type:"addListing",clientId:c.id})}>+ Add Listing</Btn>}
        </div>
        {cl.length===0?<Empty icon="📋" title="No listings yet" sub="Add the first directory submission."/>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cl.map(d=>(<div key={d.id} style={{border:`1px solid ${d.actionNeeded?T.amber:T.line}`,borderRadius:13,padding:"14px 16px",background:d.actionNeeded?T.amberSoft:T.surface}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13.5,fontWeight:800}}>{d.directory}</span>
                <Badge type={d.status}/>
                {d.napMatch&&d.napMatch!=="–"&&<Badge type={d.napMatch}/>}
                {d.da>0&&<span style={{fontSize:11,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.faint}}>DA {d.da}</span>}
                {d.liveLink&&<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12,fontWeight:700,textDecoration:"none"}}>View ↗</a>}
              </div>
              {can("listings")&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"updateListing",listing:d,clientId:c.id})}>Update</Btn>}
            </div>
            {d.actionNeeded&&<div style={{marginTop:10,padding:"9px 12px",background:"#fff",borderRadius:9,fontSize:12,color:T.amber,fontWeight:700,display:"flex",alignItems:"center",gap:7}}>⚠️ Client action: {d.actionNote||"Verification required from the client"}</div>}
            {d.notes&&<div style={{marginTop:8,fontSize:12,color:T.sub,lineHeight:1.5}}><b style={{color:T.faint}}>Notes:</b> {d.notes}</div>}
          </div>))}
        </div>}
      </Card>
      <Card><SectionTitle>Activity Log</SectionTitle>
        {activity.filter(a=>a.clientId===c.id).length===0?<Empty icon="📜" title="No activity yet" sub="Actions for this client appear here."/>:
          activity.filter(a=>a.clientId===c.id).map((a,i,arr)=>(<div key={a.id} style={{display:"flex",gap:12,padding:"10px 6px",borderBottom:i<arr.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
            <div><div style={{fontSize:12.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
          </div>))}
      </Card>
    </div>);
  };

  const AllListings=()=>{
    const[filter,setFilter]=useState("all");
    const[search,setSearch]=useState("");
    // Agents only see listings for clients assigned to them; staff see all.
    const scopedIds=new Set(clients.map(c=>c.id));
    const scopedFlat=isAgent?flat.filter(l=>scopedIds.has(l.clientId)):flat;
    const withNames=scopedFlat.map(l=>({...l,_name:clients.find(c=>c.id===l.clientId)?.businessName||"?"}));
    let filtered=filter==="all"?withNames:filter==="action"?withNames.filter(l=>l.actionNeeded):withNames.filter(l=>l.status===filter);
    if(search)filtered=filtered.filter(l=>`${l._name} ${l.directory} ${l.status}`.toLowerCase().includes(search.toLowerCase()));
    const cnt=(s)=>s==="all"?withNames.length:s==="action"?withNames.filter(l=>l.actionNeeded).length:withNames.filter(l=>l.status===s).length;
    const exportCols=[
      {key:"_name",label:"Client"},{key:"directory",label:"Directory"},{key:"status",label:"Status"},
      {key:"da",label:"DA"},{key:"liveDate",label:"Live Date"},{key:"napMatch",label:"NAP"},
      {label:"Action Needed",get:l=>l.actionNeeded?"Yes":"No"},{key:"actionNote",label:"Action Note"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="All Listings" sub={`${withNames.length} total across ${clients.length} clients`}/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search client, directory, status…"
        rows={filtered} cols={exportCols} exportName="naporbit-listings" exportTitle="All Listings"/>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","live","pending","submitted","flagged","rejected","action"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"7px 15px",borderRadius:20,border:`1.5px solid ${filter===s?T.brand:T.line}`,background:filter===s?T.brandSoft:T.surface,color:filter===s?T.brand:T.sub,fontSize:12.5,fontWeight:filter===s?800:600,cursor:"pointer",fontFamily:FONT_B}}>{s==="action"?"⚠️ Client action":s[0].toUpperCase()+s.slice(1)} ({cnt(s)})</button>))}
      </div>
      <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
        {filtered.length===0?<Empty icon="📋" title="Nothing here" sub={`No ${filter} listings right now.`}/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
          <thead><tr>{["Client","Directory","Status","DA","Live","NAP","Flag","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((d)=>(<tr key={d.id} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d._name}</td>
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.da||"–"}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="–"?T.faint:T.green,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="–"?<span style={{fontSize:11,color:T.faint}}>–</span>:<Badge type={d.napMatch}/>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.actionNeeded?<span title={d.actionNote} style={{fontSize:14}}>⚠️</span>:<span style={{fontSize:11,color:T.faint}}>–</span>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Btn variant="soft" size="sm" onClick={()=>{setSelClient(d.clientId);setPage("clientDetail");}}>Open</Btn></td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const GmbAdmin=()=>{
    const gmbClients=clients.filter(c=>c.plan==="gmb");
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={`${gmbClients.length} GMB Pro clients`}/>
      {gmbClients.length===0?<Card><Empty icon="📍" title="No GMB Pro clients yet" sub="Clients on the $249 plan appear here."/></Card>:
        gmbClients.map(c=>{const d=gmb[c.id];
          return(<Card key={c.id} hover style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:13,alignItems:"center"}}>
                <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.violet},${T.brand})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>{c.businessName}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{d?`${d.views?.toLocaleString()||0} views · ${d.calls||0} calls · ${d.directions||0} directions · ${d.posts?.length||0} posts`:"No GMB data yet"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" size="sm" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>View</Btn>
                <Btn variant="green" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>Update GMB</Btn>
              </div>
            </div>
          </Card>);})}
    </div>);
  };

  const[teamView,setTeamView]=useState(null); // staff member whose logs are open
  // Staff credentials row: email + password with show/copy. Visible to super-admin/manager only.
  const CredsRow=({m})=>{
    const[show,setShow]=useState(false);
    const copy=(txt,label)=>{try{navigator.clipboard.writeText(txt);toast(`${label} copied`);}catch{toast("Copy failed","info");}};
    const Field=({label,value,mono})=>(
      <div style={{flex:"1 1 200px"}}>
        <div style={{fontSize:10,fontWeight:800,color:T.faint,letterSpacing:".5px",marginBottom:4}}>{label}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <code style={{flex:1,fontSize:12.5,fontFamily:mono?"monospace":FONT_B,background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,padding:"7px 10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</code>
          <button onClick={()=>copy(value,label)} title="Copy" style={{border:"none",background:T.surface2,borderRadius:8,padding:"7px 9px",cursor:"pointer",fontSize:12}}>📋</button>
        </div>
      </div>
    );
    return(<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.line}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10.5,fontWeight:800,color:T.faint,letterSpacing:".6px"}}>🔑 LOGIN CREDENTIALS{m.createdByRole?` · created by ${m.createdByRole}`:""}</span>
        <button onClick={()=>setShow(s=>!s)} style={{border:"none",background:"none",color:T.brand,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>{show?"Hide":"Show"}</button>
      </div>
      {show&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Field label="EMAIL" value={m.email}/>
        <Field label="PASSWORD" value={m.staffPassword} mono/>
      </div>}
    </div>);
  };
  const Team=()=>{
    // Managers see agents + themselves (not super-admins), and cannot manage grants/removal.
    const visibleStaff=isAdmin?staff:staff.filter(m=>m.role==="agent"||m.id===user.id);
    if(teamView){
      const m=staff.find(x=>x.id===teamView);
      if(!m){setTeamView(null);return null;}
      // This member's actions across the platform (audit + activity they performed).
      const memberActs=activity.filter(a=>a.by===m.name);
      const assigned=allClients.filter(c=>c.assignedAgentId===m.id);
      return(<div>
        <button onClick={()=>setTeamView(null)} style={{background:"none",border:"none",color:T.brand,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14,fontFamily:FONT_B}}>← Back to Team</button>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
          <div><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>{m.name}</div><div style={{fontSize:13,color:T.sub}}>{m.email} · {m.role==="manager"?"Manager":m.role==="super_admin"?"Super Admin":"Agent"}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
          <StatCard label="Actions logged" value={memberActs.length} icon="⚡" color={T.brand} soft={T.brandSoft}/>
          {m.role==="agent"&&<StatCard label="Clients assigned" value={assigned.length} icon="👥" color={T.blue} soft={T.blueSoft}/>}
          <StatCard label="Last active" value={memberActs[0]?.date?memberActs[0].date.split(" at ")[0]:"–"} icon="🕐" color={T.violet} soft={T.violetSoft}/>
        </div>
        {m.role==="agent"&&<Card style={{marginBottom:16}}>
          <SectionTitle sub="Clients this agent can work on">Assigned clients</SectionTitle>
          {assigned.length===0?<div style={{fontSize:12.5,color:T.faint}}>No clients assigned yet.</div>:
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{assigned.map(c=><span key={c.id} style={{fontSize:12,fontWeight:700,background:T.surface2,padding:"5px 11px",borderRadius:20}}>{c.businessName||c.name}</span>)}</div>}
          {isStaffMgr&&<Btn variant="ghost" size="sm" style={{marginTop:12}} onClick={()=>setModal({type:"assign",agent:m})}>Manage assignments</Btn>}
        </Card>}
        <Card>
          <SectionTitle sub={`Everything ${m.name} has done on the platform`}>Activity log</SectionTitle>
          {memberActs.length===0?<Empty icon="📭" title="No activity yet" sub="This member's actions will appear here."/>:
            memberActs.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:12,padding:"11px 8px",borderBottom:i<memberActs.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date}{a.clientId&&a.clientId!=="__internal"?` · ${clients.find(c=>c.id===a.clientId)?.businessName||""}`:""}</div></div>
            </div>))}
        </Card>
      </div>);
    }
    return(<div>
      <PageHead isMobile={isMobile} title="Team" sub={`${visibleStaff.length} team members`} right={isStaffMgr&&<Btn onClick={()=>setModal({type:"team"})}>+ Add Member</Btn>}/>
      {visibleStaff.map((m)=>(<Card key={m.id} hover style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",gap:13,alignItems:"center"}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:m.role==="super_admin"?`linear-gradient(135deg,${T.brand},${T.violet})`:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
            <div><div style={{fontSize:14,fontWeight:800}}>{m.name}</div><div style={{fontSize:12,color:T.sub}}>{m.email}</div></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
            {m.role==="agent"&&<span style={{fontSize:11,color:T.sub,fontWeight:700,background:T.blueSoft,padding:"3px 9px",borderRadius:20}}>{allClients.filter(c=>c.assignedAgentId===m.id).length} clients</span>}
            <Btn variant="ghost" size="sm" onClick={()=>setTeamView(m.id)}>View logs</Btn>
            {isStaffMgr&&m.role==="agent"&&<Btn variant="ghost" size="sm" onClick={()=>setModal({type:"assign",agent:m})}>Assign clients</Btn>}
            {isAdmin&&m.role==="manager"&&<Btn variant={m.canImpersonate?"green":"ghost"} size="sm" onClick={()=>R(async()=>{await api.setImpersonateGrant(m.id,!m.canImpersonate);await audit("grant.impersonate",{targetType:"staff",targetId:m.id,targetName:m.name,detail:m.canImpersonate?"revoked":"granted"});},m.canImpersonate?"Account access revoked":"Account access granted")}>{m.canImpersonate?"✓ Can view accounts":"Allow account access"}</Btn>}
            {isAdmin&&m.id!==user.id&&m.role!=="super_admin"&&!m.protected&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Remove team member?",msg:`Remove ${m.name} from the team?`,danger:true,yes:"Remove",onYes:()=>R(async()=>api.deleteUser(m.id),`${m.name} removed`)})}>Remove</Btn>}
            {m.protected&&<span style={{fontSize:11,color:T.faint}}>🔒 Demo</span>}
          </div>
        </div>
        {m.staffPassword&&!m.protected&&<CredsRow m={m}/>}
      </Card>))}
      <Card style={{background:T.surface2,boxShadow:"none",border:`1px dashed ${T.line}`}}>
        <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ROLE PERMISSIONS</div>
        {[["Super Admin",T.brand,"Full access, clients, listings, GMB, team, finance, settings, and read-only account view"],["Manager",T.amber,"Clients, listings, GMB, assign clients to agents, view team logs. Account view only if granted."],["Agent",T.blue,"Update listings only for clients a manager has assigned to them."]].map(([r,c,p])=>(
          <div key={r} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:3,background:c,marginTop:5,flexShrink:0}}/><div style={{fontSize:12.5}}><b style={{color:c}}>{r}:</b> <span style={{color:T.sub}}>{p}</span></div></div>))}
      </Card>
    </div>);
  };

  const Activity=()=>{
    const[search,setSearch]=useState("");
    const[typeF,setTypeF]=useState("all");
    const[byF,setByF]=useState("all");
    const[timeF,setTimeF]=useState("all");
    const types=[...new Set(activity.map(a=>a.type))];
    const people=[...new Set(activity.map(a=>a.by).filter(Boolean))];
    const inWindow=(dateStr)=>{
      if(timeF==="all")return true;
      const d=new Date(dateStr);if(isNaN(d))return true;
      const days=(Date.now()-d.getTime())/86400000;
      return timeF==="7"?days<=7:timeF==="30"?days<=30:timeF==="90"?days<=90:true;
    };
    let filtered=activity.filter(a=>{
      if(typeF!=="all"&&a.type!==typeF)return false;
      if(byF!=="all"&&a.by!==byF)return false;
      if(!inWindow(a.date))return false;
      if(search){const cn=clients.find(c=>c.id===a.clientId)?.businessName||"";if(!`${a.desc} ${a.by} ${cn}`.toLowerCase().includes(search.toLowerCase()))return false;}
      return true;
    });
    const cols=[
      {key:"date",label:"Date"},{key:"type",label:"Type"},{key:"desc",label:"Event"},
      {label:"Client",get:a=>clients.find(c=>c.id===a.clientId)?.businessName||"–"},{key:"by",label:"By"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Activity Log" sub="Every platform event, newest first"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search event, person, client…"
        filters={[
          {value:typeF,set:setTypeF,options:[{value:"all",label:"All types"},...types.map(t=>({value:t,label:t.replace(/_/g," ")}))]},
          {value:byF,set:setByF,options:[{value:"all",label:"All people"},...people.map(p=>({value:p,label:p}))]},
          {value:timeF,set:setTimeF,options:[{value:"all",label:"All time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"}]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-activity" exportTitle="Activity Log"/>
      <Card>
        {filtered.length===0?<Empty icon="📜" title="No matching activity" sub="Try a different search or filter."/>:
          filtered.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<filtered.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                <div style={{fontSize:13,fontWeight:600}}>{a.desc}</div>
                <div style={{fontSize:11,color:T.faint}}>{a.date}</div>
              </div>
              <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{clients.find(c=>c.id===a.clientId)?.businessName||"–"} · by {a.by}</div>
            </div>
          </div>))}
      </Card>
    </div>);
  };

  const Finance=()=>{
    const[search,setSearch]=useState("");
    const[statusF,setStatusF]=useState("all");
    const[planF,setPlanF]=useState("all");
    // Lifecycle status per client: cancelled > paused > active. Uses real profile fields.
    const lifecycle=(c)=>{
      if(c.status==="suspended")return "paused";
      if(c.cancelAtPeriodEnd||c.canceledAt)return c.plan?"cancelling":"cancelled";
      if(c.plan&&c.status==="active")return "active";
      return "no plan";
    };
    const monthsActive=(c)=>{
      if(!c.createdAt)return 1;
      const start=new Date(c.createdAt);const end=c.canceledAt?new Date(c.canceledAt):new Date();
      return Math.max(1,Math.round((end-start)/2629800000));
    };
    const priceOf=(c)=>PLANS[c.plan]?.price||0;
    const ltv=(c)=>priceOf(c)*monthsActive(c);
    const rows=clients.map(c=>({...c,_status:lifecycle(c),_ltv:ltv(c),_months:monthsActive(c)}));
    // Metrics
    const activeClients=rows.filter(r=>r._status==="active"||r._status==="cancelling");
    const activeMRR=activeClients.reduce((s,c)=>s+priceOf(c),0);
    const thisMonth=new Date().getMonth();
    const newThisMonth=rows.filter(c=>c.createdAt&&new Date(c.createdAt).getMonth()===thisMonth).length;
    const churnedThisMonth=rows.filter(c=>c.canceledAt&&new Date(c.canceledAt).getMonth()===thisMonth).length;
    const churnedMRR=rows.filter(c=>c._status==="cancelled").reduce((s,c)=>s+priceOf(c),0);
    let filtered=rows;
    if(statusF!=="all")filtered=filtered.filter(r=>r._status===statusF);
    if(planF!=="all")filtered=filtered.filter(r=>r.plan===planF);
    if(search)filtered=filtered.filter(r=>`${r.businessName} ${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
    const fmtDate=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"–";
    const statusColor={active:T.green,cancelling:T.amber,cancelled:T.red,paused:T.faint,"no plan":T.faint};
    const cols=[
      {key:"businessName",label:"Business"},{key:"email",label:"Email"},
      {key:"plan",label:"Plan",get:c=>PLANS[c.plan]?.name||"None"},
      {label:"Price",get:c=>`$${priceOf(c)}`},
      {label:"Status",get:c=>c._status},
      {label:"Signed Up",get:c=>fmtDate(c.createdAt)},
      {label:"Cancelled/Paused",get:c=>fmtDate(c.canceledAt)},
      {label:"Months",get:c=>c._months},{label:"LTV",get:c=>`$${c._ltv}`},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Finance" sub="Full subscription lifecycle, revenue, and churn"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Active MRR" value={`$${activeMRR}`} sub={`${activeClients.length} paying`} icon="💵" color={T.green} soft={T.greenSoft}/>
        <StatCard label="New This Month" value={newThisMonth} sub="signups" icon="📈" color={T.brand} soft={T.brandSoft}/>
        <StatCard label="Churned This Month" value={churnedThisMonth} sub="cancellations" icon="📉" color={T.red} soft={T.redSoft}/>
        <StatCard label="Lost MRR" value={`$${churnedMRR}`} sub="from cancelled" icon="⚠️" color={T.amber} soft={T.amberSoft}/>
      </div>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search business, email…"
        filters={[
          {value:statusF,set:setStatusF,options:[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"cancelling",label:"Cancelling"},{value:"cancelled",label:"Cancelled"},{value:"paused",label:"Paused"},{value:"no plan",label:"No plan"}]},
          {value:planF,set:setPlanF,options:[{value:"all",label:"All plans"},...Object.entries(PLANS).map(([id,p])=>({value:id,label:p.name}))]},
        ]}
        rows={filtered} cols={cols} exportName="naporbit-finance" exportTitle="Finance Lifecycle"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="💰" title="No clients match" sub="Adjust filters."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
          <thead><tr>{["Business","Plan","Status","Signed Up","Cancelled/Paused","Months","LTV"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(c=>(<tr key={c.id} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c.businessName||c.name}<br/><span style={{fontSize:11,color:T.faint,fontWeight:400}}>{c.email}</span></td>
            <td style={{padding:"11px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}>{PLANS[c.plan]?.name||"–"}<br/><span style={{fontSize:11,color:T.faint}}>${priceOf(c)}/mo</span></td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><span style={{fontSize:11,fontWeight:800,color:statusColor[c._status],background:statusColor[c._status]+"1a",padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{c._status}</span></td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.createdAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{fmtDate(c.canceledAt)}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{c._months}</td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:T.green,borderBottom:`1px solid ${T.line}`}}>${c._ltv}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const AuditTrail=()=>{
    const[search,setSearch]=useState("");
    const[actionF,setActionF]=useState("all");
    const auditRows=(data.audit||[]);
    const actions=[...new Set(auditRows.map(a=>a.action))];
    let filtered=auditRows;
    if(actionF!=="all")filtered=filtered.filter(a=>a.action===actionF);
    if(search)filtered=filtered.filter(a=>`${a.actorName} ${a.action} ${a.targetName} ${a.detail}`.toLowerCase().includes(search.toLowerCase()));
    const cols=[
      {key:"createdAt",label:"When",get:a=>new Date(a.createdAt).toLocaleString()},
      {key:"actorName",label:"Staff"},{key:"actorRole",label:"Role"},
      {key:"action",label:"Action"},{key:"targetName",label:"Target"},{key:"detail",label:"Detail"},
    ];
    return(<div>
      <PageHead isMobile={isMobile} title="Audit Trail" sub="Every sensitive staff action, who did what, and when"/>
      <ListToolbar search={search} setSearch={setSearch} placeholder="🔍  Search staff, action, target…"
        filters={[{value:actionF,set:setActionF,options:[{value:"all",label:"All actions"},...actions.map(a=>({value:a,label:a}))]}]}
        rows={filtered} cols={cols} exportName="naporbit-audit" exportTitle="Audit Trail"/>
      <Card style={{overflowX:"auto"}}>
        {filtered.length===0?<Empty icon="🛡️" title="No audit records yet" sub="Staff actions like edits, deletes, and suspensions are logged here."/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["When","Staff","Action","Target","Detail"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(a=>(<tr key={a.id} className="hoverRow">
            <td style={{padding:"10px 12px",fontSize:11.5,color:T.faint,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</td>
            <td style={{padding:"10px 12px",fontSize:12.5,borderBottom:`1px solid ${T.line}`}}><b>{a.actorName}</b><br/><span style={{fontSize:10.5,color:T.faint}}>{a.actorRole}</span></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={a.action.includes("delete")?"rejected":a.action.includes("suspend")?"pending":"submitted"} label={a.action}/></td>
            <td style={{padding:"10px 12px",fontSize:12.5,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{a.targetName||"–"}</td>
            <td style={{padding:"10px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{a.detail||"–"}</td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const Trash=()=>{
    const tUsers=data.trashedUsers||[];const tListings=data.trashedListings||[];
    const daysLeft=(d)=>{const gone=Math.floor((Date.now()-new Date(d).getTime())/86400000);return Math.max(0,30-gone);};
    return(<div>
      <PageHead isMobile={isMobile} title="Trash" sub="Deleted items are recoverable for 30 days, then permanently purged"/>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub={`${tUsers.length} deleted client(s)`}>Deleted Clients</SectionTitle>
        {tUsers.length===0?<Empty icon="✓" title="No deleted clients" sub="Deleted clients appear here for recovery."/>:
          tUsers.map(c=>(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 6px",borderBottom:`1px solid ${T.line}`,flexWrap:"wrap",gap:10}}>
            <div><b style={{fontSize:13.5}}>{c.businessName||c.name}</b> <span style={{fontSize:12,color:T.sub}}>· {c.email}</span><div style={{fontSize:11,color:daysLeft(c.deletedAt)<7?T.red:T.faint,marginTop:2}}>{daysLeft(c.deletedAt)} days until permanent deletion</div></div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.restoreUser(c.id);await audit("client.restore",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Client restored")}>↺ Restore</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Permanently delete?",msg:`This will permanently remove ${c.businessName||c.name} and all their data. This cannot be undone.`,danger:true,yes:"Delete forever",onYes:()=>R(async()=>{await api.purgeUser(c.id);await audit("client.purge",{targetType:"client",targetId:c.id,targetName:c.businessName||c.name});},"Permanently deleted")})}>Delete forever</Btn>
            </div>
          </div>))}
      </Card>
      <Card>
        <SectionTitle sub={`${tListings.length} deleted listing(s)`}>Deleted Listings</SectionTitle>
        {tListings.length===0?<Empty icon="✓" title="No deleted listings" sub="Deleted listings appear here for recovery."/>:
          tListings.map(l=>{const cn=[...clients,...tUsers].find(c=>c.id===l.clientId)?.businessName||"?";
          return(<div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 6px",borderBottom:`1px solid ${T.line}`,flexWrap:"wrap",gap:10}}>
            <div><b style={{fontSize:13.5}}>{l.directory}</b> <span style={{fontSize:12,color:T.sub}}>· {cn}</span><div style={{fontSize:11,color:daysLeft(l.deletedAt)<7?T.red:T.faint,marginTop:2}}>{daysLeft(l.deletedAt)} days until permanent deletion</div></div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="green" size="sm" onClick={()=>R(async()=>{await api.restoreListing(l.id);await audit("listing.restore",{targetType:"listing",targetId:l.id,targetName:l.directory});},"Listing restored")}>↺ Restore</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({title:"Permanently delete?",msg:`Permanently remove ${l.directory}? This cannot be undone.`,danger:true,yes:"Delete forever",onYes:()=>R(async()=>{await api.purgeListing(l.id);await audit("listing.purge",{targetType:"listing",targetId:l.id,targetName:l.directory});},"Permanently deleted")})}>Delete forever</Btn>
            </div>
          </div>);})}
      </Card>
    </div>);
  };

  const Settings=()=>{
    const s={pubKey:"",...(settings?.stripe||{})};
    const[f,setF]=useState({pubKey:s.pubKey||""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const[stripeLive,setStripeLive]=useState(false);
    useEffect(()=>{(async()=>{const st=await api.billingStatus();setStripeLive(!!st.configured);})();},[]);
    // Control-panel config: notification emails, report recipients, prices, toggles. UI-editable, DB-stored.
    const cfg0={
      notifyEmail:"info@naporbit.com",
      reportEmails:"info@naporbit.com, naporbit@gmail.com",
      priceEssentials:PLANS.essentials.price, priceGrowth:PLANS.growth.price, priceGmb:PLANS.gmb.price,
      notifySignup:true, notifyCancel:true, notifyPlanChange:true, notifyAgentEdit:true, monthlyReport:true,
      allowSignups:true,
      livePlanEssentials:true, livePlanGrowth:true, livePlanGmb:true,
      ...(settings?.config||{})
    };
    const[c,setC]=useState(cfg0);
    const setCfg=(k,v)=>setC(x=>({...x,[k]:v}));
    const webhookUrl=(typeof window!=="undefined"?window.location.origin:"https://rankorbit-platform.vercel.app")+"/api/stripe-webhook";
    const Toggle=({label,k,sub})=>(
      <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"11px 0",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
        <div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{label}</div>{sub&&<div style={{fontSize:11,color:T.faint,marginTop:2}}>{sub}</div>}</div>
        <input type="checkbox" checked={!!c[k]} onChange={e=>setCfg(k,e.target.checked)} style={{width:17,height:17,accentColor:T.brand,flexShrink:0}}/>
      </label>
    );
    return(<div>
      <PageHead isMobile={isMobile} title="Settings" sub="Control panel, payments, and platform configuration"/>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Change these anytime, no developer needed. Saved to your database and applied across the platform.">Control Panel</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:10}}>NOTIFICATION EMAILS</div>
            <Input label="Event notifications to" value={c.notifyEmail} onChange={v=>setCfg("notifyEmail",v)} placeholder="info@naporbit.com"/>
            <Input label="Monthly report recipients (comma-separated)" value={c.reportEmails} onChange={v=>setCfg("reportEmails",v)} placeholder="info@naporbit.com, naporbit@gmail.com"/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:10}}>PLAN PRICES ($ / month)</div>
            <div style={{display:"flex",gap:8}}>
              <Input label="Essentials" type="number" value={c.priceEssentials} onChange={v=>setCfg("priceEssentials",v)}/>
              <Input label="Growth" type="number" value={c.priceGrowth} onChange={v=>setCfg("priceGrowth",v)}/>
              <Input label="GMB Pro" type="number" value={c.priceGmb} onChange={v=>setCfg("priceGmb",v)}/>
            </div>
            <div style={{fontSize:11,color:T.faint,lineHeight:1.5,marginTop:2}}>Note: these update what clients see. Keep them in sync with your Stripe Price amounts.</div>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>LIVE PLANS (shown on website, signup & billing)</div>
          <Toggle label="Essentials plan is live" k="livePlanEssentials"/>
          <Toggle label="Growth plan is live" k="livePlanGrowth"/>
          <Toggle label="GMB Pro plan is live" k="livePlanGmb" sub="Turn off to launch it later. Existing clients on a hidden plan keep it."/>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>NOTIFICATIONS & TOGGLES</div>
          <Toggle label="Email on new signup" k="notifySignup"/>
          <Toggle label="Email on cancellation" k="notifyCancel"/>
          <Toggle label="Email on plan change" k="notifyPlanChange"/>
          <Toggle label="Alert managers when an agent edits/deletes a listing" k="notifyAgentEdit"/>
          <Toggle label="Send monthly finance report" k="monthlyReport" sub="Signups, revenue, cancellations to report recipients"/>
          <Toggle label="Allow public client signups" k="allowSignups" sub="Turn off to make the platform invite-only"/>
        </div>
        <Btn style={{marginTop:16}} onClick={()=>R(async()=>{await api.saveSettings({...settings,stripe:f,config:c});await audit("settings.update",{targetType:"settings",detail:"control panel"});},"Control panel saved")}>Save Control Panel</Btn>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Route each notification type to one or more email addresses. Separate multiple emails with commas. Toggle any type off to stop sending it.">Notifications & Email Routing</SectionTitle>
        <div style={{padding:"12px 15px",background:T.amberSoft,borderRadius:12,marginBottom:16,fontSize:12,color:T.amber,fontWeight:600,lineHeight:1.5}}>Clients always get in-app notifications. Staff emails below + client emails send via Resend once <code>RESEND_API_KEY</code> and <code>NOTIFY_FROM_EMAIL</code> are set in Vercel. Until then settings are saved and in-app still works.</div>
        {[
          {k:"routeSignup",label:"New client signup",desc:"When a client creates an account"},
          {k:"routeSuspend",label:"Client suspension",desc:"When a client is suspended or reactivated"},
          {k:"routeOnboard",label:"New client onboarding",desc:"When a client completes their profile / picks a plan"},
          {k:"routeCancel",label:"Cancellation",desc:"When a client cancels their subscription"},
          {k:"routeBdm",label:"BDM / call bookings",desc:"When a client books a call"},
          {k:"routeAgentEdit",label:"Agent edit alerts",desc:"When an agent edits or deletes a listing"},
          {k:"routeSystem",label:"System alerts",desc:"Errors, payment failures, and other platform alerts"},
          {k:"routeReport",label:"Monthly finance report",desc:"Signups, revenue, churn summary"},
        ].map((n,idx,arr)=>(
          <div key={n.k} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.2fr auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:idx<arr.length-1?`1px solid ${T.line}`:"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:800}}>{n.label}</div>
              <div style={{fontSize:11,color:T.faint,marginTop:2}}>{n.desc}</div>
            </div>
            <input value={c[n.k]??""} onChange={e=>setCfg(n.k,e.target.value)} placeholder="email@naporbit.com, other@…" style={{padding:"9px 13px",background:c[n.k+"On"]===false?T.surface2:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:12.5,fontFamily:FONT_B,boxSizing:"border-box",width:"100%",opacity:c[n.k+"On"]===false?.5:1}}/>
            <button onClick={()=>setCfg(n.k+"On",c[n.k+"On"]===false?true:false)} style={{padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:FONT_B,fontWeight:800,fontSize:11.5,background:c[n.k+"On"]===false?T.surface2:T.greenSoft,color:c[n.k+"On"]===false?T.faint:T.green,whiteSpace:"nowrap"}}>{c[n.k+"On"]===false?"Off":"On"}</button>
          </div>
        ))}
        <Btn style={{marginTop:16}} onClick={()=>R(async()=>{await api.saveSettings({...settings,stripe:f,config:c});await audit("settings.update",{targetType:"settings",detail:"notification routing"});},"Notification settings saved")}>Save Notification Settings</Btn>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Checkout, cancel, upgrades, and invoices run through Stripe Checkout + webhooks. Secrets live only in Vercel env — never in the database.">Stripe Billing</SectionTitle>
        <div style={{padding:"14px 16px",background:T.blueSoft,borderRadius:12,marginBottom:18,fontSize:12.5,color:T.blue,lineHeight:1.7}}>
          <div style={{fontWeight:800,marginBottom:6}}>Setup (Vercel env + Stripe Dashboard):</div>
          <div><b>1.</b> Stripe → Products → create 3 recurring monthly Prices ($49 / $89 / $249).</div>
          <div><b>2.</b> Vercel → Environment Variables: <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, <code>STRIPE_PRICE_ESSENTIALS</code>, <code>STRIPE_PRICE_GROWTH</code>, <code>STRIPE_PRICE_GMB</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>APP_URL</code>.</div>
          <div><b>3.</b> Stripe → Developers → Webhooks → Add endpoint. URL:</div>
          <div style={{margin:"6px 0",padding:"8px 11px",background:"#fff",borderRadius:8,fontFamily:"monospace",fontSize:11.5,color:T.ink,wordBreak:"break-all",userSelect:"all"}}>{webhookUrl}</div>
          <div><b>4.</b> Events: <code>checkout.session.completed</code>, <code>customer.subscription.created</code>, <code>customer.subscription.updated</code>, <code>customer.subscription.deleted</code>, <code>invoice.paid</code>, <code>invoice.payment_failed</code>, <code>invoice.finalized</code>.</div>
          <div><b>5.</b> Stripe → Settings → Billing → Customer portal: enable cancel, payment methods, invoices.</div>
          <div><b>6.</b> Run <code>supabase/stripe-billing.sql</code> in the Supabase SQL Editor (one time).</div>
        </div>
        <Input label="Stripe Publishable Key (optional, display only)" value={f.pubKey} onChange={v=>set("pubKey",v)} placeholder="pk_live_... or pk_test_..."/>
        <div style={{padding:"11px 14px",background:T.amberSoft,borderRadius:11,marginBottom:16,fontSize:11.5,color:T.amber,lineHeight:1.55}}>
          Secret keys and Price IDs are read from Vercel environment variables only. Do not paste <code>sk_</code> or <code>whsec_</code> here.
        </div>
        <Btn onClick={()=>R(async()=>api.saveSettings({...settings,stripe:{pubKey:f.pubKey||""}}),"Stripe settings saved")}>Save Stripe Settings</Btn>
      </Card>
      <Card>
        <SectionTitle sub="Current data backend">System</SectionTitle>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:13,color:T.sub}}>Database mode</span>
          <Badge type={api.mode==="supabase"?"connected":"manual"} label={api.mode==="supabase"?"Supabase (live)":"Local (demo)"}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:13,color:T.sub}}>Stripe Checkout</span>
          <Badge type={stripeLive?"connected":"manual"} label={stripeLive?"Configured":"Env not set (demo mode)"}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
          <span style={{fontSize:13,color:T.sub}}>Live GA4 / GBP auto-sync</span>
          <Badge type="pending" label="Next phase (OAuth)"/>
        </div>
      </Card>
    </div>);
  };

  // Read-only impersonation: show the selected client's dashboard behind a banner, no editing.
  if(viewAs){
    const c=allClients.find(x=>x.id===viewAs);
    if(!c){setViewAs(null);return null;}
    return(<>
      <div style={{position:"sticky",top:0,zIndex:1000,background:`linear-gradient(90deg,${T.amber},#E8890B)`,color:"#fff",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,boxShadow:SHADOW}}>
        <div style={{fontSize:13,fontWeight:700}}>👁️ Viewing {c.businessName||c.name}'s account (read-only). Changes are disabled.</div>
        <button onClick={()=>setViewAs(null)} style={{background:"rgba(255,255,255,.25)",border:"none",color:"#fff",padding:"6px 16px",borderRadius:8,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,fontSize:12.5}}>Exit view</button>
      </div>
      <div>
        <ClientDashboard user={c} data={data} reload={reload} onLogout={()=>setViewAs(null)} impersonating/>
      </div>
    </>);
  }

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={roleBadge} brandTag="ADMIN" badgeCounts={{notifications:notifBadge,messages:chatUnreadTotal}}>
    {page==="overview"&&<Overview/>}
    {page==="notifications"&&<NotificationsPage/>}
    {page==="messages"&&(
      <StaffMessagesInbox
        user={user}
        clients={clients}
        selClient={selClient}
        setSelClient={setSelClient}
        setChatUnreadTotal={setChatUnreadTotal}
        toast={toast}
        isMobile={isMobile}
        isAdmin={isAdmin}
      />
    )}
    {page==="clients"&&<Clients/>}
    {page==="clientDetail"&&<ClientDetail/>}
    {page==="listings"&&<AllListings/>}
    {page==="gmb"&&<GmbAdmin/>}
    {page==="team"&&<Team/>}
    {page==="activity"&&<Activity/>}
    {page==="finance"&&<Finance/>}
    {page==="audit"&&<AuditTrail/>}
    {page==="trash"&&<Trash/>}
    {page==="settings"&&<Settings/>}
  </Shell>
  {modal?.type==="clientForm"&&<ClientFormModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="team"&&<TeamModal onClose={()=>setModal(null)}/>}
  {modal?.type==="assign"&&<AssignModal agent={modal.agent} onClose={()=>setModal(null)}/>}
  {modal?.type==="suspend"&&<SuspendModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="napConfirm"&&<NapConfirmModal client={modal.client} newScore={modal.newScore} onClose={()=>setModal(null)}/>}
  {modal?.type==="logEdit"&&<LogEditModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="addListing"&&<AddListingModal clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="updateListing"&&<UpdateListingModal listing={modal.listing} clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="gmb"&&<GmbModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="analytics"&&<AnalyticsModal client={modal.client} onClose={()=>setModal(null)}/>}
  {modal?.type==="integrations"&&<IntegrationsModal client={modal.client} onClose={()=>setModal(null)}/>}
  <Confirm data={confirm} onClose={()=>setConfirm(null)}/>
  <Toasts/></>);
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
