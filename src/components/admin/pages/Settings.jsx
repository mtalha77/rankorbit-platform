import { useState, useEffect } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { PLANS } from "../../../lib/constants";
import { Card, Btn, Input, PageHead, SectionTitle } from "../../atoms";
import { useAdmin } from "../AdminContext";

function buildConfig(settings) {
  return {
    notifyEmail: "sales@naporbit.com",
    reportEmails: "sales@naporbit.com, onboarding@naporbit.com",
    priceEssentials: PLANS.essentials.price,
    priceGrowth: PLANS.growth.price,
    priceGmb: PLANS.gmb.price,
    notifySignup: true,
    notifyCancel: true,
    notifyPlanChange: true,
    notifyAgentEdit: true,
    monthlyReport: true,
    allowSignups: true,
    livePlanEssentials: true,
    livePlanGrowth: true,
    livePlanGmb: true,
    popularPlan: "growth",
    ...(settings?.config || {}),
  };
}

export function Settings() {
  const { isMobile, settings, R, audit } = useAdmin();
  // Control-panel config: notification emails, report recipients, prices, toggles. UI-editable, DB-stored.
  const [c, setC] = useState(() => buildConfig(settings));
  // Keep form in sync after reload / when DB values change.
  useEffect(() => {
    setC(buildConfig(settings));
  }, [settings]);
  const setCfg = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const saveConfig = async (detail) => {
    const config = {
      ...c,
      priceEssentials: Number(c.priceEssentials),
      priceGrowth: Number(c.priceGrowth),
      priceGmb: Number(c.priceGmb),
    };
    const saved = await api.saveSettings({
      ...settings,
      stripe: settings?.stripe || {},
      config,
    });
    if (!saved) throw new Error("Control panel did not save to the database");
    await audit("settings.update", { targetType: "settings", detail });
  };
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
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>MOST POPULAR PLAN</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:10,lineHeight:1.5}}>Choose which plan shows the “Most Popular” badge on the website and client billing page.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[
              {id:"essentials",label:"Essentials",live:c.livePlanEssentials!==false},
              {id:"growth",label:"Growth",live:c.livePlanGrowth!==false},
              {id:"gmb",label:"GMB Pro",live:c.livePlanGmb!==false},
            ].map(p=>(
              <button
                key={p.id}
                type="button"
                disabled={!p.live}
                onClick={()=>setCfg("popularPlan",p.id)}
                style={{
                  padding:"9px 16px",
                  borderRadius:12,
                  border:`1.5px solid ${(c.popularPlan||"growth")===p.id?T.brand:T.line}`,
                  background:(c.popularPlan||"growth")===p.id?T.brandSoft:T.surface,
                  color:(c.popularPlan||"growth")===p.id?T.brand:p.live?T.ink:T.faint,
                  fontFamily:FONT_B,
                  fontWeight:800,
                  fontSize:12.5,
                  cursor:p.live?"pointer":"not-allowed",
                  opacity:p.live?1:.45,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>NOTIFICATIONS & TOGGLES</div>
          <Toggle label="Email on new signup" k="notifySignup"/>
          <Toggle label="Email on cancellation" k="notifyCancel"/>
          <Toggle label="Email on plan change" k="notifyPlanChange"/>
          <Toggle label="Alert managers when a BDM edits/deletes a listing" k="notifyAgentEdit"/>
          <Toggle label="Send monthly finance report" k="monthlyReport" sub="Signups, revenue, cancellations to report recipients"/>
          <Toggle label="Allow public client signups" k="allowSignups" sub="Turn off to hide signup CTAs. Never use Supabase Dashboard → Invite — Auth invite mail is blocked by the Send Email hook when enabled. Clients must sign up themselves; staff invites go from Team → Invite only (Resend)."/>
        </div>
        <Btn style={{marginTop:16}} onClick={()=>R(()=>saveConfig("control panel"),"Control panel saved")}>Save Control Panel</Btn>
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
          {k:"routeAgentEdit",label:"BDM edit alerts",desc:"When a BDM edits or deletes a listing"},
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
        <Btn style={{marginTop:16}} onClick={()=>R(()=>saveConfig("notification routing"),"Notification settings saved")}>Save Notification Settings</Btn>
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
    </div>);
  }
