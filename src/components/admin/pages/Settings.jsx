import { useState, useEffect } from "react";
import { T, FONT_D, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { PLANS } from "../../../lib/constants";
import { Badge, Card, Btn, Input, PageHead, SectionTitle } from "../../atoms";
import { useAdmin } from "../AdminContext";

export function Settings() {
  const { isMobile, settings, R, toast, reload, audit } = useAdmin();

    const s={pubKey:"",...(settings?.stripe||{})};
    const[f,setF]=useState({pubKey:s.pubKey||""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    const[stripeLive,setStripeLive]=useState(false);
    useEffect(()=>{(async()=>{const st=await api.billingStatus();setStripeLive(!!st.configured);})();},[]);
    // Control-panel config: notification emails, report recipients, prices, toggles. UI-editable, DB-stored.
    const cfg0={
      notifyEmail:"sales@naporbit.com",
      reportEmails:"sales@naporbit.com, onboarding@naporbit.com",
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
      <PageHead isMobile={isMobile} title="Control Panel" sub="Payments and platform configuration"/>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Change these anytime, no developer needed. Saved to your database and applied across the platform.">Control Panel</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:10}}>NOTIFICATION EMAILS</div>
            <Input label="Event notifications to" value={c.notifyEmail} onChange={v=>setCfg("notifyEmail",v)} placeholder="sales@naporbit.com"/>
            <Input label="Monthly report recipients (comma-separated)" value={c.reportEmails} onChange={v=>setCfg("reportEmails",v)} placeholder="sales@naporbit.com, onboarding@naporbit.com"/>
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
        <div style={{padding:"12px 15px",background:T.amberSoft,borderRadius:12,marginBottom:16,fontSize:12,color:T.amber,fontWeight:600,lineHeight:1.5}}>Clients always get in-app notifications. Staff + client emails send via Resend after you verify <code>naporbit.com</code> and set <code>RESEND_API_KEY</code> + <code>NOTIFY_FROM_EMAIL=NAP Orbit &lt;noreply@naporbit.com&gt;</code> in Vercel. Use sales@ / onboarding@naporbit.com for staff recipients below.</div>
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
        <SectionTitle sub="Staff Connect Google on a client → OAuth → pick location → daily cron syncs Performance metrics + NAP into the GMB dashboard. Secrets live only in Vercel.">Google Business Profile</SectionTitle>
        <div style={{padding:"14px 16px",background:T.greenSoft,borderRadius:12,marginBottom:12,fontSize:12.5,color:T.green,lineHeight:1.7}}>
          <div style={{fontWeight:800,marginBottom:6}}>Setup (Google Cloud + Vercel):</div>
          <div><b>1.</b> Google Cloud → enable <b>Business Profile Performance API</b> and <b>My Business Business Information API</b> (+ Account Management).</div>
          <div><b>2.</b> OAuth consent screen (External / Testing) → scope <code>business.manage</code>.</div>
          <div><b>3.</b> Create OAuth Web client. Redirect URI:</div>
          <div style={{margin:"6px 0",padding:"8px 11px",background:"#fff",borderRadius:8,fontFamily:"monospace",fontSize:11.5,color:T.ink,wordBreak:"break-all",userSelect:"all"}}>{(typeof window!=="undefined"?window.location.origin:"https://your-app.vercel.app")+"/api/google-gbp-callback"}</div>
          <div><b>4.</b> Vercel env: <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, <code>GOOGLE_REDIRECT_URI</code> (same URL as above), <code>CRON_SECRET</code>.</div>
          <div><b>5.</b> Run <code>supabase/google-gbp.sql</code> in the Supabase SQL Editor (one time).</div>
          <div><b>6.</b> Cron hits <code>/api/cron/google-gbp-sync</code> daily at 06:00 UTC (see vercel.json).</div>
        </div>
        <div style={{fontSize:12,color:T.sub,lineHeight:1.55}}>After setup, open a client → Integrations → <b>Connect Google</b>. Manual Update GMB stays available when not connected.</div>
      </Card>

      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Checkout, cancel, upgrades, and invoices run through the Rank Orbit Stripe account (rankorbit.com entity). App host is nap.rankorbit.com. Secrets live only in Vercel env.">Stripe Billing</SectionTitle>
        <div style={{padding:"14px 16px",background:T.blueSoft,borderRadius:12,marginBottom:18,fontSize:12.5,color:T.blue,lineHeight:1.7}}>
          <div style={{fontWeight:800,marginBottom:6}}>Setup (Vercel env + Stripe Dashboard):</div>
          <div><b>1.</b> Stripe (Rank Orbit / rankorbit.com) → Products → create 3 recurring monthly Prices ($49 / $89 / $249).</div>
          <div><b>2.</b> Vercel → Environment Variables: <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, <code>STRIPE_PRICE_ESSENTIALS</code>, <code>STRIPE_PRICE_GROWTH</code>, <code>STRIPE_PRICE_GMB</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>APP_URL=https://nap.rankorbit.com</code>.</div>
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
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontSize:13,color:T.sub}}>GBP OAuth + nightly sync</span>
          <Badge type="connected" label="Step 1 live (env required)"/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
          <span style={{fontSize:13,color:T.sub}}>GA4 auto-sync</span>
          <Badge type="pending" label="Later phase"/>
        </div>
      </Card>
    </div>);
  }
