import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../../lib/theme";
import { planLive, popularPlanId, orderPlansPopularCenter } from "../../lib/constants";
import { Reveal } from "../Reveal";

export function LandingPricing({ isMobile, isTab, w, user, cfg, lprice, goPlan, planBusy, planErr, billingFlag }) {
  return (
    <div id="pricing" style={{
      background:`linear-gradient(180deg,#F8F7FF 0%,#F4F8F6 45%,#EEF1FF 100%)`,
      padding:isMobile?"48px 16px":isTab?"64px 24px":"80px 24px",
      position:"relative",
      overflow:"hidden",
    }}>
      <div aria-hidden="true" style={{position:"absolute",top:-80,left:-60,width:280,height:280,borderRadius:"50%",background:"rgba(91,91,214,.08)",filter:"blur(40px)",pointerEvents:"none"}}/>
      <div aria-hidden="true" style={{position:"absolute",bottom:-60,right:-40,width:260,height:260,borderRadius:"50%",background:"rgba(15,164,122,.08)",filter:"blur(40px)",pointerEvents:"none"}}/>

      <div style={{maxWidth:1200,margin:"0 auto",width:"100%",boxSizing:"border-box",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:isMobile?28:40}}>
          <Reveal>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",border:`1px solid ${T.line}`,borderRadius:30,fontSize:11.5,fontWeight:800,color:T.brand,letterSpacing:".5px",marginBottom:16,boxShadow:SHADOW}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.brand}}/>
              SIMPLE PRICING
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h2 style={{fontFamily:FONT_D,fontSize:isMobile?28:isTab?36:44,fontWeight:800,letterSpacing:"-1.3px",margin:"0 0 12px",lineHeight:1.12,color:T.ink}}>
              One monthly price. <span style={{color:T.brand}}>No games.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{fontSize:isMobile?15:16.5,color:T.sub,maxWidth:480,margin:"0 auto 18px",lineHeight:1.6}}>
              Choose the level of visibility and support that fits your business.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:isMobile?"10px 16px":"12px 22px"}}>
              {["No setup fees","Cancel anytime","Secure billing"].map(t=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:7,fontSize:13.5,fontWeight:700,color:T.sub}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </Reveal>
          {billingFlag==="cancel"&&<div style={{marginTop:14,fontSize:13,color:T.amber,fontWeight:700}}>Checkout canceled — pick a plan whenever you're ready.</div>}
          {planErr&&<div style={{marginTop:14,fontSize:13,color:T.red,fontWeight:700}}>{planErr}</div>}
          {user&&!user.plan&&<div style={{marginTop:14,fontSize:13,color:T.brand,fontWeight:700}}>Open your dashboard to choose a plan and unlock listings, messages, and more.</div>}
        </div>

        {(()=>{
          const popularId=popularPlanId(cfg);
          const cards=orderPlansPopularCenter(
            [
              {id:"essentials",n:"Essentials",tag:"GETTING STARTED",q:"10 LISTINGS / MONTH",f:["10 directory submissions monthly","NAP consistency management","Unauthorized edit protection","AI search visibility","Live dashboard access"]},
              {id:"growth",n:"Growth",tag:"GROWING BUSINESS",q:"20 LISTINGS / MONTH",f:["20 directory submissions monthly","Everything in Essentials","Expanded directory coverage","AI search visibility","Priority support"]},
              {id:"gmb",n:"GMB Pro",tag:"MANAGED PRESENCE",q:"15 LISTINGS + GOOGLE PROFILE",f:["15 directory submissions every month","Google Business Profile management","AI search visibility","Monthly posts and Q&A","Dedicated manager"]},
            ].map(pl=>({...pl,pop:pl.id===popularId})).filter(pl=>planLive(pl.id,cfg)),
            popularId,
          );

          // Stack on phone + iPad portrait; 3-up from ~900px (iPad landscape / desktop)
          // Middle “Most Popular” column gets a bit more width when 3 cards
          const hasFeatured=cards.some(c=>c.pop)&&!(user?.plan&&cards.find(c=>c.pop)?.id===user.plan);
          const gridCols=w<900
            ?"1fr"
            :cards.length===3&&hasFeatured
              ?"minmax(0,1fr) minmax(0,1.14fr) minmax(0,1fr)"
              :`repeat(${Math.max(cards.length,1)},minmax(0,1fr))`;

          return(<>
            <div style={{
              display:"grid",
              gridTemplateColumns:gridCols,
              gap:isMobile?18:isTab?20:22,
              alignItems:w<900?"stretch":"center",
              maxWidth:cards.length===1?400:cards.length===2?760:1140,
              margin:"0 auto",
            }}>
              {cards.map((pl,i)=>{
                const current=!!user?.plan&&user.plan===pl.id;
                const featured=pl.pop&&!current;
                const dark=featured;
                const checkC=dark?T.green:(pl.id==="gmb"?T.brand:T.green);
                const tagBg=dark?"rgba(255,255,255,.12)":(pl.id==="gmb"?T.violetSoft:T.surface2);
                const tagC=dark?"rgba(255,255,255,.85)":(pl.id==="gmb"?T.violet:T.sub);
                const quotaBg=dark?"rgba(15,164,122,.2)":(pl.id==="gmb"?T.violetSoft:T.surface2);
                const quotaC=dark?T.green:(pl.id==="gmb"?T.violet:T.sub);

                return(
                  <Reveal key={pl.id} delay={i*90}>
                    <div style={{
                      position:"relative",
                      height:dark&&w>=900?"auto":"100%",
                      minHeight:dark?(isMobile?0:w>=900?560:520):undefined,
                      display:"flex",
                      flexDirection:"column",
                      background:dark
                        ?`linear-gradient(165deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`
                        :"#fff",
                      borderRadius:isMobile?22:28,
                      padding:dark
                        ?(isMobile?"32px 24px 26px":"40px 30px 30px")
                        :(isMobile?"28px 22px 22px":"32px 26px 24px"),
                      border:dark?"1px solid rgba(255,255,255,.1)":`1px solid ${T.line}`,
                      boxShadow:dark?SHADOW_LG:SHADOW,
                      marginTop:(current||pl.pop)?14:0,
                      boxSizing:"border-box",
                      zIndex:dark?2:1,
                    }}>
                      {current&&(
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:T.violetSoft,border:`1px solid rgba(138,79,216,.25)`,fontSize:10.5,fontWeight:800,color:T.violet,letterSpacing:".4px",whiteSpace:"nowrap",zIndex:2}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:T.violet}}/>
                          YOUR CURRENT PLAN
                        </div>
                      )}
                      {!current&&pl.pop&&(
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,background:T.brand,color:"#fff",fontSize:10.5,fontWeight:800,letterSpacing:".4px",whiteSpace:"nowrap",zIndex:2,boxShadow:"0 8px 20px rgba(91,91,214,.35)"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>
                          MOST POPULAR
                        </div>
                      )}

                      <div style={{display:"inline-flex",alignSelf:"flex-start",padding:"5px 11px",borderRadius:20,background:tagBg,color:tagC,fontSize:10.5,fontWeight:800,letterSpacing:".45px",marginBottom:14}}>
                        {pl.tag}
                      </div>
                      <h3 style={{fontFamily:FONT_D,fontSize:isMobile?24:26,fontWeight:800,margin:"0 0 8px",letterSpacing:"-.5px",color:dark?"#fff":T.ink}}>{pl.n}</h3>
                      <div style={{marginBottom:14}}>
                        <span style={{fontFamily:FONT_D,fontSize:isMobile?42:48,fontWeight:800,letterSpacing:"-2px",color:dark?"#fff":T.ink}}>${lprice(pl.id)}</span>
                        <span style={{fontSize:15,fontWeight:600,color:dark?"rgba(255,255,255,.55)":T.faint}}> /month</span>
                      </div>
                      <div style={{display:"inline-flex",alignSelf:"flex-start",padding:"6px 12px",borderRadius:20,background:quotaBg,color:quotaC,fontSize:11,fontWeight:800,letterSpacing:".35px",marginBottom:20}}>
                        {pl.q}
                      </div>

                      <div style={{flex:1,marginBottom:20}}>
                        {pl.f.map(f=>(
                          <div key={f} style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-start"}}>
                            <span style={{width:18,height:18,borderRadius:"50%",background:dark?"rgba(15,164,122,.2)":(pl.id==="gmb"?T.brandSoft:T.greenSoft),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={checkC} strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </span>
                            <span style={{fontSize:14,lineHeight:1.45,color:dark?"rgba(255,255,255,.82)":T.sub,fontWeight:500}}>{f}</span>
                          </div>
                        ))}
                      </div>

                      {current?(
                        <button
                          type="button"
                          disabled
                          style={{
                            width:"100%",padding:"14px 18px",borderRadius:14,border:"none",
                            background:T.surface2,color:T.brand,fontSize:15,fontWeight:800,
                            fontFamily:FONT_B,cursor:"default",
                            display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
                          }}
                        >
                          <span style={{width:7,height:7,borderRadius:"50%",background:T.brand}}/>
                          Current plan
                        </button>
                      ):(
                        <button
                          type="button"
                          onClick={()=>goPlan(pl.id)}
                          disabled={!!planBusy}
                          style={{
                            width:"100%",padding:"14px 18px",borderRadius:14,
                            border:dark?"none":`1.5px solid ${T.brand}`,
                            background:dark?"#fff":"transparent",
                            color:dark?T.ink:T.brand,
                            fontSize:15,fontWeight:800,fontFamily:FONT_B,
                            cursor:planBusy?"wait":"pointer",
                            opacity:planBusy&&planBusy!==pl.id?0.6:1,
                          }}
                        >
                          {planBusy===pl.id?"Redirecting…":`Choose ${pl.n}`}
                        </button>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={280}>
              <div style={{textAlign:"center",marginTop:isMobile?22:28,fontSize:12.5,color:T.faint,fontWeight:600}}>
                All prices shown in USD. Cancel before renewal to avoid the next charge.
              </div>
            </Reveal>
          </>);
        })()}
      </div>
    </div>
  );
}
