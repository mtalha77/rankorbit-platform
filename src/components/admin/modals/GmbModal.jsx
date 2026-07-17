import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { today } from "../../../lib/helpers";
import { Modal, Input, Select, Btn, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function GmbModal({ client,onClose }) {
  const { gmb, R, audit, addActivity } = useAdmin();

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
  }
