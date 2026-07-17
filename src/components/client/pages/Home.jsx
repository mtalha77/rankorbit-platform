import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T, FONT_D } from "../../../lib/theme";
import { actIcon, clientBy } from "../../../lib/helpers";
import { Card, Btn, StatCard, ChartTip, SectionTitle, Empty } from "../../atoms";
import { ListingsLiveIcon, NapScoreIcon, EditsBlockedIcon, DirectoriesIcon } from "../clientIcons";
import { useClient } from "../ClientContext";

export function Home() {
  const { user, isMobile, setPage, visScore, visLabel, visColor, homePeriodEnd, plan, live, pending, napScore, myAct, my, growthData, liveMomTrend } = useClient();
  return (<div>
    {!user.plan&&(<Card style={{marginBottom:18,background:`linear-gradient(135deg,${T.brandSoft},#fff)`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><div style={{fontFamily:FONT_D,fontSize:16,fontWeight:800}}>Welcome to NAP Orbit 🚀</div><div style={{fontSize:13,color:T.sub,marginTop:3}}>Choose a plan to start getting listed, or your account manager will set you up after your call.</div></div>
      <Btn onClick={()=>setPage("billing")}>Choose a plan</Btn>
    </Card>)}
    {/* Visibility Score + current plan / billing summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.3fr 1fr",gap:16,marginBottom:22}}>
      <Card style={{background:`linear-gradient(135deg,${visColor}18,#fff)`,display:"flex",alignItems:"center",gap:22,flexWrap:"wrap"}}>
        <div style={{position:"relative",width:118,height:118,flexShrink:0}}>
          <svg width="118" height="118" viewBox="0 0 118 118">
            <circle cx="59" cy="59" r="50" fill="none" stroke={T.line} strokeWidth="11"/>
            <circle cx="59" cy="59" r="50" fill="none" stroke={visColor} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*50}`} strokeDashoffset={`${2*Math.PI*50*(1-visScore/100)}`}
              transform="rotate(-90 59 59)" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.22,.8,.36,1)"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontFamily:FONT_D,fontSize:32,fontWeight:800,color:visColor,lineHeight:1}}>{visScore}</div>
            <div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>/ 100</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:5}}>YOUR VISIBILITY SCORE</div>
          <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:visColor,marginBottom:6}}>{visLabel}</div>
          <div style={{fontSize:12.5,color:T.sub,lineHeight:1.55}}>One number for your online health, it blends how many directories you're on, how consistent your info is, and how many listings are live. It climbs as we work.</div>
        </div>
      </Card>
      <Card style={{background:user.cancelAtPeriodEnd?`linear-gradient(135deg,${T.amberSoft},#fff)`:`linear-gradient(135deg,${plan.soft||T.brandSoft},#fff)`,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {user.plan?(<>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color,marginBottom:4}}>{plan.name}</div>
          <div style={{fontSize:14,color:T.sub,marginBottom:12}}>${plan.price}<span style={{color:T.faint}}>/month</span>
            {user.cancelAtPeriodEnd&&<span style={{marginLeft:8,fontSize:12,fontWeight:700,color:T.amber}}>Cancels on renewal</span>}
          </div>
          {homePeriodEnd.daysLeftLabel?(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:user.cancelAtPeriodEnd?T.amberSoft:T.brandSoft,borderRadius:10,alignSelf:"flex-start",marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:800,color:user.cancelAtPeriodEnd?T.amber:T.brand}}>{homePeriodEnd.daysLeftLabel}</span>
              <span style={{fontSize:11.5,color:T.sub}}>renews {homePeriodEnd.label}</span>
            </div>
          ):homePeriodEnd.pending?(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.surface2,borderRadius:10,alignSelf:"flex-start",marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:700,color:T.sub}}>Renewal date syncing from Stripe…</span>
            </div>
          ):null}
          <Btn variant="soft" size="sm" onClick={()=>setPage("billing")} style={{alignSelf:"flex-start"}}>Manage billing →</Btn>
        </>):(<>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>YOUR PLAN</div>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:6}}>No plan yet</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.5}}>Pick a plan to start getting listed and protected across directories.</div>
          <Btn size="sm" onClick={()=>setPage("billing")} style={{alignSelf:"flex-start"}}>Choose a plan →</Btn>
        </>)}
      </Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22}}>
      <StatCard label="Listings Live" value={live} sub={`${pending} pending approval`} icon={<ListingsLiveIcon/>} color={T.green} soft={T.greenSoft} trend={liveMomTrend} delay={0}/>
      <StatCard label="NAP Score" value={`${napScore}%`} sub="Info matches everywhere" icon={<NapScoreIcon/>} delay={80}/>
      <StatCard label="Edits Blocked" value={myAct.filter(a=>a.type==="edit_blocked").length} sub="Unauthorized changes reverted" icon={<EditsBlockedIcon/>} color={T.amber} soft={T.amberSoft} delay={160}/>
      <StatCard label="Directories" value={my.length} sub="Managed for you" icon={<DirectoriesIcon/>} color={T.blue} soft={T.blueSoft} delay={240}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <SectionTitle sub="Cumulative live listings by go-live date">Your Visibility Is Growing</SectionTitle>
        <div style={{width:"100%",height:200,minWidth:0}}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={growthData}>
            <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.28}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="live" name="Live listings" stroke={T.green} strokeWidth={2.5} fill="url(#lg)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <SectionTitle sub="of 60 target directories">Coverage Progress</SectionTitle>
        <div style={{display:"flex",justifyContent:"center",margin:"6px 0 14px"}}>
          <div style={{position:"relative",width:150,height:150,minWidth:150}}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart><Pie data={[{v:live},{v:pending},{v:Math.max(0,60-live-pending)}]} cx="50%" cy="50%" innerRadius={52} outerRadius={70} dataKey="v" strokeWidth={0} startAngle={90} endAngle={-270} isAnimationActive={false}>
                <Cell fill={T.green}/><Cell fill={T.amber}/><Cell fill={T.line}/>
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{Math.round(live/60*100)}%</div>
              <div style={{fontSize:10.5,color:T.faint}}>covered</div>
            </div>
          </div>
        </div>
        {[{l:"Live",c:T.green,v:live},{l:"Pending",c:T.amber,v:pending},{l:"Upcoming",c:T.faint,v:Math.max(0,60-live-pending)}].map(d=>(
          <div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:d.c}}/><span style={{fontSize:12.5,color:T.sub}}>{d.l}</span></div>
            <span style={{fontSize:13,fontWeight:800,color:d.c===T.faint?T.sub:d.c}}>{d.v}</span>
          </div>))}
      </Card>
    </div>
    <Card>
      <SectionTitle sub="Every action we take on your account, logged with dates">Recent Activity</SectionTitle>
      {myAct.length===0?<Empty icon="🛰️" title="Work starting" sub="Your first listings are being prepared, check back soon."/>:
        myAct.slice(0,5).map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<Math.min(myAct.length,5)-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{a.date}{a.by?` · ${clientBy(a.by)}`:""}</div></div>
        </div>))}
    </Card>
  </div>);
}
