import { useState } from "react";
import { T } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { today, uid } from "../../../lib/helpers";
import { Modal, Input, Btn } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function AddListingModal({ clientId,onClose }) {
  const { R, addActivity } = useAdmin();

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
  }
