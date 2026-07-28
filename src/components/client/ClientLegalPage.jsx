import { useState } from "react";
import { T, FONT_D, FONT_B } from "../../lib/theme";
import { Card } from "../atoms";
import {
  TermsOfServiceBody,
  PrivacyPolicyBody,
  LegalHeadingCompact,
  LegalParagraphCompact,
  TOS_VERSION,
  PRIVACY_VERSION,
} from "../LegalContent";

export function ClientLegalPage({isMobile}){
  const[tab,setTab]=useState("terms");
  const eff=tab==="terms"
    ? `July 28, 2026 · version ${TOS_VERSION}`
    : `July 28, 2026 · version ${PRIVACY_VERSION}`;
  return(<div>
    <div style={{marginBottom:6}}>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?20:22,fontWeight:800,letterSpacing:"-.5px",lineHeight:1.1}}>Terms & Privacy</div>
      <div style={{fontSize:12,color:T.sub,marginTop:2}}>Last updated {eff}</div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:6}}>
      {[["terms","Terms of Service"],["privacy","Privacy Policy"]].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:"5px 12px",borderRadius:18,border:`1.5px solid ${tab===id?T.brand:T.line}`,background:tab===id?T.brandSoft:T.surface,color:tab===id?T.brand:T.sub,fontSize:12,fontWeight:tab===id?800:600,cursor:"pointer",fontFamily:FONT_B}}>{l}</button>))}
    </div>
    <Card style={{maxWidth:820,padding:isMobile?12:14}}>
      {tab==="terms"
        ? <TermsOfServiceBody H={LegalHeadingCompact} P={LegalParagraphCompact}/>
        : <PrivacyPolicyBody H={LegalHeadingCompact} P={LegalParagraphCompact}/>}
    </Card>
  </div>);
}
