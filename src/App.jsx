import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

// ─── DESIGN TOKENS (light, warm SaaS) ────────────────────────────────────────
const T = {
  bg:"#F6F7FB", surface:"#FFFFFF", surface2:"#F0F1F8",
  ink:"#171732", sub:"#5F6480", faint:"#9CA0B8", line:"#E7E9F2",
  brand:"#5B5BD6", brandDark:"#4646C4", brandSoft:"#EEEEFC", brandGlow:"rgba(91,91,214,0.18)",
  green:"#0FA47A", greenSoft:"#E4F6EF",
  amber:"#C97F06", amberSoft:"#FCF2DF",
  red:"#DE4B63", redSoft:"#FCEAEE",
  blue:"#2E7CD6", blueSoft:"#E8F1FC",
  violet:"#8A4FD8", violetSoft:"#F2EAFC",
};
const FONT_D = "'Sora','Inter',sans-serif";
const FONT_B = "'Inter',system-ui,sans-serif";
const SHADOW = "0 1px 2px rgba(23,23,50,.04), 0 8px 24px rgba(23,23,50,.06)";
const SHADOW_LG = "0 4px 12px rgba(23,23,50,.06), 0 20px 48px rgba(23,23,50,.10)";

function GlobalStyle(){
  return(<style>{`
    body{font-family:${FONT_B};color:${T.ink};}
    ::selection{background:${T.brandSoft};}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
    @keyframes orbitSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes orbitSpinR{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
    @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(24px,-18px) scale(1.06)}66%{transform:translate(-16px,14px) scale(.97)}}
    @keyframes toastIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes growBar{from{width:0}}
    @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(15,164,122,.35)}50%{box-shadow:0 0 0 6px rgba(15,164,122,0)}}
    .fadeUp{animation:fadeUp .45s cubic-bezier(.22,.8,.36,1) both}
    .pop{animation:pop .35s cubic-bezier(.22,.8,.36,1) both}
    .hoverCard{transition:transform .22s cubic-bezier(.22,.8,.36,1),box-shadow .22s}
    .hoverCard:hover{transform:translateY(-3px);box-shadow:${SHADOW_LG}}
    .hoverRow{transition:background .15s}
    .hoverRow:hover{background:${T.surface2}}
    .navItem{transition:background .18s,color .18s}
    .navItem:hover{background:${T.surface2}}
    button{transition:transform .12s,opacity .15s,box-shadow .15s}
    button:active{transform:scale(.97)}
    input,select,textarea{transition:border-color .15s,box-shadow .15s}
    input:focus,select:focus,textarea:focus{border-color:${T.brand}!important;box-shadow:0 0 0 3px ${T.brandGlow}!important;outline:none}
    @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
  `}</style>);
}

// ─── ORBIT MOTION GRAPHIC (brand signature) ──────────────────────────────────
function Orbit({size=120,speed=14}){
  const s=size;
  return(<div style={{width:s,height:s,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.18,borderRadius:"50%",border:`1.5px dashed ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:FONT_D,fontWeight:800,fontSize:s*0.16,boxShadow:`0 6px 18px ${T.brandGlow}`}}>RO</div>
    <div style={{position:"absolute",inset:0,animation:`orbitSpin ${speed}s linear infinite`}}>
      <div style={{position:"absolute",top:-4,left:"50%",width:9,height:9,marginLeft:-4.5,borderRadius:"50%",background:T.green,boxShadow:"0 0 0 3px "+T.greenSoft}}/>
    </div>
    <div style={{position:"absolute",inset:s*0.18,animation:`orbitSpinR ${speed*0.7}s linear infinite`}}>
      <div style={{position:"absolute",bottom:-4,left:"50%",width:8,height:8,marginLeft:-4,borderRadius:"50%",background:T.brand,boxShadow:"0 0 0 3px "+T.brandSoft}}/>
    </div>
  </div>);
}
function MiniOrbit({size=30}){
  return(<div style={{width:size,height:size,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:size*0.22,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`}}/>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:0,animation:"orbitSpin 8s linear infinite"}}>
      <div style={{position:"absolute",top:-2.5,left:"50%",width:6,height:6,marginLeft:-3,borderRadius:"50%",background:T.green}}/>
    </div>
  </div>);
}

// ─── DATA LAYER ──────────────────────────────────────────────────────────────
const SEED = {
  users:[
    {id:"u1",email:"admin@rankorbit.com",password:"admin123",role:"super_admin",name:"Talha (Admin)",avatar:"T",createdAt:"2025-01-01"},
    {id:"u2",email:"manager@rankorbit.com",password:"manager123",role:"manager",name:"Sara (Manager)",avatar:"S",createdAt:"2025-01-15"},
    {id:"u3",email:"agent@rankorbit.com",password:"agent123",role:"agent",name:"Ali (Agent)",avatar:"A",createdAt:"2025-02-01"},
    {id:"u4",email:"mike@example.com",password:"client123",role:"client",name:"Mike Johnson",avatar:"M",businessName:"Mike's Plumbing",plan:"growth",phone:"(555) 200-1000",address:"123 Main St",city:"Austin",state:"TX",zip:"78701",website:"mikesplumbing.com",category:"Home Services",createdAt:"2025-03-01",status:"active",napScore:94,assignedAgent:"u3"},
    {id:"u5",email:"sarah@dentalcare.com",password:"client123",role:"client",name:"Sarah Miller",avatar:"S",businessName:"Sarah's Dental Care",plan:"gmb",phone:"(555) 300-2000",address:"456 Oak Ave",city:"Houston",state:"TX",zip:"77001",website:"sarahsdental.com",category:"Medical / Health",createdAt:"2025-03-15",status:"active",napScore:88,assignedAgent:"u3"},
    {id:"u6",email:"john@autoshop.com",password:"client123",role:"client",name:"John Davis",avatar:"J",businessName:"Davis Auto Repair",plan:"essentials",phone:"(555) 400-3000",address:"789 Elm Rd",city:"Dallas",state:"TX",zip:"75201",website:"davisauto.com",category:"Auto Services",createdAt:"2025-04-01",status:"active",napScore:72,assignedAgent:"u3"},
  ],
  listings:{
    u4:[
      {id:"l1",directory:"Google Business Profile",status:"live",submitted:"Mar 1",liveDate:"Mar 2",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
      {id:"l2",directory:"Yellow Pages",status:"live",submitted:"Mar 1",liveDate:"Mar 5",napMatch:"match",liveLink:"https://yellowpages.com",da:92,notes:""},
      {id:"l3",directory:"Foursquare",status:"live",submitted:"Mar 2",liveDate:"Mar 6",napMatch:"match",liveLink:"https://foursquare.com",da:88,notes:""},
      {id:"l4",directory:"Manta",status:"live",submitted:"Mar 3",liveDate:"Mar 8",napMatch:"match",liveLink:"https://manta.com",da:74,notes:""},
      {id:"l5",directory:"MerchantCircle",status:"live",submitted:"Mar 4",liveDate:"Mar 10",napMatch:"fixed",liveLink:"https://merchantcircle.com",da:68,notes:"Phone corrected Jun 24"},
      {id:"l6",directory:"Hotfrog",status:"live",submitted:"Apr 1",liveDate:"Apr 4",napMatch:"match",liveLink:"https://hotfrog.com",da:62,notes:""},
      {id:"l7",directory:"Storeboard",status:"live",submitted:"Apr 2",liveDate:"Apr 7",napMatch:"match",liveLink:"https://storeboard.com",da:55,notes:""},
      {id:"l8",directory:"Proven Expert",status:"live",submitted:"Apr 3",liveDate:"Apr 9",napMatch:"match",liveLink:"https://provenexpert.com",da:58,notes:""},
      {id:"l9",directory:"Apple Business Connect",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:96,notes:"Awaiting Apple verification"},
      {id:"l10",directory:"Bing Places",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:94,notes:""},
    ],
    u5:[
      {id:"l11",directory:"Google Business Profile",status:"live",submitted:"Mar 15",liveDate:"Mar 16",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
      {id:"l12",directory:"Healthgrades",status:"live",submitted:"Mar 16",liveDate:"Mar 20",napMatch:"match",liveLink:"https://healthgrades.com",da:82,notes:""},
      {id:"l13",directory:"Zocdoc",status:"live",submitted:"Mar 17",liveDate:"Mar 22",napMatch:"match",liveLink:"https://zocdoc.com",da:78,notes:""},
      {id:"l14",directory:"Yellow Pages",status:"live",submitted:"Mar 18",liveDate:"Mar 25",napMatch:"mismatch",liveLink:"https://yellowpages.com",da:92,notes:"Address format issue"},
      {id:"l15",directory:"Vitals",status:"pending",submitted:"Jul 2",liveDate:"—",napMatch:"—",liveLink:"",da:70,notes:""},
    ],
    u6:[
      {id:"l16",directory:"Google Business Profile",status:"live",submitted:"Apr 1",liveDate:"Apr 2",napMatch:"match",liveLink:"https://business.google.com",da:99,notes:""},
      {id:"l17",directory:"Yellow Pages",status:"live",submitted:"Apr 2",liveDate:"Apr 6",napMatch:"match",liveLink:"https://yellowpages.com",da:92,notes:""},
      {id:"l18",directory:"Yelp",status:"flagged",submitted:"Apr 3",liveDate:"Apr 8",napMatch:"mismatch",liveLink:"https://yelp.com",da:90,notes:"Unauthorized edit detected"},
      {id:"l19",directory:"Manta",status:"rejected",submitted:"May 1",liveDate:"—",napMatch:"—",liveLink:"",da:74,notes:"Duplicate listing found"},
    ],
  },
  gmb:{
    u5:{views:1240,calls:47,directions:83,
      trend:[{m:"Mar",v:680,c:28,d:51},{m:"Apr",v:820,c:34,d:63},{m:"May",v:1050,c:42,d:74},{m:"Jun",v:1240,c:47,d:83}],
      posts:[{title:"New Patient Special",date:"Jun 25",status:"live"},{title:"Open Saturdays",date:"Jun 15",status:"live"}],
      qa:[{q:"Do you accept insurance?",a:"Yes, we accept most major insurance plans.",date:"Jun 20"}],
      photos:3,completeness:{category:true,description:true,hours:true,photo:true,services:false,attributes:false}},
  },
  activity:[
    {id:"a1",clientId:"u4",type:"listing_live",desc:"Yellow Pages listing went live",date:"Jul 4, 2025",by:"Ali (Agent)"},
    {id:"a2",clientId:"u4",type:"nap_fix",desc:"Phone corrected on MerchantCircle",date:"Jun 24, 2025",by:"Ali (Agent)"},
    {id:"a3",clientId:"u4",type:"edit_blocked",desc:"Unauthorized edit blocked on Yelp — hours change reverted",date:"Jun 22, 2025",by:"System"},
    {id:"a4",clientId:"u5",type:"listing_live",desc:"Healthgrades listing went live",date:"Jun 18, 2025",by:"Ali (Agent)"},
    {id:"a5",clientId:"u6",type:"flagged",desc:"Yelp listing flagged — unauthorized edit detected",date:"Jun 20, 2025",by:"System"},
    {id:"a6",clientId:"u6",type:"rejected",desc:"Manta listing rejected — duplicate found",date:"May 10, 2025",by:"Ali (Agent)"},
  ],
};
function dbGet(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function dbSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){console.error(e);}}
function initDB(){
  dbSet("ro_users",SEED.users);
  if(!dbGet("ro_listings"))dbSet("ro_listings",SEED.listings);
  if(!dbGet("ro_gmb"))dbSet("ro_gmb",SEED.gmb);
  if(!dbGet("ro_activity"))dbSet("ro_activity",SEED.activity);
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useDB(key){
  const[data,setData]=useState(()=>dbGet(key));
  const save=useCallback((val)=>{dbSet(key,val);setData(val);},[key]);
  return[data,save];
}
function useWindowSize(){
  const[w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}
function useCounter(target,dur=900){
  const[val,setVal]=useState(0);
  useEffect(()=>{
    const n=typeof target==="number"?target:parseFloat(target)||0;
    if(!n){setVal(0);return;}
    let start=null,raf;
    const step=(ts)=>{if(!start)start=ts;const p=Math.min((ts-start)/dur,1);const e=1-Math.pow(1-p,3);setVal(Math.round(n*e));if(p<1)raf=requestAnimationFrame(step);};
    raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
  },[target,dur]);
  return val;
}
function useToast(){
  const[toasts,setToasts]=useState([]);
  const push=useCallback((msg,kind="success")=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,kind}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);
  const Toasts=useCallback(()=>(
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:2000,display:"flex",flexDirection:"column",gap:8,alignItems:"center",width:"calc(100% - 32px)",maxWidth:420,pointerEvents:"none"}}>
      {toasts.map(t=>(<div key={t.id} style={{animation:"toastIn .3s cubic-bezier(.22,.8,.36,1) both",background:T.ink,color:"#fff",borderRadius:12,padding:"11px 18px",fontSize:13,fontWeight:600,boxShadow:SHADOW_LG,display:"flex",alignItems:"center",gap:9,maxWidth:"100%"}}>
        <span>{t.kind==="success"?"✅":t.kind==="info"?"ℹ️":"⚠️"}</span>{t.msg}
      </div>))}
    </div>
  ),[toasts]);
  return[push,Toasts];
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Badge=({type,label})=>{
  const map={live:{bg:T.greenSoft,c:T.green,t:"Live"},pending:{bg:T.amberSoft,c:T.amber,t:"Pending"},rejected:{bg:T.redSoft,c:T.red,t:"Rejected"},flagged:{bg:T.redSoft,c:T.red,t:"Flagged"},fixed:{bg:T.blueSoft,c:T.blue,t:"NAP Fixed"},match:{bg:T.greenSoft,c:T.green,t:"✓ Match"},mismatch:{bg:T.redSoft,c:T.red,t:"Mismatch"},submitted:{bg:T.brandSoft,c:T.brand,t:"Submitted"},active:{bg:T.greenSoft,c:T.green,t:"Active"},paid:{bg:T.greenSoft,c:T.green,t:"Paid"}};
  const s=map[type]||map.submitted;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 11px",borderRadius:20,fontSize:11.5,fontWeight:700,background:s.bg,color:s.c}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.c,animation:type==="live"?"pulseDot 2.4s ease-in-out infinite":"none"}}/>{label||s.t}
  </span>);
};
const Card=({children,style={},hover=false,className=""})=>(
  <div className={`${hover?"hoverCard ":""}${className}`} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:18,padding:22,boxShadow:SHADOW,...style}}>{children}</div>
);
const Btn=({children,onClick,variant="primary",size="md",style={}})=>{
  const v={primary:{background:`linear-gradient(135deg,${T.brand},${T.brandDark})`,color:"#fff",border:"none",boxShadow:`0 4px 14px ${T.brandGlow}`},
    ghost:{background:T.surface,color:T.sub,border:`1px solid ${T.line}`},
    soft:{background:T.brandSoft,color:T.brand,border:"none"},
    green:{background:`linear-gradient(135deg,${T.green},#0B8A67)`,color:"#fff",border:"none",boxShadow:"0 4px 14px rgba(15,164,122,.22)"},
    danger:{background:T.redSoft,color:T.red,border:"none"}};
  const s={sm:{padding:"6px 14px",fontSize:12.5},md:{padding:"10px 20px",fontSize:13.5},lg:{padding:"13px 30px",fontSize:15}};
  return(<button onClick={onClick} style={{borderRadius:11,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,...v[variant],...s[size],...style}}>{children}</button>);
};
const Input=({label,value,onChange,placeholder,type="text",style={}})=>(
  <div style={{marginBottom:14,...style}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}</label>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}/>
  </div>
);
const Select=({label,value,onChange,options})=>(
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const Modal=({open,onClose,title,children,width=500})=>{
  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="pop" style={{background:T.surface,borderRadius:20,padding:26,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:SHADOW_LG}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:17,fontWeight:800,fontFamily:FONT_D}}>{title}</div>
        <button onClick={onClose} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
};
const StatCard=({label,value,sub,color=T.brand,soft=T.brandSoft,icon,trend,delay=0})=>{
  const isNum=/^\d+/.test(String(value));
  const n=isNum?parseInt(String(value).replace(/[^0-9]/g,"")):0;
  const suffix=isNum?String(value).replace(/^[\d,]+/,""):"";
  const count=useCounter(n);
  return(<Card hover className="fadeUp" style={{animationDelay:`${delay}ms`,position:"relative",overflow:"hidden"}}>
    <div style={{width:42,height:42,borderRadius:13,background:soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:12}}>{icon}</div>
    <div style={{fontSize:11,fontWeight:700,color:T.faint,textTransform:"uppercase",letterSpacing:".8px",marginBottom:5}}>{label}</div>
    <div style={{fontSize:32,fontWeight:800,color:T.ink,lineHeight:1,fontFamily:FONT_D}}>{isNum?count.toLocaleString()+suffix:value}</div>
    {sub&&<div style={{fontSize:12,color:T.sub,marginTop:6}}>{sub}</div>}
    {trend!=null&&<div style={{fontSize:12,color:trend>0?T.green:T.red,marginTop:4,fontWeight:700}}>{trend>0?"▲":"▼"} {Math.abs(trend)}% vs last month</div>}
    <div style={{position:"absolute",top:-30,right:-30,width:90,height:90,borderRadius:"50%",background:soft,opacity:.5}}/>
  </Card>);
};
const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.ink,borderRadius:10,padding:"9px 13px",boxShadow:SHADOW_LG}}>
    <div style={{fontSize:11,color:"#B8BBD4",marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:12.5,color:"#fff",fontWeight:700}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:p.color,marginRight:6}}/>{p.name}: {p.value}</div>)}
  </div>);
};
const SectionTitle=({children,sub})=>(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D,color:T.ink}}>{children}</div>
    {sub&&<div style={{fontSize:12,color:T.sub,marginTop:2}}>{sub}</div>}
  </div>
);
const Empty=({icon,title,sub})=>(
  <div style={{textAlign:"center",padding:"36px 16px",color:T.sub}}>
    <div style={{fontSize:36,marginBottom:10,animation:"floaty 3s ease-in-out infinite"}}>{icon}</div>
    <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>{title}</div>
    <div style={{fontSize:12.5}}>{sub}</div>
  </div>
);
const actIcon=(t)=>({listing_live:"🟢",nap_fix:"🔧",edit_blocked:"🛡️",flagged:"🚩",rejected:"❌",gmb_update:"📍",submitted:"📤"}[t]||"⚡");
const PLANS={essentials:{name:"Essentials",price:49,quota:"10 listings/mo",color:T.blue,soft:T.blueSoft,features:["10 directory submissions every month","NAP consistency management","Unauthorized edit protection","Listing monitoring & alerts","Client dashboard access"]},
  growth:{name:"Growth",price:89,quota:"20 listings/mo",color:T.brand,soft:T.brandSoft,features:["20 directory submissions every month","Everything in Essentials","Expanded directory coverage","Priority support","Monthly coverage report"]},
  gmb:{name:"GMB Pro",price:249,quota:"20 listings + GMB",color:T.violet,soft:T.violetSoft,features:["Everything in Growth","Google Business Profile management","Monthly GMB posts & Q&A","Engagement analytics (views, calls)","Dedicated BDM support"]}};

// ─── AUTH ────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin}){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState("");
  const users=dbGet("ro_users")||[];
  const login=()=>{
    const u=users.find(u=>u.email===email&&u.password===password);
    if(u){onLogin(u);setError("");}else setError("Invalid email or password. Try a demo account below.");
  };
  const staff=[{l:"Super Admin",e:"admin@rankorbit.com",p:"admin123",c:T.brand,s:"Full access"},{l:"Manager",e:"manager@rankorbit.com",p:"manager123",c:T.violet,s:"Ops access"},{l:"Agent",e:"agent@rankorbit.com",p:"agent123",c:T.blue,s:"Listings only"}];
  const clients=[{l:"Essentials $49",e:"john@autoshop.com",p:"client123",c:T.blue,s:"Davis Auto"},{l:"Growth $89",e:"mike@example.com",p:"client123",c:T.brand,s:"Mike's Plumbing"},{l:"GMB Pro $249",e:"sarah@dentalcare.com",p:"client123",c:T.violet,s:"Sarah's Dental"}];
  const w=useWindowSize();const isMobile=w<860;
  return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_B,padding:16,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:"-120px",left:"-80px",width:420,height:420,borderRadius:"50%",background:T.brandSoft,filter:"blur(60px)",animation:"blob 14s ease-in-out infinite"}}/>
    <div style={{position:"absolute",bottom:"-140px",right:"-60px",width:380,height:380,borderRadius:"50%",background:T.greenSoft,filter:"blur(60px)",animation:"blob 18s ease-in-out infinite reverse"}}/>
    <div style={{display:"flex",gap:48,alignItems:"center",maxWidth:960,width:"100%",position:"relative",flexDirection:isMobile?"column":"row"}}>
      {!isMobile&&(<div className="fadeUp" style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:26}}>
          <Orbit size={92}/>
          <div>
            <div style={{fontFamily:FONT_D,fontSize:30,fontWeight:800,letterSpacing:"-1px"}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
            <div style={{fontSize:13,color:T.sub,marginTop:2}}>Local Visibility Platform</div>
          </div>
        </div>
        <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:700,lineHeight:1.35,marginBottom:14}}>Your business, listed and protected <span style={{color:T.brand}}>everywhere customers look.</span></div>
        {["New directory listings every month","NAP consistency kept in sync","Unauthorized edits caught & reverted"].map((f,i)=>(
          <div key={i} className="fadeUp" style={{animationDelay:`${200+i*120}ms`,display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>✓</div>
            <span style={{fontSize:14,color:T.sub}}>{f}</span>
          </div>))}
      </div>)}
      <div className="pop" style={{width:"100%",maxWidth:430}}>
        {isMobile&&(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,justifyContent:"center"}}>
          <MiniOrbit size={40}/><div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
        </div>)}
        <Card style={{padding:28,boxShadow:SHADOW_LG}}>
          <div style={{fontFamily:FONT_D,fontSize:18,fontWeight:800,marginBottom:4}}>Sign in</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:20}}>Welcome back. Enter your details.</div>
          <Input label="Email" value={email} onChange={setEmail} placeholder="you@business.com"/>
          <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
          {error&&<div style={{fontSize:12.5,color:T.red,marginBottom:12,background:T.redSoft,padding:"8px 12px",borderRadius:9}}>{error}</div>}
          <Btn onClick={login} style={{width:"100%"}} size="lg">Sign In →</Btn>
          <div style={{marginTop:22,paddingTop:18,borderTop:`1px solid ${T.line}`}}>
            <div style={{fontSize:10.5,color:T.faint,fontWeight:800,letterSpacing:".8px",marginBottom:8}}>STAFF DEMO</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:14}}>
              {staff.map(d=>(<button key={d.l} onClick={()=>{setEmail(d.e);setPassword(d.p);}} style={{padding:"9px 4px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:d.c,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,lineHeight:1.5}}>{d.l}<br/><span style={{fontSize:9.5,color:T.faint,fontWeight:500}}>{d.s}</span></button>))}
            </div>
            <div style={{fontSize:10.5,color:T.faint,fontWeight:800,letterSpacing:".8px",marginBottom:8}}>CLIENT DEMO</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
              {clients.map(d=>(<button key={d.l} onClick={()=>{setEmail(d.e);setPassword(d.p);}} style={{padding:"9px 4px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:d.c,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:FONT_B,lineHeight:1.5}}>{d.l}<br/><span style={{fontSize:9.5,color:T.faint,fontWeight:500}}>{d.s}</span></button>))}
            </div>
            <div style={{marginTop:12,fontSize:11,color:T.faint,textAlign:"center"}}>Click any account to prefill, then Sign In</div>
          </div>
        </Card>
      </div>
    </div>
  </div>);
}

// ─── SHELL (sidebar + topbar shared) ─────────────────────────────────────────
function Shell({user,nav,page,setPage,onLogout,planBadge,badgeCounts={},children,brandTag}){
  const w=useWindowSize();const isMobile=w<820;
  const[open,setOpen]=useState(false);
  const Item=({item})=>{
    const active=page===item.id||(item.match&&item.match.includes(page));
    return(<div className="navItem" onClick={()=>{setPage(item.id);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 14px",margin:"2px 10px",cursor:"pointer",color:active?T.brand:T.sub,background:active?T.brandSoft:"transparent",borderRadius:12,fontWeight:active?800:600,fontSize:13.5}}>
      <span style={{fontSize:16}}>{item.icon}</span><span>{item.label}</span>
      {badgeCounts[item.id]>0&&<span style={{marginLeft:"auto",background:T.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"2px 7px"}}>{badgeCounts[item.id]}</span>}
      {item.locked&&<span style={{marginLeft:"auto",fontSize:11,color:T.faint}}>🔒</span>}
    </div>);
  };
  const Side=()=>(<div style={{width:isMobile?272:236,background:T.surface,borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",flexShrink:0,...(isMobile?{position:"fixed",top:0,left:open?0:"-290px",height:"100vh",zIndex:200,transition:"left .28s cubic-bezier(.22,.8,.36,1)",boxShadow:open?SHADOW_LG:"none"}:{})}}>
    <div style={{padding:"20px 18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <MiniOrbit size={34}/>
          <div>
            <div style={{fontFamily:FONT_D,fontSize:15.5,fontWeight:800,lineHeight:1.1}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
            {brandTag&&<div style={{fontSize:9.5,fontWeight:800,color:T.red,letterSpacing:".6px"}}>{brandTag}</div>}
          </div>
        </div>
        {isMobile&&<button onClick={()=>setOpen(false)} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:30,height:30,borderRadius:"50%"}}>×</button>}
      </div>
      {planBadge}
    </div>
    <nav style={{flex:1,overflowY:"auto",paddingBottom:10}}>{nav.map(i=><Item key={i.id} item={i}/>)}</nav>
    <div style={{padding:"14px 16px 18px",borderTop:`1px solid ${T.line}`}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{user.avatar}</div>
        <div style={{overflow:"hidden",flex:1}}>
          <div style={{fontSize:12.5,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.businessName||user.name}</div>
          <div style={{fontSize:10.5,color:T.faint,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
        </div>
      </div>
      <button onClick={onLogout} style={{width:"100%",padding:"9px 0",background:T.surface2,border:`1px solid ${T.line}`,borderRadius:10,color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
        <span style={{fontSize:13}}>↪</span> Sign Out
      </button>
    </div>
  </div>);
  return(<div style={{display:"flex",height:"100vh",background:T.bg,color:T.ink,fontFamily:FONT_B,overflow:"hidden"}}>
    <Side/>
    {isMobile&&open&&<div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.35)",zIndex:199}} onClick={()=>setOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isMobile&&(<div style={{padding:"13px 16px",background:T.surface,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:12,flexShrink:0,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setOpen(true)} style={{background:T.surface2,border:"none",color:T.ink,fontSize:17,cursor:"pointer",width:36,height:36,borderRadius:10}}>☰</button>
          <div style={{fontFamily:FONT_D,fontSize:15,fontWeight:800}}>Rank <span style={{color:T.brand}}>Orbit</span></div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"none",color:T.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Sign Out ↪</button>
      </div>)}
      <div style={{flex:1,overflow:"auto",padding:isMobile?"18px 16px 40px":"30px 34px 50px"}}>
        <div key={page} className="fadeUp">{children}</div>
      </div>
    </div>
  </div>);
}
const PageHead=({title,sub,right,isMobile})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
    <div>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?20:24,fontWeight:800,letterSpacing:"-.4px"}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:T.sub,marginTop:4}}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
function ClientDashboard({user,onLogout}){
  const[page,setPage]=useState("home");
  const[toast,Toasts]=useToast();
  const w=useWindowSize();const isMobile=w<820;
  const allListings=dbGet("ro_listings")||{};
  const allGmb=dbGet("ro_gmb")||{};
  const allActivity=dbGet("ro_activity")||[];
  const my=allListings[user.id]||[];
  const myGmb=allGmb[user.id];
  const myAct=allActivity.filter(a=>a.clientId===user.id);
  const live=my.filter(l=>l.status==="live").length;
  const pending=my.filter(l=>l.status==="pending").length;
  const plan=PLANS[user.plan];
  const hour=new Date().getHours();
  const greet=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const nav=[
    {id:"home",icon:"🏠",label:"Home"},
    {id:"listings",icon:"📋",label:"Listings"},
    {id:"gmb",icon:"📍",label:"GMB Management",locked:user.plan!=="gmb"},
    {id:"billing",icon:"💳",label:"Plan & Billing"},
    {id:"call",icon:"📞",label:"Book a Call"},
  ];
  const growthData=[{m:"Mar",live:Math.max(0,live-6)},{m:"Apr",live:Math.max(0,live-4)},{m:"May",live:Math.max(0,live-2)},{m:"Jun",live:Math.max(0,live-1)},{m:"Jul",live}];
  const planBadge=(<div style={{marginTop:14,padding:"10px 13px",background:plan.soft,borderRadius:13}}>
    <div style={{fontSize:10,color:T.sub,fontWeight:800,letterSpacing:".5px"}}>YOUR PLAN</div>
    <div style={{fontSize:14,fontWeight:800,color:plan.color,marginTop:2,fontFamily:FONT_D}}>{plan.name} · ${plan.price}/mo</div>
    <div style={{fontSize:10.5,color:T.sub,marginTop:2}}>{plan.quota}</div>
  </div>);

  const Home=()=>(<div>
    <PageHead isMobile={isMobile} title={`${greet}, ${user.name.split(" ")[0]} 👋`} sub={`Here's what we're doing for ${user.businessName} right now`}
      right={<Btn variant="soft" size="sm" onClick={()=>setPage("call")}>📞 Talk to your BDM</Btn>}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22}}>
      <StatCard label="Listings Live" value={live} sub={`${pending} pending approval`} icon="🟢" color={T.green} soft={T.greenSoft} trend={12} delay={0}/>
      <StatCard label="NAP Score" value={`${user.napScore}%`} sub="Info matches everywhere" icon="✅" delay={80}/>
      <StatCard label="Edits Blocked" value={3} sub="Unauthorized changes reverted" icon="🛡️" color={T.amber} soft={T.amberSoft} delay={160}/>
      <StatCard label="Directories" value={my.length} sub="Managed for you" icon="🌐" color={T.blue} soft={T.blueSoft} delay={240}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
      <Card className="fadeUp" style={{animationDelay:"120ms"}}>
        <SectionTitle sub="Directories live for your business over time">Your Visibility Is Growing</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={growthData}>
            <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.28}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="live" name="Live listings" stroke={T.green} strokeWidth={2.5} fill="url(#lg)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} animationDuration={1200}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card className="fadeUp" style={{animationDelay:"200ms"}}>
        <SectionTitle sub="of 60 target directories">Coverage Progress</SectionTitle>
        <div style={{display:"flex",justifyContent:"center",margin:"6px 0 14px"}}>
          <div style={{position:"relative",width:150,height:150}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={[{v:live},{v:pending},{v:Math.max(0,60-live-pending)}]} cx="50%" cy="50%" innerRadius={52} outerRadius={70} dataKey="v" strokeWidth={0} startAngle={90} endAngle={-270} animationDuration={1100}>
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
    <Card className="fadeUp" style={{animationDelay:"280ms"}}>
      <SectionTitle sub="Every action we take on your account, logged with dates">Recent Activity</SectionTitle>
      {myAct.length===0?<Empty icon="🛰️" title="Work starting" sub="Your first listings are being prepared — check back soon."/>:
        myAct.slice(0,5).map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<Math.min(myAct.length,5)-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
        </div>))}
    </Card>
  </div>);

  const Listings=()=>(<div>
    <PageHead isMobile={isMobile} title="Listings & Citations" sub={`${plan.quota} on your ${plan.name} plan`}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="Live" value={live} icon="✅" color={T.green} soft={T.greenSoft} delay={0}/>
      <StatCard label="Pending" value={pending} icon="⏳" color={T.amber} soft={T.amberSoft} delay={70}/>
      <StatCard label="NAP Score" value={`${user.napScore}%`} icon="📊" delay={140}/>
      <StatCard label="Protected" value={my.length} sub="Monitored 24/7" icon="🛡️" color={T.blue} soft={T.blueSoft} delay={210}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:18}}>
      <div className="fadeUp" style={{background:T.redSoft,borderRadius:16,padding:"14px 18px",display:"flex",gap:13,alignItems:"flex-start"}}>
        <span style={{fontSize:22}}>🛡️</span>
        <div><div style={{fontSize:13.5,fontWeight:800}}>Unauthorized edit blocked</div><div style={{fontSize:12.5,color:T.sub,marginTop:2}}>Someone tried changing your business hours on Yelp. We reverted it within 6 hours.</div></div>
      </div>
      <div className="fadeUp" style={{animationDelay:"90ms",background:T.blueSoft,borderRadius:16,padding:"14px 18px",display:"flex",gap:13,alignItems:"flex-start"}}>
        <span style={{fontSize:22}}>🔧</span>
        <div><div style={{fontSize:13.5,fontWeight:800}}>Info corrected & synced</div><div style={{fontSize:12.5,color:T.sub,marginTop:2}}>Your phone number was fixed on one directory so everything matches your master record.</div></div>
      </div>
    </div>
    <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
      <SectionTitle>Your Directories</SectionTitle>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
        <thead><tr>{["Directory","Status","Authority","Live Since","Info Match","Link"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
        <tbody>{my.map((d)=>(<tr key={d.id} className="hoverRow">
          <td style={{padding:"12px",fontSize:13.5,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:44,height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}><div style={{width:`${d.da}%`,height:"100%",background:d.da>=80?T.green:d.da>=60?T.amber:T.faint,borderRadius:3,animation:"growBar .9s ease both"}}/></div>
              <span style={{fontSize:12,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub}}>{d.da}</span>
            </div>
          </td>
          <td style={{padding:"12px",fontSize:12.5,color:d.liveDate==="—"?T.faint:T.ink,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="—"?<span style={{fontSize:12,color:T.faint}}>—</span>:<Badge type={d.napMatch}/>}</td>
          <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:12}}>—</span>}</td>
        </tr>))}</tbody>
      </table>
    </Card>
  </div>);

  const Gmb=()=>{
    if(user.plan!=="gmb")return(<div>
      <PageHead isMobile={isMobile} title="GMB Management"/>
      <Card style={{textAlign:"center",padding:isMobile?32:56,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Orbit size={100} speed={10}/></div>
        <div style={{fontFamily:FONT_D,fontSize:21,fontWeight:800,marginBottom:8}}>Put your Google profile on autopilot</div>
        <div style={{fontSize:13.5,color:T.sub,maxWidth:420,margin:"0 auto 24px",lineHeight:1.6}}>We publish posts, answer Q&A, keep your profile complete, and show you exactly how many calls and visits Google sends you every month.</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,maxWidth:520,margin:"0 auto 26px"}}>
          {["Monthly GMB posts","Q&A management","Photo uploads","Profile completeness","Calls & views analytics","Dedicated BDM"].map((f,i)=>(<div key={i} className="fadeUp" style={{animationDelay:`${i*70}ms`,padding:"10px 13px",background:T.violetSoft,borderRadius:11,fontSize:12.5,color:T.ink,fontWeight:600,display:"flex",gap:7,alignItems:"center"}}><span style={{color:T.violet}}>✓</span>{f}</div>))}
        </div>
        <Btn size="lg" onClick={()=>{setPage("billing");toast("See the GMB Pro plan below","info");}}>Upgrade to GMB Pro — $249/mo</Btn>
        <div style={{fontSize:11.5,color:T.faint,marginTop:12}}>Includes everything in Growth · Cancel anytime</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub="Your Google Business Profile, actively managed"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Profile Views" value={d.views} icon="👁️" color={T.green} soft={T.greenSoft} trend={18} delay={0}/>
        <StatCard label="Calls From Google" value={d.calls} icon="📞" trend={12} delay={80}/>
        <StatCard label="Direction Requests" value={d.directions} icon="🗺️" color={T.blue} soft={T.blueSoft} trend={9} delay={160}/>
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
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card><SectionTitle>Posts Published</SectionTitle>
          {d.posts.length===0?<Empty icon="📝" title="No posts yet" sub="Your first GMB post is being drafted."/>:
            d.posts.map((p,i)=>(<div key={i} className="hoverRow" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 8px",borderRadius:10,borderBottom:i<d.posts.length-1?`1px solid ${T.line}`:"none"}}>
              <div><div style={{fontSize:13.5,fontWeight:700}}>{p.title}</div><div style={{fontSize:11.5,color:T.faint,marginTop:2}}>Published {p.date}</div></div>
              <Badge type="live"/>
            </div>))}
        </Card>
        <Card><SectionTitle>Profile Completeness</SectionTitle>
          {Object.entries(d.completeness).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={{fontSize:13,color:T.sub,textTransform:"capitalize"}}>{k}</span>
            <span style={{fontSize:12.5,fontWeight:800,color:v?T.green:T.amber}}>{v?"✓ Done":"○ In progress"}</span>
          </div>))}
        </Card>
      </div>
    </div>);
  };

  const Billing=()=>{
    const nextDate="August 1, 2025";
    return(<div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:20}}>
        <Card className="fadeUp" style={{position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:plan.soft,opacity:.6}}/>
          <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:6}}>CURRENT PLAN</div>
          <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:FONT_D,fontSize:26,fontWeight:800}}>{plan.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:plan.color}}>${plan.price}<span style={{fontSize:13,color:T.faint,fontWeight:600}}>/month</span></div>
            <Badge type="active"/>
          </div>
          <div style={{marginTop:16}}>
            {plan.features.map((f,i)=>(<div key={i} className="fadeUp" style={{animationDelay:`${i*60}ms`,display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
              <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:800,flexShrink:0}}>✓</div>
              <span style={{fontSize:13,color:T.sub}}>{f}</span>
            </div>))}
          </div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card className="fadeUp" style={{animationDelay:"100ms",background:`linear-gradient(135deg,${T.brandSoft},#fff)`}}>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:8}}>NEXT CHARGE</div>
            <div style={{fontFamily:FONT_D,fontSize:24,fontWeight:800,color:T.brand}}>${plan.price}.00</div>
            <div style={{fontSize:13,color:T.sub,marginTop:3}}>on {nextDate}</div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:8,lineHeight:1.5}}>Renews automatically every month. Cancel anytime, no fees, no lock-in.</div>
          </Card>
          <Card className="fadeUp" style={{animationDelay:"170ms"}}>
            <div style={{fontSize:11,fontWeight:800,color:T.faint,letterSpacing:".8px",marginBottom:10}}>PAYMENT METHOD</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:44,height:30,borderRadius:6,background:`linear-gradient(135deg,${T.ink},#3A3A66)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:800,letterSpacing:"1px"}}>VISA</div>
              <div><div style={{fontSize:13.5,fontWeight:700}}>•••• 4242</div><div style={{fontSize:11.5,color:T.faint}}>Expires 08/27</div></div>
              <button onClick={()=>toast("Payment update coming soon","info")} style={{marginLeft:"auto",background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>Update</button>
            </div>
          </Card>
        </div>
      </div>
      <SectionTitle sub="Switch plans anytime — changes apply from your next billing cycle">Compare Plans</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:22}}>
        {Object.entries(PLANS).map(([id,p],i)=>{
          const current=id===user.plan;
          return(<div key={id} className="fadeUp hoverCard" style={{animationDelay:`${i*90}ms`,background:T.surface,border:`2px solid ${current?p.color:T.line}`,borderRadius:18,padding:20,position:"relative",boxShadow:current?SHADOW_LG:SHADOW}}>
            {current&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 13px",borderRadius:20,letterSpacing:".5px"}}>YOUR PLAN</div>}
            <div style={{fontFamily:FONT_D,fontSize:15,fontWeight:800}}>{p.name}</div>
            <div style={{fontFamily:FONT_D,fontSize:27,fontWeight:800,color:p.color,margin:"5px 0 2px"}}>${p.price}<span style={{fontSize:12.5,color:T.faint,fontWeight:600}}>/mo</span></div>
            <div style={{fontSize:12,color:T.sub,fontWeight:700,marginBottom:13}}>{p.quota}</div>
            <div style={{height:1,background:T.line,marginBottom:13}}/>
            {p.features.slice(0,4).map((f,j)=><div key={j} style={{fontSize:12,color:T.sub,marginBottom:7,display:"flex",gap:7}}><span style={{color:T.green,fontWeight:800}}>✓</span>{f}</div>)}
            {!current&&<Btn variant={p.price>plan.price?"primary":"ghost"} size="sm" style={{width:"100%",marginTop:8}} onClick={()=>toast(`${p.price>plan.price?"Upgrade":"Change"} request sent — your BDM will confirm within 24h`)}>{p.price>plan.price?"Upgrade":"Switch"} to {p.name}</Btn>}
          </div>);
        })}
      </div>
      <Card>
        <SectionTitle>Invoice History</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:460}}>
            <thead><tr>{["Date","Description","Amount","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".7px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>{["Jul 1, 2025","Jun 1, 2025","May 1, 2025"].map((d,i)=>(<tr key={i} className="hoverRow">
              <td style={{padding:"12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d}</td>
              <td style={{padding:"12px",fontSize:12.5,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{plan.name} plan · monthly</td>
              <td style={{padding:"12px",fontSize:13,fontWeight:800,borderBottom:`1px solid ${T.line}`}}>${plan.price}.00</td>
              <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><Badge type="paid"/></td>
              <td style={{padding:"12px",borderBottom:`1px solid ${T.line}`}}><button onClick={()=>toast("Invoice PDF downloading","info")} style={{background:"none",border:"none",color:T.brand,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>PDF ↓</button></td>
            </tr>))}</tbody>
          </table>
        </div>
        <div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:12,color:T.faint}}>Need to pause or cancel? No hidden steps.</div>
          <Btn variant="ghost" size="sm" onClick={()=>toast("Cancellation request noted — your BDM will reach out to confirm","info")}>Cancel subscription</Btn>
        </div>
      </Card>
    </div>);
  };

  const CallPage=()=>{
    const[selDay,setSelDay]=useState(null);
    const[selTime,setSelTime]=useState(null);
    const[confirmed,setConfirmed]=useState(false);
    const times=["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM"];
    const unavail=["9:30 AM","10:30 AM","2:30 PM"];
    const bookedDays=[3,8,14,22,28];const totalDays=31;const firstDay=2;
    return(<div>
      <PageHead isMobile={isMobile} title="Book a Call" sub="30 minutes with your dedicated Business Development Manager"/>
      {confirmed?(<Card className="pop" style={{textAlign:"center",padding:46,boxShadow:SHADOW_LG}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Orbit size={90} speed={8}/></div>
        <div style={{fontFamily:FONT_D,fontSize:22,fontWeight:800,color:T.green,marginBottom:8}}>You're booked!</div>
        <div style={{fontSize:14,color:T.sub,marginBottom:22}}>July {selDay} at {selTime} · calendar invite sent to {user.email}</div>
        <Btn variant="ghost" onClick={()=>{setConfirmed(false);setSelDay(null);setSelTime(null);}}>Schedule another</Btn>
      </Card>):(
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 0.8fr",gap:16}}>
        <Card>
          <SectionTitle>July 2025</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.faint,fontWeight:800,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:totalDays}).map((_,i)=>{
              const day=i+1;const isBooked=bookedDays.includes(day);const isSel=selDay===day;const isPast=day<15;const isWknd=(firstDay+i)%7===0||(firstDay+i)%7===6;
              const dead=isBooked||isPast||isWknd;
              return(<div key={day} onClick={()=>!dead&&setSelDay(day)} style={{textAlign:"center",padding:"8px 2px",borderRadius:10,fontSize:12.5,fontWeight:isSel?800:600,cursor:dead?"default":"pointer",background:isSel?T.brand:dead?"transparent":T.surface2,color:isSel?"#fff":dead?T.faint:T.ink,position:"relative",transition:"all .15s"}}>
                {day}{isBooked&&!isSel&&<div style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:T.red}}/>}
              </div>);
            })}
          </div>
        </Card>
        <Card>
          {selDay?(<>
            <SectionTitle sub="Pick a 30-minute slot">July {selDay}, 2025</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {times.map(t=>{const na=unavail.includes(t);const isSel=selTime===t;
                return(<div key={t} onClick={()=>!na&&setSelTime(t)} style={{padding:"10px 8px",borderRadius:10,textAlign:"center",border:`1.5px solid ${isSel?T.brand:T.line}`,background:isSel?T.brandSoft:na?T.surface2:T.surface,color:isSel?T.brand:na?T.faint:T.ink,fontSize:12.5,fontWeight:isSel?800:600,cursor:na?"default":"pointer",textDecoration:na?"line-through":"none",transition:"all .15s"}}>{t}</div>);})}
            </div>
            {selTime&&(<div className="pop" style={{marginTop:14}}>
              <div style={{padding:13,background:T.greenSoft,borderRadius:12,marginBottom:12}}>
                <div style={{fontSize:13,color:T.green,fontWeight:800}}>✓ July {selDay} at {selTime}</div>
                <div style={{fontSize:11.5,color:T.sub,marginTop:2}}>30 min with your BDM</div>
              </div>
              <Btn variant="green" style={{width:"100%"}} onClick={()=>setConfirmed(true)}>Confirm Booking</Btn>
            </div>)}
          </>):(<Empty icon="📅" title="Pick a date" sub="Choose an available day on the calendar to see open times."/>)}
        </Card>
        <Card>
          <SectionTitle>What we'll cover</SectionTitle>
          {["Your listings progress","NAP score walkthrough","Next month's targets","Plan questions"].map((item,i)=>(<div key={i} style={{display:"flex",gap:9,marginBottom:10,alignItems:"center"}}>
            <div style={{width:19,height:19,borderRadius:"50%",background:T.greenSoft,color:T.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>✓</div>
            <span style={{fontSize:12.5,color:T.sub}}>{item}</span>
          </div>))}
          <div style={{height:1,background:T.line,margin:"14px 0"}}/>
          <textarea placeholder="Any questions before the call?" style={{width:"100%",padding:"10px 13px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:12.5,resize:"none",height:74,boxSizing:"border-box",fontFamily:FONT_B}}/>
          <Btn variant="soft" size="sm" style={{width:"100%",marginTop:9}} onClick={()=>toast("Message sent to your BDM")}>Send message</Btn>
        </Card>
      </div>)}
    </div>);
  };

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={planBadge}>
    {page==="home"&&<Home/>}
    {page==="listings"&&<Listings/>}
    {page==="gmb"&&<Gmb/>}
    {page==="billing"&&<Billing/>}
    {page==="call"&&<CallPage/>}
  </Shell><Toasts/></>);
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({user,onLogout}){
  const[page,setPage]=useState("overview");
  const[selClient,setSelClient]=useState(null);
  const[modal,setModal]=useState(null);
  const[toast,Toasts]=useToast();
  const[tick,setTick]=useState(0);
  const refresh=()=>setTick(t=>t+1);
  const w=useWindowSize();const isMobile=w<820;
  const allUsers=dbGet("ro_users")||[];
  const allListings=dbGet("ro_listings")||{};
  const allGmb=dbGet("ro_gmb")||{};
  const allActivity=dbGet("ro_activity")||[];
  const clients=allUsers.filter(u=>u.role==="client");
  const staff=allUsers.filter(u=>u.role!=="client");
  const isAdmin=user.role==="super_admin";
  const revenue=clients.reduce((s,c)=>s+PLANS[c.plan].price,0);
  const flat=Object.entries(allListings).flatMap(([cId,ls])=>ls.map(l=>({...l,_cid:cId})));
  const totalLive=flat.filter(l=>l.status==="live").length;
  const totalPending=flat.filter(l=>l.status==="pending").length;
  const totalFlagged=flat.filter(l=>l.status==="flagged"||l.status==="rejected").length;

  const saveUsers=(v)=>{dbSet("ro_users",v);refresh();};
  const saveListings=(v)=>{dbSet("ro_listings",v);refresh();};
  const saveGmb=(v)=>{dbSet("ro_gmb",v);refresh();};
  const addActivity=(clientId,type,desc)=>{
    const a=[{id:`a${Date.now()}`,clientId,type,desc,date:new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),by:user.name},...allActivity];
    dbSet("ro_activity",a);refresh();
  };
  const updateListing=(cid,lid,updates)=>{
    const ls=[...(allListings[cid]||[])];const i=ls.findIndex(l=>l.id===lid);
    if(i>=0){ls[i]={...ls[i],...updates};saveListings({...allListings,[cid]:ls});}
  };
  const nav=[
    {id:"overview",icon:"📊",label:"Overview",roles:["super_admin","manager","agent"]},
    {id:"clients",icon:"👥",label:"Clients",roles:["super_admin","manager","agent"],match:["clientDetail"]},
    {id:"listings",icon:"📋",label:"All Listings",roles:["super_admin","manager","agent"]},
    {id:"gmb",icon:"📍",label:"GMB",roles:["super_admin","manager"]},
    {id:"team",icon:"🔑",label:"Team",roles:["super_admin"]},
    {id:"activity",icon:"📜",label:"Activity Log",roles:["super_admin","manager"]},
  ].filter(n=>n.roles.includes(user.role));
  const roleBadge=(<div style={{marginTop:14,padding:"9px 13px",background:T.surface2,borderRadius:12}}>
    <div style={{fontSize:10,color:T.faint,fontWeight:800,letterSpacing:".5px"}}>SIGNED IN AS</div>
    <div style={{fontSize:13,fontWeight:800,color:T.brand,marginTop:2}}>{user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent"}</div>
  </div>);

  // Modals
  const AddListingModal=({clientId,onClose})=>{
    const[dir,setDir]=useState("");const[da,setDa]=useState("");const[notes,setNotes]=useState("");
    return(<Modal open onClose={onClose} title="Add New Listing">
      <Input label="Directory Name" value={dir} onChange={setDir} placeholder="e.g. Hotfrog"/>
      <Input label="Domain Authority" value={da} onChange={setDa} placeholder="e.g. 62" type="number"/>
      <Input label="Notes" value={notes} onChange={setNotes} placeholder="Optional notes"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{if(!dir)return;
          const ls=[...(allListings[clientId]||[]),{id:`l${Date.now()}`,directory:dir,status:"submitted",submitted:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),liveDate:"—",napMatch:"—",liveLink:"",da:parseInt(da)||0,notes}];
          saveListings({...allListings,[clientId]:ls});addActivity(clientId,"submitted",`${dir} submitted`);toast(`${dir} added`);onClose();}}>Add Listing</Btn>
      </div>
    </Modal>);
  };
  const UpdateListingModal=({listing,clientId,onClose})=>{
    const[status,setStatus]=useState(listing.status);
    const[liveLink,setLiveLink]=useState(listing.liveLink||"");
    const[liveDate,setLiveDate]=useState(listing.liveDate||"");
    const[napMatch,setNapMatch]=useState(listing.napMatch||"—");
    const[notes,setNotes]=useState(listing.notes||"");
    return(<Modal open onClose={onClose} title={`Update · ${listing.directory}`}>
      <Select label="Status" value={status} onChange={setStatus} options={["submitted","pending","live","rejected","flagged"].map(s=>({value:s,label:s[0].toUpperCase()+s.slice(1)}))}/>
      <Input label="Live Listing URL" value={liveLink} onChange={setLiveLink} placeholder="https://directory.com/business"/>
      <Input label="Live Date" value={liveDate} onChange={setLiveDate} placeholder="e.g. Jul 5"/>
      <Select label="NAP Match" value={napMatch} onChange={setNapMatch} options={[{value:"—",label:"— Pending"},{value:"match",label:"✓ Match"},{value:"mismatch",label:"Mismatch"},{value:"fixed",label:"Fixed"}]}/>
      <Input label="Internal Notes" value={notes} onChange={setNotes} placeholder="Rejection reason, fix details…"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{
          updateListing(clientId,listing.id,{status,liveLink,liveDate:status==="live"?(liveDate!=="—"&&liveDate?liveDate:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})):listing.liveDate,napMatch,notes});
          if(status==="live"&&listing.status!=="live")addActivity(clientId,"listing_live",`${listing.directory} listing went live`);
          if(status==="rejected"&&listing.status!=="rejected")addActivity(clientId,"rejected",`${listing.directory} rejected. ${notes}`);
          if(status==="flagged"&&listing.status!=="flagged")addActivity(clientId,"flagged",`${listing.directory} flagged. ${notes}`);
          toast("Listing updated");onClose();}}>Save Changes</Btn>
      </div>
    </Modal>);
  };
  const AddClientModal=({onClose})=>{
    const[f,setF]=useState({role:"client",plan:"essentials",status:"active"});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title="Add New Client" width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Mike Johnson"/>
        <Input label="Business Name" value={f.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing"/>
        <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="mike@business.com" type="email"/>
        <Input label="Phone" value={f.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000"/>
        <Input label="City" value={f.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Input label="State" value={f.state} onChange={v=>set("state",v)} placeholder="TX"/>
      </div>
      <Select label="Plan" value={f.plan} onChange={v=>set("plan",v)} options={Object.entries(PLANS).map(([id,p])=>({value:id,label:`${p.name} $${p.price}/mo`}))}/>
      <Select label="Category" value={f.category} onChange={v=>set("category",v)} options={["Home Services","Medical / Health","Legal","Restaurant / Food","Auto Services","Beauty & Salon","Real Estate","Other"].map(o=>({value:o,label:o}))}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{if(!f.email||!f.name)return;
          saveUsers([...allUsers,{id:`u${Date.now()}`,...f,avatar:(f.name||"?")[0].toUpperCase(),password:"client123",napScore:0,createdAt:new Date().toISOString().split("T")[0]}]);
          toast(`${f.businessName||f.name} added as client`);onClose();}}>Add Client</Btn>
      </div>
    </Modal>);
  };
  const AddTeamModal=({onClose})=>{
    const[f,setF]=useState({role:"agent"});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title="Add Team Member">
      <Input label="Full Name" value={f.name} onChange={v=>set("name",v)} placeholder="Team member name"/>
      <Input label="Email" value={f.email} onChange={v=>set("email",v)} placeholder="team@rankorbit.com" type="email"/>
      <Select label="Role" value={f.role} onChange={v=>set("role",v)} options={[{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{if(!f.email||!f.name)return;saveUsers([...allUsers,{id:`u${Date.now()}`,...f,avatar:(f.name||"?")[0].toUpperCase(),password:"temp123",createdAt:new Date().toISOString().split("T")[0]}]);toast(`${f.name} added to team`);onClose();}}>Add Member</Btn>
      </div>
    </Modal>);
  };
  const GmbUpdateModal=({client,onClose})=>{
    const ex=allGmb[client.id]||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],photos:0,completeness:{category:false,description:false,hours:false,photo:false,services:false,attributes:false}};
    const[f,setF]=useState({views:ex.views,calls:ex.calls,directions:ex.directions,postTitle:"",qaQ:"",qaA:""});
    const set=(k,v)=>setF(x=>({...x,[k]:v}));
    return(<Modal open onClose={onClose} title={`GMB Update · ${client.businessName}`} width={560}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ENGAGEMENT METRICS</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <Input label="Views" value={f.views} onChange={v=>set("views",v)} type="number"/>
        <Input label="Calls" value={f.calls} onChange={v=>set("calls",v)} type="number"/>
        <Input label="Directions" value={f.directions} onChange={v=>set("directions",v)} type="number"/>
      </div>
      <Input label="New GMB Post (optional)" value={f.postTitle} onChange={v=>set("postTitle",v)} placeholder="e.g. Summer Special — 10% Off"/>
      <Input label="Q&A Question (optional)" value={f.qaQ} onChange={v=>set("qaQ",v)} placeholder="Customer question"/>
      <Input label="Q&A Answer" value={f.qaA} onChange={v=>set("qaA",v)} placeholder="Your answer"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={()=>{
          const today=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
          const trend=[...ex.trend,{m:new Date().toLocaleString("en-US",{month:"short"}),v:+f.views||0,c:+f.calls||0,d:+f.directions||0}];
          const posts=f.postTitle?[...ex.posts,{title:f.postTitle,date:today,status:"live"}]:ex.posts;
          const qa=f.qaQ&&f.qaA?[...ex.qa,{q:f.qaQ,a:f.qaA,date:today}]:ex.qa;
          saveGmb({...allGmb,[client.id]:{...ex,views:+f.views||0,calls:+f.calls||0,directions:+f.directions||0,trend,posts,qa}});
          addActivity(client.id,"gmb_update",`GMB data updated for ${client.businessName}`);
          toast("GMB data saved");onClose();}}>Save GMB Update</Btn>
      </div>
    </Modal>);
  };

  // Pages
  const Overview=()=>{
    const revData=[{m:"Mar",r:138},{m:"Apr",r:187},{m:"May",r:236},{m:"Jun",r:revenue},{m:"Jul",r:revenue}];
    const listData=[{m:"Mar",n:12,l:12},{m:"Apr",n:10,l:18},{m:"May",n:8,l:26},{m:"Jun",n:10,l:totalLive}];
    return(<div>
      <PageHead isMobile={isMobile} title="Platform Overview" sub={`Welcome back, ${user.name.split(" ")[0]}`}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":`repeat(${isAdmin?4:3},1fr)`,gap:14,marginBottom:20}}>
        {isAdmin&&<StatCard label="Monthly Revenue" value={`$${revenue}`} sub={`${clients.length} active subscriptions`} icon="💰" color={T.green} soft={T.greenSoft} trend={8} delay={0}/>}
        <StatCard label="Clients" value={clients.length} sub="Across all plans" icon="👥" delay={70}/>
        <StatCard label="Listings Live" value={totalLive} sub={`${totalPending} pending`} icon="🌐" color={T.blue} soft={T.blueSoft} delay={140}/>
        <StatCard label="Needs Attention" value={totalFlagged} sub="Flagged or rejected" icon="🚩" color={T.red} soft={T.redSoft} delay={210}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.7fr 1fr",gap:16,marginBottom:16}}>
        {isAdmin?(<Card><SectionTitle sub="Monthly recurring revenue (Super Admin only)">Revenue Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revData}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={.25}/><stop offset="100%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={38}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="r" name="MRR $" stroke={T.green} strokeWidth={2.5} fill="url(#rev)" dot={{fill:T.green,r:4,strokeWidth:2,stroke:"#fff"}} animationDuration={1100}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>):(<Card><SectionTitle sub="New live vs cumulative total">Listings Activity</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={listData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.faint,fontSize:11}} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="n" name="New" fill={T.brand} radius={[6,6,0,0]} animationDuration={900}/>
              <Bar dataKey="l" name="Total live" fill={T.green} radius={[6,6,0,0]} animationDuration={1200}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>)}
        <Card><SectionTitle>Plan Distribution</SectionTitle>
          <div style={{display:"flex",justifyContent:"center"}}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={Object.entries(PLANS).map(([id,p])=>({n:p.name,v:clients.filter(c=>c.plan===id).length}))} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="v" strokeWidth={0} animationDuration={1000}>
                {[T.blue,T.brand,T.violet].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie><Tooltip content={<ChartTip/>}/></PieChart>
            </ResponsiveContainer>
          </div>
          {Object.entries(PLANS).map(([id,p],i)=>(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:3,background:[T.blue,T.brand,T.violet][i]}}/><span style={{fontSize:12.5,color:T.sub}}>{p.name} ${p.price}</span></div>
            <span style={{fontSize:13,fontWeight:800}}>{clients.filter(c=>c.plan===id).length}</span>
          </div>))}
        </Card>
      </div>
      <Card><SectionTitle>Client Health</SectionTitle>
        {clients.map((c,i)=>{const cl=allListings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;
          return(<div key={c.id} className="hoverRow" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 10px",borderRadius:12,cursor:"pointer",borderBottom:i<clients.length-1?`1px solid ${T.line}`:"none",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${PLANS[c.plan].color},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
              <div><div style={{fontSize:13.5,fontWeight:800}}>{c.businessName}</div><div style={{fontSize:11,color:T.faint}}>{PLANS[c.plan].name} · ${PLANS[c.plan].price}/mo</div></div>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.sub,fontWeight:700}}>{lv} live</span>
              <span style={{fontSize:12,fontWeight:800,color:c.napScore>=90?T.green:c.napScore>=70?T.amber:T.red}}>NAP {c.napScore}%</span>
              <span style={{color:T.brand,fontSize:12.5,fontWeight:800}}>→</span>
            </div>
          </div>);})}
      </Card>
    </div>);
  };

  const Clients=()=>{
    const[search,setSearch]=useState("");
    const filtered=clients.filter(c=>!search||`${c.businessName} ${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase()));
    return(<div>
      <PageHead isMobile={isMobile} title="Clients" sub={`${clients.length} active clients`}
        right={user.role!=="agent"&&<Btn onClick={()=>setModal({type:"addClient"})}>+ Add Client</Btn>}/>
      <div style={{marginBottom:16,maxWidth:420}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by business, name, email, city…" style={{width:"100%",padding:"12px 16px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:13,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B,boxShadow:SHADOW}}/>
      </div>
      {filtered.length===0?<Card><Empty icon="🔍" title="No clients found" sub="Try a different search term."/></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((c,idx)=>{
          const cl=allListings[c.id]||[];const lv=cl.filter(l=>l.status==="live").length;const pd=cl.filter(l=>l.status==="pending").length;const fl=cl.filter(l=>l.status==="flagged"||l.status==="rejected").length;
          return(<Card key={c.id} hover className="fadeUp" style={{animationDelay:`${idx*60}ms`,cursor:"pointer"}} >
            <div onClick={()=>{setSelClient(c.id);setPage("clientDetail");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${PLANS[c.plan].color},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",flexShrink:0}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>{c.businessName}</div>
                  <div style={{fontSize:12,color:T.sub}}>{c.name} · {c.city}, {c.state} · {c.category}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:isMobile?12:20,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.green,fontFamily:FONT_D}}>{lv}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>LIVE</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.amber,fontFamily:FONT_D}}>{pd}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>PENDING</div></div>
                {fl>0&&<div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:T.red,fontFamily:FONT_D}}>{fl}</div><div style={{fontSize:9.5,color:T.faint,fontWeight:700,letterSpacing:".5px"}}>FLAGS</div></div>}
                <Badge type="submitted" label={`$${PLANS[c.plan].price}/mo`}/>
                <span style={{color:T.brand,fontWeight:800}}>→</span>
              </div>
            </div>
          </Card>);})}
      </div>}
    </div>);
  };

  const ClientDetail=()=>{
    const c=clients.find(x=>x.id===selClient);if(!c)return null;
    const cl=allListings[c.id]||[];
    const[nap,setNap]=useState(c.napScore||0);
    return(<div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,padding:"7px 14px",color:T.sub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_B}}>← Clients</button>
        <div style={{fontFamily:FONT_D,fontSize:isMobile?17:21,fontWeight:800}}>{c.businessName}</div>
        <Badge type="active"/><Badge type="submitted" label={`${PLANS[c.plan].name} $${PLANS[c.plan].price}/mo`}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:18}}>
        <Card><SectionTitle>Business Info</SectionTitle>
          {[["Owner",c.name],["Email",c.email],["Phone",c.phone],["Address",`${c.address||"—"}, ${c.city}, ${c.state}`],["Website",c.website||"—"],["Category",c.category]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{fontSize:12.5,color:T.faint,fontWeight:700}}>{k}</span><span style={{fontSize:12.5,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{v}</span>
            </div>))}
        </Card>
        <Card><SectionTitle>NAP Consistency</SectionTitle>
          <div style={{fontFamily:FONT_D,fontSize:44,fontWeight:800,textAlign:"center",padding:"8px 0",color:nap>=90?T.green:nap>=70?T.amber:T.red}}>{nap}%</div>
          <input type="range" min="0" max="100" value={nap} onChange={e=>setNap(+e.target.value)} style={{width:"100%",accentColor:T.brand}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>{saveUsers(allUsers.map(u=>u.id===c.id?{...u,napScore:nap}:u));toast(`NAP score saved: ${nap}%`);}}>Save NAP Score</Btn>
          <button onClick={()=>{addActivity(c.id,"edit_blocked","Unauthorized edit blocked and reverted");toast("Unauthorized edit logged & reverted","info");}} style={{width:"100%",marginTop:10,padding:"11px 0",background:T.redSoft,border:"none",borderRadius:11,color:T.red,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:FONT_B}}>🛡️ Log Unauthorized Edit + Revert</button>
        </Card>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14.5,fontWeight:800,fontFamily:FONT_D}}>Listings ({cl.length})</div>
          <div style={{display:"flex",gap:8}}>
            {c.plan==="gmb"&&<Btn variant="soft" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>📍 Update GMB</Btn>}
            <Btn size="sm" onClick={()=>setModal({type:"addListing",clientId:c.id})}>+ Add Listing</Btn>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
            <thead><tr>{["Directory","Status","DA","Submitted","Live","NAP","Link","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
            <tbody>{cl.map((d)=>(<tr key={d.id} className="hoverRow">
              <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
              <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
              <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.da}</td>
              <td style={{padding:"11px 12px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.submitted}</td>
              <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="—"?T.faint:T.green,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
              <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:T.faint}}>—</span>:<Badge type={d.napMatch}/>}</td>
              <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:T.brand,fontSize:12,fontWeight:700,textDecoration:"none"}}>View ↗</a>:<span style={{color:T.faint,fontSize:11.5}}>—</span>}</td>
              <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Btn variant="soft" size="sm" onClick={()=>setModal({type:"updateListing",listing:d,clientId:c.id})}>Update</Btn></td>
            </tr>))}</tbody>
          </table>
        </div>
      </Card>
      <Card><SectionTitle>Activity Log</SectionTitle>
        {allActivity.filter(a=>a.clientId===c.id).length===0?<Empty icon="📜" title="No activity yet" sub="Actions taken for this client will appear here."/>:
          allActivity.filter(a=>a.clientId===c.id).map((a,i,arr)=>(<div key={a.id} style={{display:"flex",gap:12,padding:"10px 6px",borderBottom:i<arr.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{actIcon(a.type)}</div>
            <div><div style={{fontSize:12.5,fontWeight:600}}>{a.desc}</div><div style={{fontSize:11,color:T.faint,marginTop:2}}>{a.date} · {a.by}</div></div>
          </div>))}
      </Card>
    </div>);
  };

  const AllListings=()=>{
    const[filter,setFilter]=useState("all");
    const withNames=flat.map(l=>({...l,_name:clients.find(c=>c.id===l._cid)?.businessName||"?"}));
    const filtered=filter==="all"?withNames:withNames.filter(l=>l.status===filter);
    const counts=(s)=>s==="all"?withNames.length:withNames.filter(l=>l.status===s).length;
    return(<div>
      <PageHead isMobile={isMobile} title="All Listings" sub={`${withNames.length} total across ${clients.length} clients`}/>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","live","pending","submitted","flagged","rejected"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${filter===s?T.brand:T.line}`,background:filter===s?T.brandSoft:T.surface,color:filter===s?T.brand:T.sub,fontSize:12.5,fontWeight:filter===s?800:600,cursor:"pointer",fontFamily:FONT_B}}>{s[0].toUpperCase()+s.slice(1)} ({counts(s)})</button>))}
      </div>
      <Card style={{overflowX:"auto",padding:isMobile?14:22}}>
        {filtered.length===0?<Empty icon="📋" title="Nothing here" sub={`No ${filter} listings right now.`}/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Client","Directory","Status","DA","Live","NAP","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1.5px solid ${T.line}`}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((d)=>(<tr key={`${d._cid}-${d.id}`} className="hoverRow">
            <td style={{padding:"11px 12px",fontSize:12,color:T.sub,fontWeight:600,borderBottom:`1px solid ${T.line}`}}>{d._name}</td>
            <td style={{padding:"11px 12px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.directory}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Badge type={d.status}/></td>
            <td style={{padding:"11px 12px",fontSize:12.5,fontWeight:800,color:d.da>=80?T.green:d.da>=60?T.amber:T.sub,borderBottom:`1px solid ${T.line}`}}>{d.da}</td>
            <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="—"?T.faint:T.green,fontWeight:700,borderBottom:`1px solid ${T.line}`}}>{d.liveDate}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:T.faint}}>—</span>:<Badge type={d.napMatch}/>}</td>
            <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.line}`}}><Btn variant="soft" size="sm" onClick={()=>{setSelClient(d._cid);setPage("clientDetail");}}>Open</Btn></td>
          </tr>))}</tbody>
        </table>}
      </Card>
    </div>);
  };

  const GmbAdmin=()=>{
    const gmbClients=clients.filter(c=>c.plan==="gmb");
    return(<div>
      <PageHead isMobile={isMobile} title="GMB Management" sub={`${gmbClients.length} GMB Pro clients`}/>
      {gmbClients.length===0?<Card><Empty icon="📍" title="No GMB Pro clients yet" sub="Clients on the $249 plan will appear here."/></Card>:
        gmbClients.map(c=>{const d=allGmb[c.id];
          return(<Card key={c.id} hover style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",gap:13,alignItems:"center"}}>
                <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.violet},${T.brand})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{c.avatar}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:FONT_D}}>{c.businessName}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{d?`${d.views.toLocaleString()} views · ${d.calls} calls · ${d.directions} directions`:"No GMB data yet"}{d&&` · ${d.posts?.length||0} posts`}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" size="sm" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>View Client</Btn>
                <Btn variant="green" size="sm" onClick={()=>setModal({type:"gmb",client:c})}>Update GMB</Btn>
              </div>
            </div>
          </Card>);})}
    </div>);
  };

  const Team=()=>(<div>
    <PageHead isMobile={isMobile} title="Team" sub={`${staff.length} team members`} right={<Btn onClick={()=>setModal({type:"addTeam"})}>+ Add Member</Btn>}/>
    {staff.map((m,i)=>(<Card key={m.id} hover className="fadeUp" style={{animationDelay:`${i*70}ms`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:13,alignItems:"center"}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:m.role==="super_admin"?`linear-gradient(135deg,${T.brand},${T.violet})`:m.role==="manager"?`linear-gradient(135deg,${T.amber},#E8A33D)`:`linear-gradient(135deg,${T.blue},#5B9FE8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
          <div><div style={{fontSize:14,fontWeight:800}}>{m.name}</div><div style={{fontSize:12,color:T.sub}}>{m.email}</div></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
          {m.id!==user.id&&m.role!=="super_admin"&&<Btn variant="danger" size="sm" onClick={()=>{saveUsers(allUsers.filter(u=>u.id!==m.id));toast(`${m.name} removed`);}}>Remove</Btn>}
        </div>
      </div>
    </Card>))}
    <Card style={{background:T.surface2,boxShadow:"none",border:`1px dashed ${T.line}`}}>
      <div style={{fontSize:11,fontWeight:800,color:T.faint,marginBottom:10,letterSpacing:".6px"}}>ROLE PERMISSIONS</div>
      {[["Super Admin",T.brand,"Full access — clients, listings, GMB, team, revenue"],["Manager",T.amber,"Clients, listings, GMB. No team or revenue access."],["Agent",T.blue,"View clients and update listing statuses only."]].map(([r,c,p])=>(
        <div key={r} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:3,background:c,marginTop:5,flexShrink:0}}/><div style={{fontSize:12.5}}><b style={{color:c}}>{r}:</b> <span style={{color:T.sub}}>{p}</span></div></div>))}
    </Card>
  </div>);

  const Activity=()=>(<div>
    <PageHead isMobile={isMobile} title="Activity Log" sub="Every platform event, newest first"/>
    <Card>
      {allActivity.length===0?<Empty icon="📜" title="No activity yet" sub="Platform events will appear here."/>:
        allActivity.map((a,i)=>(<div key={a.id} className="hoverRow" style={{display:"flex",gap:13,padding:"11px 8px",borderRadius:10,borderBottom:i<allActivity.length-1?`1px solid ${T.line}`:"none",alignItems:"flex-start"}}>
          <div style={{width:34,height:34,borderRadius:11,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actIcon(a.type)}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.desc}</div>
              <div style={{fontSize:11,color:T.faint}}>{a.date}</div>
            </div>
            <div style={{fontSize:11.5,color:T.faint,marginTop:2}}>{clients.find(c=>c.id===a.clientId)?.businessName||a.clientId} · by {a.by}</div>
          </div>
        </div>))}
    </Card>
  </div>);

  return(<><Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={roleBadge} brandTag="ADMIN" badgeCounts={{listings:totalFlagged}}>
    {page==="overview"&&<Overview/>}
    {page==="clients"&&<Clients/>}
    {page==="clientDetail"&&<ClientDetail/>}
    {page==="listings"&&<AllListings/>}
    {page==="gmb"&&<GmbAdmin/>}
    {page==="team"&&<Team/>}
    {page==="activity"&&<Activity/>}
  </Shell>
  {modal?.type==="addClient"&&<AddClientModal onClose={()=>setModal(null)}/>}
  {modal?.type==="addTeam"&&<AddTeamModal onClose={()=>setModal(null)}/>}
  {modal?.type==="addListing"&&<AddListingModal clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="updateListing"&&<UpdateListingModal listing={modal.listing} clientId={modal.clientId} onClose={()=>setModal(null)}/>}
  {modal?.type==="gmb"&&<GmbUpdateModal client={modal.client} onClose={()=>setModal(null)}/>}
  <Toasts/></>);
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  useEffect(()=>{initDB();setReady(true);},[]);
  if(!ready)return(<div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:FONT_B}}>
    <GlobalStyle/><Orbit size={90} speed={6}/>
    <div style={{fontSize:13,color:T.sub,fontWeight:600}}>Loading platform…</div>
  </div>);
  return(<><GlobalStyle/>
    {!currentUser?<AuthScreen onLogin={setCurrentUser}/>:
      currentUser.role==="client"?<ClientDashboard user={currentUser} onLogout={()=>setCurrentUser(null)}/>:
      <AdminDashboard user={currentUser} onLogout={()=>setCurrentUser(null)}/>}
  </>);
}
