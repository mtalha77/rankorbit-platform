import { useState } from "react";
import { T } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { Modal, Input, Btn, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function AnalyticsModal({ client,onClose }) {
  const { analytics, R, audit } = useAdmin();

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
  }
