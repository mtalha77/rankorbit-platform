import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Ico } from "./landingShared";

export function DashboardPreview({ isMobile, chartId = "dashChartFill" }) {
  return (
    <div style={{
      background: `linear-gradient(160deg,#171732 0%,#1E1B4B 100%)`,
      borderRadius: isMobile ? 20 : 28,
      padding: isMobile ? 10 : 14,
      boxShadow: "0 32px 80px -20px rgba(23,23,50,.45)",
      border: "1px solid rgba(255,255,255,.08)",
    }}>
      {/* Window chrome */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 6px 12px"}}>
        <div style={{display:"flex",gap:7}}>
          {[T.red,T.amber,T.green].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
        </div>
        <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,.55)",letterSpacing:".6px"}}>NAP ORBIT DASHBOARD</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:"rgba(15,164,122,.18)",border:"1px solid rgba(15,164,122,.35)",fontSize:10,fontWeight:800,color:T.green,letterSpacing:".3px"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`}}/>
          LIVE PREVIEW
        </div>
      </div>

      {/* App shell */}
      <div style={{display:"flex",background:"#F6F7FB",borderRadius:isMobile?14:18,overflow:"hidden",minHeight:isMobile?340:420}}>
        {/* Sidebar */}
        {!isMobile&&(
          <div style={{width:56,background:"#EEF0F6",borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:13,marginBottom:6}}>N</div>
            {[
              {active:true,d:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
              {active:false,d:<><path d="M4 6h16M4 12h16M4 18h10"/></>},
              {active:false,d:<><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></>},
              {active:false,d:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>},
            ].map((nav,i)=>(
              <div key={i} style={{width:36,height:36,borderRadius:10,background:nav.active?"#fff":"transparent",boxShadow:nav.active?SHADOW:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ico d={nav.d} c={nav.active?T.brand:T.faint} s={17}/>
              </div>
            ))}
          </div>
        )}

        {/* Main panel */}
        <div style={{flex:1,padding:isMobile?12:18,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,gap:10}}>
            <div>
              <div style={{fontFamily:FONT_D,fontSize:isMobile?16:18,fontWeight:800,color:T.ink,letterSpacing:"-.3px"}}>Visibility overview</div>
              <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>Everything important, updated in one place</div>
            </div>
            <div style={{width:32,height:32,borderRadius:"50%",background:T.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_D,fontWeight:800,fontSize:13,flexShrink:0}}>A</div>
          </div>

          {/* Metric cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?6:10,marginBottom:12}}>
            {[
              {l:"LIVE LISTINGS",v:"42",icon:<path d="M20 6 9 17l-5-5"/>,c:T.green,bg:T.greenSoft},
              {l:"VISIBILITY SCORE",v:"84/100",icon:<><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></>,c:T.blue,bg:T.blueSoft},
              {l:"NEEDS ATTENTION",v:"2",icon:<path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a1.8 1.8 0 0 0 1.6 2.7h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0z"/>,c:T.amber,bg:T.amberSoft},
            ].map(m=>(
              <div key={m.l} style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?"10px 8px":"12px 12px",boxShadow:SHADOW}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:isMobile?8.5:10,fontWeight:800,color:T.faint,letterSpacing:".3px"}}>{m.l}</div>
                  <div style={{width:22,height:22,borderRadius:7,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Ico d={m.icon} c={m.c} s={12}/>
                  </div>
                </div>
                <div style={{fontFamily:FONT_D,fontSize:isMobile?18:22,fontWeight:800,color:m.c,letterSpacing:"-.6px",lineHeight:1}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Chart + status column */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:10,marginBottom:10}}>
            <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?12:14,boxShadow:SHADOW}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12.5,fontWeight:800,color:T.ink}}>Visibility growth</div>
                <div style={{fontSize:10.5,fontWeight:700,color:T.faint}}>Last 6 months</div>
              </div>
              <svg viewBox="0 0 240 90" width="100%" height={isMobile?70:86} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.brand} stopOpacity="0.28"/>
                    <stop offset="100%" stopColor={T.brand} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M8 72 C40 68, 55 58, 80 52 S120 48, 140 36 S180 28, 200 18 S228 12, 232 10 L232 90 L8 90 Z" fill={`url(#${chartId})`}/>
                <path d="M8 72 C40 68, 55 58, 80 52 S120 48, 140 36 S180 28, 200 18 S228 12, 232 10" fill="none" stroke="#2A7A7A" strokeWidth="2.5" strokeLinecap="round"/>
                {[[8,72],[80,52],[140,36],[200,18],[232,10]].map(([x,y],i)=>(
                  <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="#2A7A7A" strokeWidth="2"/>
                ))}
              </svg>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:2,padding:"0 2px"}}>
                {["JAN","FEB","MAR","APR","MAY"].map(m=>(
                  <span key={m} style={{fontSize:9.5,fontWeight:700,color:T.faint}}>{m}</span>
                ))}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{background:`linear-gradient(145deg,#171732,#1E1B4B)`,borderRadius:14,padding:isMobile?12:14,flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.45)",letterSpacing:".4px",marginBottom:8}}>{"TODAY'S STATUS"}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(15,164,122,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ico d={<path d="M20 6 9 17l-5-5"/>} c={T.green} s={14}/>
                  </div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:800,color:"#fff"}}>All protected</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:1}}>Last checked 2 min ago</div>
                  </div>
                </div>
              </div>
              <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?12:14,boxShadow:SHADOW}}>
                <div style={{fontSize:10,fontWeight:800,color:T.faint,letterSpacing:".4px",marginBottom:6}}>QUICK ACTION</div>
                <div style={{fontSize:13.5,fontWeight:800,color:T.ink,marginBottom:10}}>Review 2 updates</div>
                <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"7px 12px",borderRadius:10,background:T.brandSoft,color:T.brand,fontSize:11.5,fontWeight:800}}>View activity</div>
              </div>
            </div>
          </div>

          {/* Listing health */}
          <div style={{background:"#fff",border:`1px solid ${T.line}`,borderRadius:14,padding:isMobile?"12px 12px":"12px 14px",boxShadow:SHADOW}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:11.5,fontWeight:800,color:T.faint,letterSpacing:".3px"}}>LISTING HEALTH</div>
              <div style={{fontSize:13,fontWeight:800,color:T.green}}>93%</div>
            </div>
            <div style={{height:9,background:T.surface2,borderRadius:6,overflow:"hidden"}}>
              <div style={{width:"93%",height:"100%",background:`linear-gradient(90deg,${T.brand},${T.green})`,borderRadius:6}}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
