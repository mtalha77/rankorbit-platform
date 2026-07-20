import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T, FONT_D, SHADOW, SHADOW_LG } from "../../../lib/theme";
import { gmbMomTrend } from "../../../lib/helpers";
import { Badge, Card, Btn, StatCard, ChartTip, SectionTitle, Empty, PageHead } from "../../atoms";
import { Orbit } from "../../Orbit";
import { ReportCard } from "../ReportCard";
import { useClient } from "../ClientContext";

export function Gmb() {
  const { user, isMobile, setPage, myGmb, reload, toast } = useClient();

    if(user.plan!=="gmb")return(<div>
      <PageHead isMobile={isMobile} title="GMB Management"/>
      <Card style={{textAlign:"center",padding:isMobile?32:56,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Orbit size={100} speed={10}/></div>
        <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,marginBottom:8}}>Put your Google profile on autopilot</div>
        <div style={{fontSize:13.5,color:T.sub,maxWidth:440,margin:"0 auto 24px",lineHeight:1.6}}>We publish posts, answer Q&A, keep your profile complete, and get you found in AI searches like ChatGPT, Gemini and Google AI Overviews, plus show you exactly how many calls and visits Google sends you every month.</div>
        <Btn size="lg" onClick={()=>setPage("billing")}>Upgrade to GMB Pro, $249/mo</Btn>
        <div style={{fontSize:11.5,color:T.faint,marginTop:12}}>Includes everything in Growth · Cancel anytime</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    const trendRows=Array.isArray(d.trend)?d.trend:[];
    const viewsMom=gmbMomTrend(trendRows,"v");
    const callsMom=gmbMomTrend(trendRows,"c");
    const dirsMom=gmbMomTrend(trendRows,"d");
    const fromGoogle=d.source==="google"||d.source==="connected";
    const lastSync=d.syncedAt?(()=>{try{return new Date(d.syncedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}catch{return d.syncedAt;}})():null;
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={fromGoogle&&lastSync?`Last synced ${lastSync}`:"Your Google Business Profile, actively managed"} right={<Badge type={fromGoogle?"connected":"manual"} label={fromGoogle?"Synced from Google":undefined}/>}/>
      {fromGoogle&&(
        <div style={{padding:"10px 14px",background:T.greenSoft,borderRadius:12,marginBottom:14,fontSize:12.5,color:T.green,lineHeight:1.5}}>
          Metrics pull automatically from your Google Business Profile{lastSync?` · Last sync ${lastSync}`:""}.
        </div>
      )}
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${T.violetSoft},#fff)`,display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:44,height:44,borderRadius:13,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:SHADOW}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        </div>
        <div><div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>Now visible in AI searches</div><div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginTop:2}}>Your managed profile and consistent data help you appear in ChatGPT, Gemini and Google AI Overviews, not just traditional search.</div></div>
      </Card>
      <ReportCard user={user} reload={reload} toast={toast}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Profile Views" value={d.views} icon="👁️" color={T.green} soft={T.greenSoft} trend={viewsMom} delay={0}/>
        <StatCard label="Calls From Google" value={d.calls} icon="📞" trend={callsMom} delay={80}/>
        <StatCard label="Direction Requests" value={d.directions} icon="🗺️" color={T.blue} soft={T.blueSoft} trend={dirsMom} delay={160}/>
      </div>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Real customer engagement from your Google profile">Engagement Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.trend}>
            <defs>
              <linearGradient id="gv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.22}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.brand} stopOpacity={.2}/><stop offset="100%" stopColor={T.brand} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={34}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="v" name="Views" stroke={T.green} strokeWidth={2.5} fill="url(#gv2)" dot={false} animationDuration={1100}/>
            <Area type="monotone" dataKey="c" name="Calls" stroke={T.brand} strokeWidth={2.5} fill="url(#gc2)" dot={false} animationDuration={1300}/>
            <Area type="monotone" dataKey="d" name="Directions" stroke={T.blue} strokeWidth={2} fill="none" dot={false} animationDuration={1500}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{marginBottom:16}}>
        <SectionTitle sub="Google Business Profile posts we publish to keep your listing active and engaging" right={<span style={{fontSize:11.5,fontWeight:800,color:T.violet,background:T.violetSoft,padding:"4px 11px",borderRadius:20}}>{(d.posts||[]).length} posts</span>}>GMB Posts</SectionTitle>
        {(!d.posts||d.posts.length===0)?<Empty icon="📝" title="No posts yet" sub="Your first GMB post is being drafted by your account manager."/>:
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            {d.posts.map((p,i)=>{
              const typeInfo={offer:{c:T.amber,cs:T.amberSoft,ic:"🎁",label:"Offer"},event:{c:T.violet,cs:T.violetSoft,ic:"📅",label:"Event"},update:{c:T.brand,cs:T.brandSoft,ic:"📢",label:"Update"},product:{c:T.green,cs:T.greenSoft,ic:"🛍️",label:"Product"}}[p.type||"update"];
              const scheduled=p.status==="scheduled";
              return(<div key={i} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:16,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:800,color:typeInfo.c,background:typeInfo.cs,padding:"3px 9px",borderRadius:20}}>{typeInfo.ic} {typeInfo.label}</span>
                  <span style={{fontSize:10.5,fontWeight:800,color:scheduled?T.amber:T.green,background:scheduled?T.amberSoft:T.greenSoft,padding:"3px 9px",borderRadius:20}}>{scheduled?"◷ Scheduled":"● Live"}</span>
                </div>
                <div style={{fontSize:14,fontWeight:800,marginBottom:5}}>{p.title}</div>
                {p.content&&<div style={{fontSize:12.5,color:T.sub,lineHeight:1.5,marginBottom:8}}>{p.content}</div>}
                <div style={{fontSize:11,color:T.faint}}>{scheduled?"Scheduled for":"Published"} {p.date}</div>
              </div>);
            })}
          </div>}
      </Card>
      <Card><SectionTitle>Profile Completeness</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"2px 24px"}}>
          {Object.entries(d.completeness||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:13,color:T.sub,textTransform:"capitalize"}}>{k}</span>
            <span style={{fontSize:12.5,fontWeight:800,color:v?T.green:T.amber}}>{v?"✓ Done":"○ In progress"}</span>
          </div>))}
        </div>
      </Card>
    </div>);
  
}
