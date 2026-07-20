import { T, FONT_D } from "../../../lib/theme";
import { Card, Btn, Empty, PageHead } from "../../atoms";
import { UserAvatar } from "../../AccountSettings";
import { useAdmin } from "../AdminContext";

export function GmbAdmin() {
  const { isMobile, clients, gmb, setSelClient, setPage, setModal } = useAdmin();

    const gmbClients=clients.filter(c=>c.plan==="gmb");
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={`${gmbClients.length} GMB Pro clients`}/>
      {gmbClients.length===0?<Card><Empty icon="📍" title="No GMB Pro clients yet" sub="Clients on the GMB Pro plan appear here."/></Card>:
        gmbClients.map(c=>{const d=gmb[c.id];
          return(<Card key={c.id} hover style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:13,alignItems:"center"}}>
                <UserAvatar user={c} size={42} style={{borderRadius:13}}/>
                <div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>{c.businessName}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{d?`${d.views?.toLocaleString()||0} views · ${d.calls||0} calls · ${d.directions||0} directions · ${d.posts?.length||0} posts`:"No GMB data yet"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" size="sm" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>View</Btn>
                {d?.source==="google"?(
                  <Btn variant="soft" size="sm" onClick={()=>setModal({type:"integrations",client:c})}>Google sync</Btn>
                ):(
                  <Btn variant="green" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>Update GMB</Btn>
                )}
              </div>
            </div>
          </Card>);})}
    </div>);
  }
