import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { downloadBlob, openExternalFile } from "../../../lib/export";
import { PLANS } from "../../../lib/constants";
import { Badge, Card, Btn, PageHead, SectionTitle } from "../../atoms";
import { ProfileGate } from "../ProfileGate";
import { useClient } from "../ClientContext";

export function Billing() {
  const { user, isMobile, stripeConfigured, toast, R, reload, setConfirm, PLANSV, plan, invoices, my, myAct } = useClient();

    // Paid plans only — Stripe Checkout / change-subscription. No free activate path.
    const stripeReady=stripeConfigured===true;
    const billingBlocked=stripeConfigured===false;
    const goStripe=async(planId)=>{
      try{sessionStorage.setItem("ro_pending_plan",planId);}catch{}
      if(billingBlocked){
        toast("Billing is not connected yet. Checkout opens once Stripe is configured.","info");
        return;
      }
      if(stripeConfigured!==true){
        toast("Checking billing setup…","info");
        return;
      }
      // Existing Stripe subscription → change plan in place; otherwise Checkout Session.
      if(user.stripeSubscriptionId){
        const r=await api.changeSubscription(planId);
        if(r.error){toast(r.error,"info");return;}
        try{sessionStorage.removeItem("ro_pending_plan");}catch{}
        await R(async()=>{},`Switched to ${PLANS[planId].name}`);
        return;
      }
      const r=await api.createCheckout(planId);
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    const doCancel=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:true,canceledAt:new Date().toISOString()});
        },"Subscription set to cancel at period end");
        if(!ok)throw new Error("Cancel failed");
        return;
      }
      const r=await api.cancelSubscription({resume:false});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription set to cancel at period end");
      await reload();
    };
    const doResume=async()=>{
      if(api.mode!=="supabase"){
        const ok=await R(async()=>{
          await api.patchProfile(user.id,{cancelAtPeriodEnd:false,canceledAt:null});
        },"Subscription resumed, you're all set");
        if(!ok)throw new Error("Resume failed");
        return;
      }
      const r=await api.cancelSubscription({resume:true});
      if(r.error){toast(r.error,"info");throw new Error(r.error);}
      toast("Subscription resumed, you're all set");
      await reload();
    };
    const openPortal=async()=>{
      if(!stripeReady){toast("Card management opens in Stripe once billing is connected","info");return;}
      const r=await api.createPortalSession();
      if(r.error){toast(r.error,"info");return;}
      if(r.url)window.location.href=r.url;
    };
    // Only Stripe-synced currentPeriodEnd — never invent +1 month.
    const periodEndDate=user.currentPeriodEnd?new Date(user.currentPeriodEnd):null;
    const periodSynced=!!(periodEndDate&&!Number.isNaN(periodEndDate.getTime()));
    const periodLabel=periodSynced
      ?periodEndDate.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      :"the end of your billing period";
    const nextChargeLabel=periodSynced
      ?periodEndDate.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
      :"Renewal date syncing from Stripe…";
    const daysLeft=(()=>{
      if(!periodSynced)return null;
      const start=new Date();start.setHours(0,0,0,0);
      const end=new Date(periodEndDate);end.setHours(0,0,0,0);
      return Math.max(0,Math.round((end-start)/86400000));
    })();
    const daysLeftLabel=daysLeft==null?null:daysLeft===0?"Ends today":daysLeft===1?"1 day left":`${daysLeft} days left`;
    // Require core business details before a plan can be selected (captures data upfront, esp. Google signups).
    const profileComplete=!!(user.businessName&&user.phone&&user.address&&user.city&&user.state&&user.category);
    const invoiceRows=invoices.length?invoices:null;
    return(<div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get"/>
      {!profileComplete&&!user.plan&&<ProfileGate user={user} onSaved={reload} toast={toast} isMobile={isMobile}/>}
      {(profileComplete||user.plan)&&(<>
      {user.plan&&(<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:20}}>
        <Card className="fadeUp" style={{position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:plan.soft,opacity:.6}}/>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{plan.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color}}>${plan.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/month</span></div>
            <Badge type={user.subscriptionStatus==="past_due"?"pending":"active"}/>
          </div>
          <div style={{marginTop:16}}>
            {plan.features.map((f,i)=>(<div key={i} style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
              <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:800,flexShrink:0}}>✓</div>
              <span style={{fontSize:13,color:T.sub}}>{f}</span>
            </div>))}
          </div>
        </Card>
        <Card className="fadeUp" style={{animationDelay:"100ms",background:user.cancelAtPeriodEnd?`linear-gradient(135deg,${T.amberSoft},#fff)`:`linear-gradient(135deg,${T.brandSoft},#fff)`}}>
          {user.cancelAtPeriodEnd?(<>
            <div style={{fontSize:11,fontWeight:800,color:T.amber,letterSpacing:".8px",marginBottom:8}}>SUBSCRIPTION ENDING</div>
            <div style={{fontFamily:FONT_D,fontSize:19,fontWeight:800,color:T.amber}}>Cancels on renewal</div>
            <div style={{fontSize:13,color:T.sub,marginTop:6,lineHeight:1.5}}>You keep full access until <b>{periodLabel}</b>. You won't be charged again.</div>
            {daysLeftLabel&&(
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.amberSoft,borderRadius:10}}>
                <span style={{fontSize:12,fontWeight:800,color:T.amber}}>{daysLeftLabel}</span>
                <span style={{fontSize:11.5,color:T.sub}}>in this billing period · ends {periodLabel}</span>
              </div>
            )}
            <Btn variant="green" size="sm" style={{width:"100%",marginTop:12}} onClick={doResume}>Resume subscription</Btn>
          </>):(<>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>{nextChargeLabel}</div>
            {daysLeftLabel&&(
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.brandSoft,borderRadius:10}}>
                <span style={{fontSize:12,fontWeight:800,color:T.brand}}>{daysLeftLabel}</span>
                <span style={{fontSize:11.5,color:T.sub}}>in this billing period · renews {periodLabel}</span>
              </div>
            )}
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically. Cancel before your renewal date to avoid the next charge, you keep access until the period ends.</div>
            <button onClick={()=>setConfirm({title:"Cancel subscription?",msg:`Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`,danger:true,yes:"Cancel at period end",onYes:doCancel})} style={{marginTop:12,background:"none",border:"none",color:T.faint,fontSize:11.5,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:FONT_B,padding:0}}>Cancel subscription</button>
          </>)}
        </Card>
      </div>)}
      <SectionTitle sub="Pick a plan to start, or upgrade anytime, secure checkout via Stripe">{user.plan?"Change Plan":"Choose Your Plan"}</SectionTitle>
      {billingBlocked&&<div style={{padding:"10px 14px",background:T.amberSoft,borderRadius:11,marginBottom:14,fontSize:12,color:T.amber,fontWeight:600}}>Checkout is unavailable until Stripe is configured. All plans are paid — there is no free activation.</div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
        {Object.entries(PLANSV).map(([id,p],i)=>{
          const current=id===user.plan;
          return(<div key={id} className="fadeUp hoverCard" style={{animationDelay:`${i*90}ms`,background:T.surface,border:`2px solid ${current?p.color:T.line}`,borderRadius:18,padding:22,position:"relative",boxShadow:current?SHADOW_LG:SHADOW}}>
            {current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20,width:"auto",whiteSpace:"nowrap"}}>CURRENT PLAN</div>}
            {id==="growth"&&!current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20,width:"auto",whiteSpace:"nowrap"}}>MOST POPULAR</div>}
            <div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>{p.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,color:p.color,margin:"5px 0 2px"}}>${p.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/mo</span></div>
            <div style={{fontSize:12,color:T.sub,fontWeight:700,marginBottom:14}}>{p.quota}</div>
            <div style={{height:1,background:T.line,marginBottom:14}}/>
            {p.features.map((f,j)=><div key={j} style={{fontSize:12,color:T.sub,marginBottom:8,display:"flex",gap:7}}><span style={{color:T.green,fontWeight:800}}>✓</span>{f}</div>)}
            {current?<Btn variant="ghost" size="sm" style={{width:"100%",marginTop:10}} onClick={()=>toast("This is your active plan")}>Your current plan</Btn>:
              <Btn size="sm" style={{width:"100%",marginTop:10}} disabled={billingBlocked||stripeConfigured===null} onClick={()=>goStripe(id)}>
                {billingBlocked?"Checkout unavailable":`${user.plan?"Switch to ":"Subscribe to "}${p.name} →`}
              </Btn>}
          </div>);
        })}
      </div>
      {user.plan&&(<Card style={{marginTop:20}}>
        <SectionTitle right={<Btn variant="ghost" size="sm" onClick={openPortal}>💳 Manage billing</Btn>}>Invoice History</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
            <thead><tr>{["Date","Description","Card","Amount","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {invoiceRows?invoiceRows.map(inv=>{
                const dt=inv.createdAt?new Date(inv.createdAt):new Date();
                const amt=((inv.amountCents||0)/100).toFixed(2);
                const last4=user.cardLast4||"••••";
                const paid=inv.status==="paid";
                return(<tr key={inv.id} className="hoverRow">
                  <td style={{padding:"12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{plan.name} plan · monthly</td>
                  <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`,whiteSpace:"nowrap"}}>{user.cardBrand||"Card"} •••• {last4}</td>
                  <td style={{padding:"12px",fontSize:13,fontWeight:800,borderBottom:`1px solid ${T.line}`}}>${amt}</td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={paid?"paid":"pending"}/></td>
                  <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><button onClick={()=>{const u=inv.invoicePdf||inv.hostedInvoiceUrl;if(openExternalFile(u))return;toast("Open Manage billing to view invoices in Stripe","info");}} style={{background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>PDF ↓</button></td>
                </tr>);
              }):(
                <tr><td colSpan={6} style={{padding:"18px 12px",fontSize:13,color:T.sub}}>No invoices yet. They appear here after your first payment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.line}`,fontSize:11.5,color:T.faint,lineHeight:1.5}}>
          Your primary card shows above. Add or remove cards, and download official invoices, in <b>Manage billing</b> (secure Stripe portal). Card details are never stored on our servers.
        </div>
      </Card>)}
      <Card style={{marginTop:16}}>
        <SectionTitle sub="Download everything we hold about your account, profile, listings, and activity.">Your Data</SectionTitle>
        <Btn variant="ghost" size="sm" onClick={()=>{
          try{
            const mine={profile:user,listings:my,activity:myAct,invoices:invoices||[],exportedAt:new Date().toISOString()};
            downloadBlob(JSON.stringify(mine,null,2),`naporbit-my-data-${Date.now()}.json`,"application/json");
            toast("Your data downloaded");
          }catch(e){
            toast(e.message||"Download failed","info");
          }
        }}>⤓ Download my data (JSON)</Btn>
      </Card>
      </>)}
    </div>);
  
}
