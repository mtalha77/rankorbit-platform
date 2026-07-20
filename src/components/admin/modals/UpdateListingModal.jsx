import { useState } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { toDateInputValue, fromDateInputValue, todayFull } from "../../../lib/helpers";
import { Modal, Input, Select, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function UpdateListingModal({ listing,clientId,onClose }) {
  const { R, audit, addActivity, notifyManagersIfAgent, user, setConfirm } = useAdmin();

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
  }
