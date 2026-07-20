import { useState, useEffect } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { Modal, Input, Btn, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function IntegrationsModal({ client,onClose,pickLocation }) {
  const { R, toast, reload, setConfirm } = useAdmin();

    const[gaId,setGaId]=useState(client.gaId||"");
    const[gbpId,setGbpId]=useState(client.gbpId||"");
    const[conn,setConn]=useState(null);
    const[configured,setConfigured]=useState(false);
    const[loading,setLoading]=useState(true);
    const[busy,setBusy]=useState("");
    const[locations,setLocations]=useState([]);
    const[picking,setPicking]=useState(!!pickLocation);
    const[err,setErr]=useState("");

    const refreshStatus=async()=>{
      const st=await api.googleGbpStatus(client.id);
      if(st.error){setErr(st.error);setConn(null);setConfigured(false);}
      else{setConfigured(!!st.configured);setConn(st.connection||null);setErr("");}
    };

    const runBusy=async(key,fn)=>{
      setBusy(key);setErr("");
      try{await fn();}
      catch(e){console.error(e);setErr(e.message||"Something went wrong");}
      finally{setBusy("");}
    };

    useEffect(()=>{
      let cancelled=false;
      (async()=>{
        setLoading(true);
        try{
          await refreshStatus();
          if(cancelled)return;
          if(pickLocation){
            setPicking(true);
            setBusy("locations");
            try{
              const loc=await api.googleGbpLocations(client.id);
              if(cancelled)return;
              if(loc.error)setErr(loc.error);
              else setLocations(loc.locations||[]);
            }catch(e){
              if(!cancelled)setErr(e.message||"Could not load locations");
            }finally{
              if(!cancelled)setBusy("");
            }
          }
        }catch(e){
          if(!cancelled)setErr(e.message||"Could not load connection");
        }finally{
          if(!cancelled)setLoading(false);
        }
      })();
      return()=>{cancelled=true;};
    },[client.id,pickLocation]);

    const fmtSync=(iso)=>{
      if(!iso)return"Never";
      try{return new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
      catch{return iso;}
    };

    return(<Modal open onClose={onClose} title={`Integrations · ${client.businessName||client.name}`} width={560}>
      <div style={{padding:"12px 14px",background:T.blueSoft,borderRadius:11,marginBottom:16,fontSize:12,color:T.blue,lineHeight:1.5}}>
        Connect Google Business Profile to auto-sync views, calls, directions, and NAP. GA4 OAuth is a later phase — Measurement ID stays manual for now.
      </div>
      {err&&<div style={{padding:"10px 12px",background:T.redSoft,borderRadius:10,marginBottom:12,fontSize:12,color:T.red,lineHeight:1.45}}>{err}</div>}

      <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".5px",marginBottom:8}}>GOOGLE BUSINESS PROFILE</div>
      {loading?<div style={{fontSize:12.5,color:T.sub,marginBottom:14}}>Loading connection…</div>:(
        <div style={{padding:"14px 15px",background:T.surface2,borderRadius:12,marginBottom:16,border:`1px solid ${T.line}`}}>
          {!configured&&<div style={{fontSize:12,color:T.amber,marginBottom:10,lineHeight:1.5}}>OAuth env not set on the server yet. Add <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, <code>GOOGLE_REDIRECT_URI</code>, and <code>CRON_SECRET</code> in Vercel (see Control Panel).</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:800}}>{conn?.locationTitle||conn?.locationName||"Not connected"}</div>
              <div style={{fontSize:11.5,color:T.sub,marginTop:3}}>
                Status: {conn?.status||"none"} · Last sync: {fmtSync(conn?.syncedAt)}
              </div>
              {conn?.lastError&&<div style={{fontSize:11,color:T.red,marginTop:4}}>{conn.lastError}</div>}
            </div>
            <Badge type={conn?.hasLocation?"connected":conn?"pending":"manual"} label={conn?.hasLocation?"Connected":conn?"Pick location":"Disconnected"}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {!conn&&configured&&(
              <Btn size="sm" disabled={!!busy} onClick={()=>runBusy("connect",async()=>{
                const r=await api.googleGbpStart(client.id);
                if(r.error){setErr(r.error);return;}
                if(r.url)window.location.href=r.url;
              })}>Connect Google</Btn>
            )}
            {conn&&(
              <Btn size="sm" variant="soft" disabled={!!busy} onClick={()=>runBusy("locations",async()=>{
                setPicking(true);
                const loc=await api.googleGbpLocations(client.id);
                if(loc.error){setErr(loc.error);return;}
                setLocations(loc.locations||[]);
              })}>{conn.hasLocation?"Change location":"Pick location"}</Btn>
            )}
            {conn?.hasLocation&&(
              <Btn size="sm" variant="green" disabled={!!busy} onClick={()=>runBusy("sync",async()=>{
                const r=await api.googleGbpSync(client.id);
                if(r.error){setErr(r.error);return;}
                toast("GMB synced from Google");
                await refreshStatus();
                await reload();
              })}>{busy==="sync"?"Syncing…":"Sync now"}</Btn>
            )}
            {conn&&(
              <Btn size="sm" variant="ghost" disabled={!!busy} onClick={()=>setConfirm({
                title:"Disconnect Google?",
                msg:"Tokens will be removed. Manual Update GMB will work again until you reconnect.",
                yes:"Disconnect",
                onYes:()=>R(async()=>{
                  const r=await api.googleGbpDisconnect(client.id);
                  if(r.error)throw new Error(r.error);
                  setConn(null);setPicking(false);setLocations([]);
                },"Google disconnected"),
              })}>Disconnect</Btn>
            )}
          </div>
          {picking&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.line}`}}>
              <div style={{fontSize:12.5,fontWeight:800,marginBottom:8}}>Select a location</div>
              {busy==="locations"&&<div style={{fontSize:12,color:T.sub}}>Loading locations…</div>}
              {!busy&&locations.length===0&&<div style={{fontSize:12,color:T.sub}}>No locations found for this Google account.</div>}
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
                {locations.map(loc=>(
                  <button key={loc.locationName} type="button" disabled={busy==="select"} onClick={()=>runBusy("select",async()=>{
                    const r=await api.googleGbpSelectLocation(client.id,{
                      locationName:loc.locationName,
                      accountName:loc.accountName,
                      locationTitle:loc.title,
                    });
                    if(r.error){setErr(r.error);return;}
                    if(r.warning)toast(r.warning,"info");
                    else toast("Location saved & synced");
                    setPicking(false);
                    await refreshStatus();
                    await reload();
                  })} style={{textAlign:"left",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${T.line}`,background:"#fff",cursor:"pointer",fontFamily:FONT_B}}>
                    <div style={{fontSize:13,fontWeight:800}}>{loc.title||loc.locationName}</div>
                    <div style={{fontSize:11.5,color:T.sub,marginTop:2}}>{loc.address||"–"}{loc.phone?` · ${loc.phone}`:""}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Input label="Google Analytics 4 Measurement ID" value={gaId} onChange={setGaId} placeholder="G-XXXXXXXXXX"/>
      <Input label="GBP ID (auto-filled when connected)" value={gbpId} onChange={setGbpId} placeholder="locations/…"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn onClick={()=>R(async()=>api.upsertProfile({...client,gaId,gbpId}),"Integration IDs saved").then(onClose)}>Save IDs</Btn>
      </div>
    </Modal>);
  }
