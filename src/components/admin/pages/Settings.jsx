import { useState, useEffect } from "react";
import { T, FONT_B } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { PLANS, planListPrice, planPrice, formatMoney } from "../../../lib/constants";
import { Card, Btn, Input, PageHead, SectionTitle } from "../../atoms";
import { useAdmin } from "../AdminContext";

function buildConfig(settings) {
  return {
    notifyEmail: "sales@naporbit.com",
    reportEmails: "sales@naporbit.com, onboarding@naporbit.com",
    priceEssentials: PLANS.essentials.price,
    priceGrowth: PLANS.growth.price,
    priceGmb: PLANS.pro.price,
    priceTestPlan: PLANS["test-plan"].price,
    discountEssentials: 10,
    discountGrowth: 25,
    discountGmb: 25,
    discountTestPlan: 0,
    discountEssentialsOn: true,
    discountGrowthOn: true,
    discountGmbOn: true,
    discountTestPlanOn: false,
    notifySignup: true,
    notifyCancel: true,
    notifyPlanChange: true,
    notifyAgentEdit: true,
    monthlyReport: true,
    allowSignups: true,
    livePlanEssentials: true,
    livePlanGrowth: true,
    livePlanGmb: true,
    livePlanTestPlan: true,
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
      priceTestPlan: Number(c.priceTestPlan),
      discountEssentials: Number(c.discountEssentials),
      discountGrowth: Number(c.discountGrowth),
      discountGmb: Number(c.discountGmb),
      discountTestPlan: Number(c.discountTestPlan),
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
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Input label="Essentials Plan" type="number" value={c.priceEssentials} onChange={v=>setCfg("priceEssentials",v)}/>
              <Input label="Growth Plan" type="number" value={c.priceGrowth} onChange={v=>setCfg("priceGrowth",v)}/>
              <Input label="Pro Plan" type="number" value={c.priceGmb} onChange={v=>setCfg("priceGmb",v)}/>
              <Input label="Test Plan" type="number" value={c.priceTestPlan} onChange={v=>setCfg("priceTestPlan",v)}/>
            </div>
            <div style={{fontSize:11,color:T.faint,lineHeight:1.5,marginTop:2}}>Note: these update what clients see. Keep them in sync with your Stripe Price amounts.</div>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>PLAN DISCOUNTS (shown on landing & client billing)</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:10,lineHeight:1.5}}>Charged price stays the plan price above. The % is true “off” from the strikethrough price — e.g. $20 at 50% shows <b>$40</b> crossed out (50% of $40 = $20). Stripe still charges the real plan price.</div>
          {[
            {id:"essentials",label:"Essentials Plan",pctK:"discountEssentials",onK:"discountEssentialsOn"},
            {id:"growth",label:"Growth Plan",pctK:"discountGrowth",onK:"discountGrowthOn"},
            {id:"pro",label:"Pro Plan",pctK:"discountGmb",onK:"discountGmbOn"},
            {id:"test-plan",label:"Test Plan",pctK:"discountTestPlan",onK:"discountTestPlanOn"},
          ].map((row)=>(
            <div key={row.id} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 100px auto",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{row.label}</div>
                <div style={{fontSize:11,color:T.faint,marginTop:2}}>
                  {c[row.onK]!==false
                    ? `Was $${formatMoney(planListPrice(row.id,c)||0)} → Now $${planPrice(row.id,c)}`
                    : `Now $${planPrice(row.id,c)} (discount off)`}
                </div>
              </div>
              <Input label="% off" type="number" value={c[row.pctK]} onChange={v=>setCfg(row.pctK,v)}/>
              <button type="button" onClick={()=>setCfg(row.onK,c[row.onK]===false?true:false)} style={{padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:FONT_B,fontWeight:800,fontSize:11.5,background:c[row.onK]===false?T.surface2:T.greenSoft,color:c[row.onK]===false?T.faint:T.green,whiteSpace:"nowrap",marginTop:isMobile?0:18}}>{c[row.onK]===false?"Off":"On"}</button>
            </div>
          ))}
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:4}}>LIVE PLANS (shown on website, signup & billing)</div>
          <Toggle label="Essentials Plan is live" k="livePlanEssentials"/>
          <Toggle label="Growth Plan is live" k="livePlanGrowth"/>
          <Toggle label="Pro Plan is live" k="livePlanGmb" sub="Turn off to launch it later. Existing clients on a hidden plan keep it."/>
          <Toggle label="Test Plan is live" k="livePlanTestPlan" sub="$1 Stripe test plan. Turn off before public launch."/>
        </div>
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".6px",marginBottom:8}}>MOST POPULAR PLAN</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:10,lineHeight:1.5}}>Choose which plan shows the “Most Popular” badge on the website and client billing page.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[
              {id:"essentials",label:"Essentials Plan",live:c.livePlanEssentials!==false},
              {id:"growth",label:"Growth Plan",live:c.livePlanGrowth!==false},
              {id:"pro",label:"Pro Plan",live:c.livePlanGmb!==false},
              {id:"test-plan",label:"Test Plan",live:c.livePlanTestPlan!==false},
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

      {/* Notifications & Email Routing — hidden until routing is fully wired */}
      {/* Google Business Profile setup card — hidden for now */}
    </div>);
  }
