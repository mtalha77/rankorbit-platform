import { T, FONT_D } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { Card, Btn, Empty, PageHead, Badge } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function Trash() {
  const { isMobile, data, R, audit, toast, setConfirm } = useAdmin();

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
  }
