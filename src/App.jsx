import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#080810",card:"#0F0F1A",card2:"#13131F",border:"#1C1C2E",
  accent:"#6C63FF",accentL:"rgba(108,99,255,0.15)",accentG:"rgba(108,99,255,0.25)",
  green:"#00E5A0",greenL:"rgba(0,229,160,0.1)",
  amber:"#FFB547",amberL:"rgba(255,181,71,0.1)",
  red:"#FF5E7D",redL:"rgba(255,94,125,0.1)",
  blue:"#38BDF8",blueL:"rgba(56,189,248,0.1)",
  purple:"#A855F7",purpleL:"rgba(168,85,247,0.1)",
  text:"#F0F0FF",sub:"#8888AA",muted:"#3A3A55",
};
const G = {
  purple:"linear-gradient(135deg,#6C63FF,#9B8AFF)",
  green:"linear-gradient(135deg,#00E5A0,#00B4D8)",
  amber:"linear-gradient(135deg,#FFB547,#FF8C42)",
  red:"linear-gradient(135deg,#FF5E7D,#FF8C42)",
  card:"linear-gradient(145deg,#0F0F1A,#13131F)",
};
const F = "'Inter',system-ui,sans-serif";

// ─── SEED DATA ─────────────────────────────────────────────────────────────────
const SEED = {
  users:[
    {id:"u1",email:"admin@rankorbit.com",password:"admin123",role:"super_admin",name:"Talha (Admin)",avatar:"T",createdAt:"2025-01-01"},
    {id:"u2",email:"manager@rankorbit.com",password:"manager123",role:"manager",name:"Sara (Manager)",avatar:"S",createdAt:"2025-01-15"},
    {id:"u3",email:"agent@rankorbit.com",password:"agent123",role:"agent",name:"Ali (Agent)",avatar:"A",createdAt:"2025-02-01"},
    {id:"u4",email:"mike@example.com",password:"client123",role:"client",name:"Mike Johnson",avatar:"M",businessName:"Mike's Plumbing",plan:"growth",phone:"(555)200-1000",address:"123 Main St",city:"Austin",state:"TX",zip:"78701",website:"mikesplumbing.com",category:"Home Services",createdAt:"2025-03-01",status:"active",napScore:94,assignedAgent:"u3"},
    {id:"u5",email:"sarah@dentalcare.com",password:"client123",role:"client",name:"Sarah Miller",avatar:"S",businessName:"Sarah's Dental Care",plan:"gmb",phone:"(555)300-2000",address:"456 Oak Ave",city:"Houston",state:"TX",zip:"77001",website:"sarahsdental.com",category:"Medical / Health",createdAt:"2025-03-15",status:"active",napScore:88,assignedAgent:"u3"},
    {id:"u6",email:"john@autoshop.com",password:"client123",role:"client",name:"John Davis",avatar:"J",businessName:"Davis Auto Repair",plan:"essentials",phone:"(555)400-3000",address:"789 Elm Rd",city:"Dallas",state:"TX",zip:"75201",website:"davisauto.com",category:"Auto Services",createdAt:"2025-04-01",status:"active",napScore:72,assignedAgent:"u3"},
  ],
  listings:{
    u4:[
      {id:"l1",directory:"Google Business Profile",url:"https://business.google.com",status:"live",submitted:"Mar 1",liveDate:"Mar 2",napMatch:"match",liveLink:"https://g.co/mike",da:99,notes:""},
      {id:"l2",directory:"Yellow Pages",url:"https://yellowpages.com",status:"live",submitted:"Mar 1",liveDate:"Mar 5",napMatch:"match",liveLink:"https://yp.com/mike",da:92,notes:""},
      {id:"l3",directory:"Foursquare",url:"https://foursquare.com",status:"live",submitted:"Mar 2",liveDate:"Mar 6",napMatch:"match",liveLink:"https://4sq.com/mike",da:88,notes:""},
      {id:"l4",directory:"Manta",url:"https://manta.com",status:"live",submitted:"Mar 3",liveDate:"Mar 8",napMatch:"match",liveLink:"https://manta.com/mike",da:74,notes:""},
      {id:"l5",directory:"MerchantCircle",url:"https://merchantcircle.com",status:"live",submitted:"Mar 4",liveDate:"Mar 10",napMatch:"fixed",liveLink:"https://mc.com/mike",da:68,notes:"Phone corrected Jun 24"},
      {id:"l6",directory:"Hotfrog",url:"https://hotfrog.com",status:"live",submitted:"Apr 1",liveDate:"Apr 4",napMatch:"match",liveLink:"https://hotfrog.com/mike",da:62,notes:""},
      {id:"l7",directory:"Storeboard",url:"https://storeboard.com",status:"live",submitted:"Apr 2",liveDate:"Apr 7",napMatch:"match",liveLink:"https://sb.com/mike",da:55,notes:""},
      {id:"l8",directory:"Proven Expert",url:"https://provenexpert.com",status:"live",submitted:"Apr 3",liveDate:"Apr 9",napMatch:"match",liveLink:"https://pe.com/mike",da:58,notes:""},
      {id:"l9",directory:"Apple Business Connect",url:"https://business.apple.com",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:96,notes:"Awaiting Apple verification"},
      {id:"l10",directory:"Bing Places",url:"https://bingplaces.com",status:"pending",submitted:"Jul 1",liveDate:"—",napMatch:"—",liveLink:"",da:94,notes:""},
    ],
    u5:[
      {id:"l11",directory:"Google Business Profile",url:"https://business.google.com",status:"live",submitted:"Mar 15",liveDate:"Mar 16",napMatch:"match",liveLink:"https://g.co/sarah",da:99,notes:""},
      {id:"l12",directory:"Healthgrades",url:"https://healthgrades.com",status:"live",submitted:"Mar 16",liveDate:"Mar 20",napMatch:"match",liveLink:"https://hg.com/sarah",da:82,notes:""},
      {id:"l13",directory:"Zocdoc",url:"https://zocdoc.com",status:"live",submitted:"Mar 17",liveDate:"Mar 22",napMatch:"match",liveLink:"https://zoc.com/sarah",da:78,notes:""},
      {id:"l14",directory:"Yellow Pages",url:"https://yellowpages.com",status:"live",submitted:"Mar 18",liveDate:"Mar 25",napMatch:"mismatch",liveLink:"https://yp.com/sarah",da:92,notes:"Address format issue"},
      {id:"l15",directory:"Vitals",url:"https://vitals.com",status:"pending",submitted:"Jul 2",liveDate:"—",napMatch:"—",liveLink:"",da:70,notes:""},
    ],
    u6:[
      {id:"l16",directory:"Google Business Profile",url:"https://business.google.com",status:"live",submitted:"Apr 1",liveDate:"Apr 2",napMatch:"match",liveLink:"https://g.co/davis",da:99,notes:""},
      {id:"l17",directory:"Yellow Pages",url:"https://yellowpages.com",status:"live",submitted:"Apr 2",liveDate:"Apr 6",napMatch:"match",liveLink:"https://yp.com/davis",da:92,notes:""},
      {id:"l18",directory:"Yelp",url:"https://yelp.com",status:"flagged",submitted:"Apr 3",liveDate:"Apr 8",napMatch:"mismatch",liveLink:"https://yelp.com/davis",da:90,notes:"Unauthorized edit detected - hours changed"},
      {id:"l19",directory:"Manta",url:"https://manta.com",status:"rejected",submitted:"May 1",liveDate:"—",napMatch:"—",liveLink:"",da:74,notes:"Rejected: duplicate listing found"},
    ],
  },
  gmb:{
    u5:{
      views:1240,calls:47,directions:83,
      trend:[{m:"Mar",v:680,c:28,d:51},{m:"Apr",v:820,c:34,d:63},{m:"May",v:1050,c:42,d:74},{m:"Jun",v:1240,c:47,d:83}],
      posts:[{title:"New Patient Special",date:"Jun 25",status:"live"},{title:"Open Saturdays",date:"Jun 15",status:"live"}],
      qa:[{q:"Do you accept insurance?",a:"Yes, we accept most major insurance plans.",date:"Jun 20"}],
      photos:3,completeness:{category:true,description:true,hours:true,photo:true,services:false,attributes:false},
    },
  },
  activity:[
    {id:"a1",clientId:"u4",type:"listing_live",desc:"Yellow Pages listing went live",date:"Jul 4, 2025",by:"Ali (Agent)"},
    {id:"a2",clientId:"u4",type:"nap_fix",desc:"Phone corrected on MerchantCircle: old → (555)200-1000",date:"Jun 24, 2025",by:"Ali (Agent)"},
    {id:"a3",clientId:"u4",type:"edit_blocked",desc:"Unauthorized edit blocked on Yelp — hours change reverted",date:"Jun 22, 2025",by:"System"},
    {id:"a4",clientId:"u5",type:"listing_live",desc:"Healthgrades listing went live",date:"Jun 18, 2025",by:"Ali (Agent)"},
    {id:"a5",clientId:"u6",type:"flagged",desc:"Yelp listing flagged — unauthorized edit detected",date:"Jun 20, 2025",by:"System"},
    {id:"a6",clientId:"u6",type:"rejected",desc:"Manta listing rejected — duplicate found",date:"May 10, 2025",by:"Ali (Agent)"},
  ],
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function dbGet(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function dbSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){console.error(e);}}

function initDB(){
  // Always re-seed users so demo accounts stay current; preserve listings/gmb/activity if they exist
  dbSet("ro_users",SEED.users);
  const existingListings=dbGet("ro_listings");
  if(!existingListings)dbSet("ro_listings",SEED.listings);
  const existingGmb=dbGet("ro_gmb");
  if(!existingGmb)dbSet("ro_gmb",SEED.gmb);
  const existingActivity=dbGet("ro_activity");
  if(!existingActivity)dbSet("ro_activity",SEED.activity);
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useDB(key){
  const [data,setData]=useState(()=>dbGet(key));
  const [loading,setLoading]=useState(false);
  const load=useCallback(()=>{setLoading(true);const d=dbGet(key);setData(d);setLoading(false);},[key]);
  useEffect(()=>{load();},[load]);
  const save=useCallback((val)=>{dbSet(key,val);setData(val);},[key]);
  return[data,save,loading,load];
}

function useWindowSize(){
  const[size,setSize]=useState({w:window.innerWidth,h:window.innerHeight});
  useEffect(()=>{const h=()=>setSize({w:window.innerWidth,h:window.innerHeight});window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return size;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Badge=({type,label})=>{
  const map={live:{bg:C.greenL,c:C.green},pending:{bg:C.amberL,c:C.amber},rejected:{bg:C.redL,c:C.red},flagged:{bg:C.redL,c:C.red},fixed:{bg:C.blueL,c:C.blue},match:{bg:C.greenL,c:C.green},mismatch:{bg:C.redL,c:C.red},submitted:{bg:C.accentL,c:C.accent},active:{bg:C.greenL,c:C.green},inactive:{bg:C.muted+"33",c:C.sub}};
  const s=map[type]||map.submitted;
  const labels={live:"Live",pending:"Pending",rejected:"Rejected",flagged:"Flagged",fixed:"NAP Fixed",match:"✓ Match",mismatch:"⚠ Mismatch",submitted:"Submitted",active:"Active",inactive:"Inactive"};
  return(<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,color:s.c}}><span style={{width:6,height:6,borderRadius:"50%",background:s.c,display:"inline-block"}}/>{label||labels[type]||type}</span>);
};

const Card=({children,style={}})=>(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 4px 24px rgba(0,0,0,0.35)",...style}}>{children}</div>);

const Btn=({children,onClick,variant="primary",size="md",style={}})=>{
  const variants={primary:{background:G.purple,color:"#fff",border:"none",boxShadow:`0 4px 16px ${C.accentG}`},ghost:{background:"transparent",color:C.sub,border:`1px solid ${C.border}`},danger:{background:G.red,color:"#fff",border:"none"},green:{background:G.green,color:"#fff",border:"none"}};
  const sizes={sm:{padding:"5px 12px",fontSize:12},md:{padding:"9px 18px",fontSize:13},lg:{padding:"12px 28px",fontSize:15}};
  return(<button onClick={onClick} style={{borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"opacity .15s",...variants[variant],...sizes[size],...style}}>{children}</button>);
};

const Input=({label,value,onChange,placeholder,type="text",style={}})=>(<div style={{marginBottom:14,...style}}>
  {label&&<label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5,letterSpacing:"0.6px"}}>{label.toUpperCase()}</label>}
  <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"10px 14px",background:"#0A0A14",border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:F}}/>
</div>);

const Select=({label,value,onChange,options})=>(<div style={{marginBottom:14}}>
  {label&&<label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5,letterSpacing:"0.6px"}}>{label.toUpperCase()}</label>}
  <select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"10px 14px",background:"#0A0A14",border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:F}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
</div>);

const Modal=({open,onClose,title,children,width=500})=>{
  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>);
};

const Tooltip2=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
    <div style={{fontSize:11,color:C.sub,marginBottom:5}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color,fontWeight:700}}>{p.name}: {p.value}</div>)}
  </div>);
};

const StatCard=({label,value,sub,color=C.accent,icon,trend})=>(<Card style={{position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",top:0,right:0,width:70,height:70,background:`radial-gradient(circle at top right,${color}25,transparent 70%)`,borderRadius:"0 16px 0 0"}}/>
  <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
  <div style={{fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.9px",marginBottom:4}}>{label}</div>
  <div style={{fontSize:32,fontWeight:900,color,lineHeight:1}}>{value}</div>
  {sub&&<div style={{fontSize:11,color:C.sub,marginTop:4}}>{sub}</div>}
  {trend&&<div style={{fontSize:11,color:trend>0?C.green:C.red,marginTop:4,fontWeight:700}}>{trend>0?"↑":"↓"} {Math.abs(trend)}% vs last month</div>}
</Card>);

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({onLogin}){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState("");
  const[users]=useDB("ro_users");

  const login=async()=>{
    const u=users?.find(u=>u.email===email&&u.password===password);
    if(u){onLogin(u);setError("");}
    else setError("Invalid email or password.");
  };

  const staffDemos=[
    {label:"Super Admin",email:"admin@rankorbit.com",password:"admin123",color:C.accent,sub:"Full access"},
    {label:"Manager",email:"manager@rankorbit.com",password:"manager123",color:C.purple,sub:"No revenue/team"},
    {label:"Agent",email:"agent@rankorbit.com",password:"agent123",color:C.blue,sub:"Listings only"},
  ];
  const clientDemos=[
    {label:"Essentials $49",email:"john@autoshop.com",password:"client123",color:C.green,sub:"Davis Auto Repair"},
    {label:"Growth $89",email:"mike@example.com",password:"client123",color:C.amber,sub:"Mike's Plumbing"},
    {label:"GMB Pro $249",email:"sarah@dentalcare.com",password:"client123",color:C.purple,sub:"Sarah's Dental"},
  ];

  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,padding:16}}>
    <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 50%,rgba(108,99,255,0.08),transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,229,160,0.05),transparent 50%)",pointerEvents:"none"}}/>
    <div style={{width:"100%",maxWidth:440}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}><span style={{color:C.accent}}>Rank</span> Orbit</div>
        <div style={{fontSize:13,color:C.sub,marginTop:6}}>Platform Management System</div>
      </div>
      <Card style={{boxShadow:`0 0 40px ${C.accentG}`}}>
        <Input label="Email" value={email} onChange={setEmail} placeholder="Enter your email"/>
        <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
        {error&&<div style={{fontSize:12,color:C.red,marginBottom:12}}>{error}</div>}
        <Btn onClick={login} style={{width:"100%",padding:"12px"}} size="lg">Sign In →</Btn>
        <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:8,letterSpacing:"0.5px"}}>STAFF DEMO ACCOUNTS</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:14}}>
            {staffDemos.map(d=>(<button key={d.label} onClick={()=>{setEmail(d.email);setPassword(d.password);}} style={{padding:"8px 4px",background:"transparent",border:`1px solid ${d.color}44`,borderRadius:8,color:d.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,lineHeight:1.4}}>
              {d.label}<br/><span style={{fontSize:9,color:C.muted,fontWeight:400}}>{d.sub}</span>
            </button>))}
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:8,letterSpacing:"0.5px"}}>CLIENT DEMO ACCOUNTS</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
            {clientDemos.map(d=>(<button key={d.label} onClick={()=>{setEmail(d.email);setPassword(d.password);}} style={{padding:"8px 4px",background:"transparent",border:`1px solid ${d.color}44`,borderRadius:8,color:d.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,lineHeight:1.4}}>
              {d.label}<br/><span style={{fontSize:9,color:C.muted,fontWeight:400}}>{d.sub}</span>
            </button>))}
          </div>
          <div style={{marginTop:12,fontSize:10,color:C.muted,textAlign:"center"}}>Click any account to prefill → then Sign In</div>
        </div>
      </Card>
    </div>
  </div>);
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDashboard({user,listings:allListings,gmb,activity:allActivity}){
  const[page,setPage]=useState("home");
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const{w}=useWindowSize();
  const isMobile=w<768;

  const myListings=allListings?.[user.id]||[];
  const myGmb=gmb?.[user.id];
  const myActivity=(allActivity||[]).filter(a=>a.clientId===user.id);
  const liveCount=myListings.filter(l=>l.status==="live").length;
  const pendingCount=myListings.filter(l=>l.status==="pending").length;
  const mismatchCount=myListings.filter(l=>l.napMatch==="mismatch").length;

  const nav=[{id:"home",icon:"⊞",label:"Dashboard"},{id:"listings",icon:"📋",label:"Listings & Citations"},{id:"gmb",icon:"📍",label:"GMB Management"},{id:"billing",icon:"💳",label:"Billing"},{id:"call",icon:"📞",label:"Book a Call"}];
  const planColors={essentials:C.accent,growth:C.green,gmb:C.purple};
  const planColor=planColors[user.plan]||C.accent;

  const growthData=[{m:"Mar",live:0},{m:"Apr",live:4},{m:"May",live:liveCount-2},{m:"Jun",live:liveCount-1},{m:"Jul",live:liveCount}];
  const napData=[{m:"Mar",score:60},{m:"Apr",score:72},{m:"May",score:81},{m:"Jun",score:user.napScore}];

  const Sidebar=()=>(<div style={{width:isMobile?280:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,...(isMobile?{position:"fixed",top:0,left:sidebarOpen?0:"-300px",height:"100vh",zIndex:200,transition:"left 0.3s",boxShadow:"4px 0 20px rgba(0,0,0,0.5)"}:{})}}>
    <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:900}}><span style={{color:C.accent}}>Rank</span> Orbit</div>
        {isMobile&&<button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>×</button>}
      </div>
      <div style={{marginTop:12,padding:"8px 12px",background:C.accentL,borderRadius:8,border:`1px solid ${C.accent}44`}}>
        <div style={{fontSize:10,color:C.sub,fontWeight:700,letterSpacing:"0.5px"}}>CURRENT PLAN</div>
        <div style={{fontSize:14,fontWeight:800,color:planColor,marginTop:2}}>{user.plan==="essentials"?"Essentials — $49":user.plan==="growth"?"Growth — $89":"GMB Pro — $249"}/mo</div>
        <div style={{fontSize:10,color:C.sub,marginTop:3}}>{user.plan==="essentials"?"10 listings/mo":user.plan==="growth"?"20 listings/mo":"20 listings + GMB"}</div>
      </div>
    </div>
    <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
      {nav.map(item=>(<div key={item.id} onClick={()=>{setPage(item.id);if(isMobile)setSidebarOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer",color:page===item.id?C.text:C.sub,background:page===item.id?C.accentL:"transparent",borderLeft:`3px solid ${page===item.id?C.accent:"transparent"}`,fontWeight:page===item.id?600:400,fontSize:13,transition:"all .15s"}}>
        <span style={{fontSize:15}}>{item.icon}</span><span>{item.label}</span>
        {item.id==="gmb"&&user.plan!=="gmb"&&<span style={{marginLeft:"auto",fontSize:10,color:C.muted}}>🔒</span>}
      </div>))}
    </nav>
    <div style={{padding:"14px 14px 18px",borderTop:`1px solid ${C.border}`}}>
      <div onClick={()=>{setPage("call");if(isMobile)setSidebarOpen(false);}} style={{padding:"9px 0",background:G.purple,borderRadius:8,textAlign:"center",cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff",boxShadow:`0 4px 14px ${C.accentG}`,marginBottom:12}}>📞 Book a Call</div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:G.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{user.avatar}</div>
        <div style={{overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.businessName}</div>
          <div style={{fontSize:10,color:C.sub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
        </div>
      </div>
    </div>
  </div>);

  // CLIENT PAGES
  const HomePage=()=>(<div>
    <div style={{marginBottom:22}}>
      <div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Good morning, {user.name.split(" ")[0]} 👋</div>
      <div style={{fontSize:13,color:C.sub,marginTop:4}}>Here's what Rank Orbit is doing for {user.businessName}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <StatCard label="Listings Live" value={liveCount} sub={`${pendingCount} pending`} color={C.green} icon="🟢" trend={12}/>
      <StatCard label="NAP Score" value={`${user.napScore}%`} sub="Name, Address, Phone" color={C.accent} icon="✅" trend={4}/>
      <StatCard label="Edits Blocked" value="3" sub="Unauthorized reverted" color={C.amber} icon="🛡️"/>
      <StatCard label="Total Dirs" value={myListings.length} sub="across all time" color={C.blue} icon="🌐"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Listings Growth</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:16}}>Directories live over time</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={growthData}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tooltip2/>}/>
            <Area type="monotone" dataKey="live" name="Live" stroke={C.green} fill="url(#cg)" strokeWidth={2.5} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Coverage</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:12}}>of 60 target directories</div>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart><Pie data={[{v:liveCount,c:C.green},{v:pendingCount,c:C.amber},{v:Math.max(0,60-liveCount-pendingCount),c:C.muted}]} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="v" strokeWidth={0}>
            {[C.green,C.amber,C.muted].map((c,i)=><Cell key={i} fill={c}/>)}
          </Pie></PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {[{l:"Live",c:C.green,v:liveCount},{l:"Pending",c:C.amber,v:pendingCount},{l:"Remaining",c:C.muted,v:Math.max(0,60-liveCount-pendingCount)}].map(d=>(<div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:d.c}}/><span style={{fontSize:11,color:C.sub}}>{d.l}</span></div>
            <span style={{fontSize:12,fontWeight:700,color:d.c}}>{d.v}</span>
          </div>))}
        </div>
      </Card>
    </div>
    <Card>
      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Recent Activity</div>
      {myActivity.slice(0,5).map((a,i)=>(<div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<4?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
        <span style={{fontSize:18,flexShrink:0}}>{a.type==="listing_live"?"🟢":a.type==="nap_fix"?"🔧":a.type==="edit_blocked"?"🛡️":a.type==="flagged"?"🚩":"❌"}</span>
        <div><div style={{fontSize:13,color:C.text,fontWeight:500}}>{a.desc}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{a.date} · {a.by}</div></div>
      </div>))}
      {myActivity.length===0&&<div style={{fontSize:13,color:C.sub,textAlign:"center",padding:"20px 0"}}>No activity yet. Your listings are being prepared.</div>}
    </Card>
  </div>);

  const ListingsPage=()=>(<div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Listings & Citations</div>
      <div style={{fontSize:13,color:C.sub,marginTop:4}}>{user.plan==="essentials"?"10 directory submissions/month":user.plan==="growth"?"20 directory submissions/month":"20 directory submissions/month + GMB management"}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <StatCard label="Live" value={liveCount} color={C.green} icon="✅"/>
      <StatCard label="Pending" value={pendingCount} color={C.amber} icon="⏳"/>
      <StatCard label="Issues" value={mismatchCount} color={C.red} icon="⚠️"/>
      <StatCard label="NAP Score" value={`${user.napScore}%`} color={C.accent} icon="📊"/>
    </div>
    {myListings.filter(l=>l.type==="edit_blocked"||l.notes?.includes("Unauthorized")).length>0&&(
      <div style={{background:C.redL,border:`1px solid ${C.red}44`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:12}}>
        <span style={{fontSize:20}}>🛡️</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>Unauthorized edit blocked</div><div style={{fontSize:12,color:C.sub,marginTop:2}}>We detected and reverted an unauthorized change to your Yelp listing.</div></div>
      </div>
    )}
    <Card style={{overflowX:"auto"}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Directory Status</div>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?600:0}}>
        <thead><tr>{["Directory","Status","DA","Submitted","Live Date","NAP","Link"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.7px",borderBottom:`1px solid ${C.border}`,background:"rgba(255,255,255,0.015)"}}>{h}</th>)}</tr></thead>
        <tbody>{myListings.map((d,i)=>(<tr key={d.id} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
          <td style={{padding:"11px 12px",fontSize:13,fontWeight:500,color:C.text,borderBottom:`1px solid ${C.border}`}}>{d.directory}</td>
          <td style={{padding:"11px 12px",borderBottom:`1px solid ${C.border}`}}><Badge type={d.status}/></td>
          <td style={{padding:"11px 12px",fontSize:12,fontWeight:700,color:d.da>=80?C.green:d.da>=60?C.amber:C.sub,borderBottom:`1px solid ${C.border}`}}>{d.da}</td>
          <td style={{padding:"11px 12px",fontSize:12,color:C.sub,borderBottom:`1px solid ${C.border}`}}>{d.submitted}</td>
          <td style={{padding:"11px 12px",fontSize:12,color:d.liveDate==="—"?C.muted:C.green,fontWeight:d.liveDate!=="—"?600:400,borderBottom:`1px solid ${C.border}`}}>{d.liveDate}</td>
          <td style={{padding:"11px 12px",borderBottom:`1px solid ${C.border}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:C.muted}}>—</span>:<Badge type={d.napMatch==="fixed"?"fixed":d.napMatch}/>}</td>
          <td style={{padding:"11px 12px",borderBottom:`1px solid ${C.border}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:12,fontWeight:600,textDecoration:"none"}}>View ↗</a>:<span style={{color:C.muted,fontSize:12}}>—</span>}</td>
        </tr>))}</tbody>
      </table>
    </Card>
  </div>);

  const GmbPage=()=>{
    if(user.plan!=="gmb")return(<div>
      <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>GMB Management</div></div>
      <Card style={{textAlign:"center",padding:50,boxShadow:`0 0 40px ${C.accentG}`}}>
        <div style={{fontSize:40,marginBottom:14}}>📍</div>
        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>Unlock GMB Management</div>
        <div style={{fontSize:13,color:C.sub,maxWidth:380,margin:"0 auto 24px"}}>Monthly GMB posts, Q&A management, profile upkeep, and real engagement analytics. All included in GMB Pro.</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,maxWidth:400,margin:"0 auto 24px"}}>
          {["Monthly GMB posts","Q&A management","Photo uploads","Profile completeness","Engagement analytics","Dedicated BDM"].map((f,i)=>(<div key={i} style={{padding:"9px 12px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12,color:C.sub,display:"flex",gap:6,alignItems:"center"}}><span style={{color:C.green}}>✓</span>{f}</div>))}
        </div>
        <Btn size="lg">Upgrade to GMB Pro — $249/mo</Btn>
        <div style={{fontSize:11,color:C.muted,marginTop:10}}>Includes all Growth plan features.</div>
      </Card>
    </div>);
    const d=myGmb||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],completeness:{}};
    return(<div>
      <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>GMB Management</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>Google Business Profile</div></div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Profile Views" value={d.views.toLocaleString()} color={C.green} icon="👁️" trend={18}/>
        <StatCard label="Calls from Profile" value={d.calls} color={C.accent} icon="📞" trend={12}/>
        <StatCard label="Direction Requests" value={d.directions} color={C.blue} icon="🗺️" trend={9}/>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Engagement Trend</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:16}}>Views, calls, directions over time</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={d.trend}><defs>
            <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
            <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.2}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
            <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.2}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient>
          </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tooltip2/>}/>
            <Area type="monotone" dataKey="v" name="Views" stroke={C.green} fill="url(#gv)" strokeWidth={2.5} dot={false}/>
            <Area type="monotone" dataKey="c" name="Calls" stroke={C.accent} fill="url(#gc)" strokeWidth={2} dot={false}/>
            <Area type="monotone" dataKey="d" name="Directions" stroke={C.blue} fill="url(#gd)" strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Posts This Month</div>
          {d.posts.map((p,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<d.posts.length-1?`1px solid ${C.border}`:"none"}}>
            <div><div style={{fontSize:13,fontWeight:500,color:C.text}}>{p.title}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>Published {p.date}</div></div>
            <Badge type="live"/>
          </div>))}
          {d.posts.length===0&&<div style={{fontSize:12,color:C.sub}}>No posts yet this month</div>}
        </Card>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Profile Completeness</div>
          {Object.entries(d.completeness).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.sub,textTransform:"capitalize"}}>{k.replace(/([A-Z])/g," $1")}</span>
            <span style={{fontSize:12,fontWeight:700,color:v?C.green:C.amber}}>{v?"✓ Done":"○ Needs work"}</span>
          </div>))}
        </Card>
      </div>
    </div>);
  };

  const BillingPage=()=>(<div>
    <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Account & Billing</div></div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16}}>Current Plan</div>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{user.plan==="essentials"?"Essentials":user.plan==="growth"?"Growth":"GMB Pro"}</div>
        <div style={{fontSize:30,fontWeight:900,color:planColor,margin:"6px 0"}}>{user.plan==="essentials"?"$49":user.plan==="growth"?"$89":"$249"}<span style={{fontSize:12,color:C.sub,fontWeight:400}}>/mo</span></div>
        <div style={{height:1,background:C.border,margin:"14px 0"}}/>
        {[["Next billing","August 1, 2025"],["Cycle","Monthly auto-renew"],["Member since","March 1, 2025"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:12,color:C.sub}}>{k}</span><span style={{fontSize:12,fontWeight:600,color:C.text}}>{v}</span>
        </div>))}
        <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
          {user.plan!=="gmb"&&<Btn style={{width:"100%"}}>Upgrade Plan</Btn>}
          <Btn variant="ghost" style={{width:"100%"}}>Cancel Subscription</Btn>
        </div>
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Invoice History</div>
        {["Jul 1","Jun 1","May 1"].map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <div><div style={{fontSize:13,color:C.text}}>{d}, 2025</div><div style={{fontSize:11,color:C.sub}}>{user.plan==="essentials"?"Essentials $49":user.plan==="growth"?"Growth $89":"GMB Pro $249"}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><Badge type="live" label="Paid"/><span style={{color:C.accent,fontSize:12,cursor:"pointer",fontWeight:600}}>PDF</span></div>
        </div>))}
      </Card>
    </div>
  </div>);

  const CallPage=()=>{
    const[selDay,setSelDay]=useState(null);
    const[selTime,setSelTime]=useState(null);
    const[confirmed,setConfirmed]=useState(false);
    const times=["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM"];
    const unavail=["9:30 AM","10:30 AM","2:30 PM"];
    const bookedDays=[3,8,14,22,28];
    const totalDays=31;
    const firstDay=2;
    return(<div>
      <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Book a Call</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>Schedule with your Business Development Manager</div></div>
      {confirmed?(<Card style={{textAlign:"center",padding:40,boxShadow:`0 0 40px rgba(0,229,160,0.2)`}}>
        <div style={{fontSize:40,marginBottom:14}}>✅</div>
        <div style={{fontSize:20,fontWeight:800,color:C.green,marginBottom:8}}>Call Booked!</div>
        <div style={{fontSize:14,color:C.sub,marginBottom:20}}>July {selDay} at {selTime} · 30 minutes with your BDM</div>
        <Btn onClick={()=>{setConfirmed(false);setSelDay(null);setSelTime(null);}}>Schedule Another</Btn>
      </Card>):(
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 1fr",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>July 2025</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.muted,fontWeight:700,padding:"3px 0"}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:totalDays}).map((_,i)=>{
                const day=i+1;const isBooked=bookedDays.includes(day);const isSel=selDay===day;const isPast=day<15;const isWknd=(firstDay+i)%7===0||(firstDay+i)%7===6;
                return(<div key={day} onClick={()=>!isBooked&&!isPast&&!isWknd&&setSelDay(day)} style={{textAlign:"center",padding:"6px 2px",borderRadius:6,fontSize:12,fontWeight:isSel?800:500,cursor:isBooked||isPast||isWknd?"default":"pointer",background:isSel?C.accent:isBooked?C.card2:"transparent",color:isSel?"#fff":isBooked||isPast||isWknd?C.muted:C.text,border:`1px solid ${isSel?C.accent:"transparent"}`,position:"relative"}}>
                  {day}{isBooked&&!isSel&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.red}}/>}
                </div>);
              })}
            </div>
          </Card>
          <Card>
            {selDay?(<>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>July {selDay}, 2025</div>
              <div style={{fontSize:12,color:C.sub,marginBottom:14}}>Select a 30-min slot</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {times.map(t=>{const na=unavail.includes(t);const isSel=selTime===t;
                  return(<div key={t} onClick={()=>!na&&setSelTime(t)} style={{padding:"9px 12px",borderRadius:8,border:`1px solid ${isSel?C.accent:na?C.border:C.border}`,background:isSel?C.accentL:na?"transparent":C.card2,color:isSel?C.accent:na?C.muted:C.text,fontSize:13,fontWeight:isSel?700:400,cursor:na?"default":"pointer",textDecoration:na?"line-through":"none"}}>{t}</div>);
                })}
              </div>
              {selTime&&(<div style={{marginTop:14}}>
                <div style={{padding:12,background:C.greenL,border:`1px solid ${C.green}44`,borderRadius:9,marginBottom:12}}>
                  <div style={{fontSize:12,color:C.green,fontWeight:700}}>✓ July {selDay} at {selTime}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:3}}>30 min with your BDM</div>
                </div>
                <Btn variant="green" style={{width:"100%"}} onClick={()=>setConfirmed(true)}>Confirm Booking</Btn>
              </div>)}
            </>):(<div style={{textAlign:"center",padding:"30px 0",color:C.sub}}>
              <div style={{fontSize:32,marginBottom:10}}>📅</div>
              <div style={{fontSize:13}}>Pick a date on the calendar</div>
            </div>)}
          </Card>
        </div>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>What we'll cover</div>
          {["Listings progress review","NAP score walkthrough","Next month's targets","Questions about your plan"].map((item,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:9,alignItems:"flex-start"}}><span style={{color:C.green,flexShrink:0}}>✓</span><span style={{fontSize:12,color:C.sub,lineHeight:1.5}}>{item}</span></div>))}
          <div style={{height:1,background:C.border,margin:"14px 0"}}/>
          <div style={{fontSize:12,color:C.sub,marginBottom:8}}>Quick message</div>
          <textarea placeholder="Any questions before the call?" style={{width:"100%",padding:"9px 12px",background:"#0A0A14",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12,outline:"none",resize:"none",height:70,boxSizing:"border-box",fontFamily:F}}/>
          <Btn variant="ghost" style={{width:"100%",marginTop:8}}>Send Message</Btn>
        </Card>
      </div>)}
    </div>);
  };

  return(<div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:F,overflow:"hidden",fontSize:14}}>
    <Sidebar/>
    {isMobile&&sidebarOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}} onClick={()=>setSidebarOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isMobile&&<div style={{padding:"14px 16px",background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",lineHeight:1,padding:0}}>☰</button>
        <div style={{fontSize:15,fontWeight:900}}><span style={{color:C.accent}}>Rank</span> Orbit</div>
      </div>}
      <div style={{flex:1,overflow:"auto",padding:isMobile?"16px":"28px"}}>
        {page==="home"&&<HomePage/>}
        {page==="listings"&&<ListingsPage/>}
        {page==="gmb"&&<GmbPage/>}
        {page==="billing"&&<BillingPage/>}
        {page==="call"&&<CallPage/>}
      </div>
    </div>
  </div>);
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({user,allUsers,saveUsers,allListings,saveListings,allActivity,saveActivity,allGmb,saveGmb,onLogout}){
  const[page,setPage]=useState("overview");
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const[selClient,setSelClient]=useState(null);
  const[modal,setModal]=useState(null);
  const{w}=useWindowSize();
  const isMobile=w<768;

  const clients=allUsers?.filter(u=>u.role==="client")||[];
  const staff=allUsers?.filter(u=>u.role!=="client")||[];
  const myActivity=allActivity||[];

  const isAdmin=user.role==="super_admin";
  const isManager=user.role==="super_admin"||user.role==="manager";

  const revenue=clients.reduce((s,c)=>s+(c.plan==="essentials"?49:c.plan==="growth"?89:249),0);
  const totalLive=Object.values(allListings||{}).flat().filter(l=>l.status==="live").length;
  const totalPending=Object.values(allListings||{}).flat().filter(l=>l.status==="pending").length;
  const totalFlagged=Object.values(allListings||{}).flat().filter(l=>l.status==="flagged"||l.status==="rejected").length;

  const revData=[{m:"Mar",r:138},{m:"Apr",r:187},{m:"May",r:187},{m:"Jun",r:revenue},{m:"Jul",r:revenue}];
  const listData=[{m:"Mar",live:12,new:12},{m:"Apr",live:18,new:10},{m:"May",live:26,new:8},{m:"Jun",live:totalLive,new:10}];

  const addActivity=(clientId,type,desc)=>{
    const newA={id:`a${Date.now()}`,clientId,type,desc,date:new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),by:user.name};
    const updated=[newA,...(allActivity||[])];
    saveActivity(updated);
  };

  const updateListing=(clientId,listingId,updates)=>{
    const clientListings=[...(allListings?.[clientId]||[])];
    const idx=clientListings.findIndex(l=>l.id===listingId);
    if(idx>=0){clientListings[idx]={...clientListings[idx],...updates};const updated={...allListings,[clientId]:clientListings};saveListings(updated);}
  };

  const addListing=(clientId,listing)=>{
    const clientListings=[...(allListings?.[clientId]||[])];
    const newL={id:`l${Date.now()}`,clientId,...listing};
    const updated={...allListings,[clientId]:[...clientListings,newL]};
    saveListings(updated);
    addActivity(clientId,"submitted",`${listing.directory} submitted`);
  };

  const updateClient=(id,updates)=>{const updated=(allUsers||[]).map(u=>u.id===id?{...u,...updates}:u);saveUsers(updated);};
  const addUser=(newUser)=>{const updated=[...(allUsers||[]),{id:`u${Date.now()}`,createdAt:new Date().toISOString().split("T")[0],...newUser}];saveUsers(updated);};
  const deleteUser=(id)=>{const updated=(allUsers||[]).filter(u=>u.id!==id);saveUsers(updated);};

  const nav=[
    {id:"overview",icon:"⊞",label:"Overview",roles:["super_admin","manager","agent"]},
    {id:"clients",icon:"👥",label:"Clients",roles:["super_admin","manager","agent"]},
    {id:"listings",icon:"📋",label:"Listings",roles:["super_admin","manager","agent"]},
    {id:"gmb",icon:"📍",label:"GMB",roles:["super_admin","manager"]},
    {id:"team",icon:"🔑",label:"Team",roles:["super_admin"]},
    {id:"activity",icon:"📜",label:"Activity Log",roles:["super_admin","manager"]},
  ].filter(n=>n.roles.includes(user.role));

  // MODALS
  const AddListingModal=({clientId,onClose})=>{
    const[dir,setDir]=useState("");const[url,setUrl]=useState("");const[da,setDa]=useState("");const[notes,setNotes]=useState("");
    const submit=()=>{if(!dir)return;addListing(clientId,{directory:dir,url,status:"submitted",submitted:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),liveDate:"—",napMatch:"—",liveLink:"",da:parseInt(da)||0,notes});onClose();};
    return(<Modal open onClose={onClose} title="Add New Listing">
      <Input label="Directory Name" value={dir} onChange={setDir} placeholder="e.g. Hotfrog"/>
      <Input label="Directory URL" value={url} onChange={setUrl} placeholder="https://hotfrog.com"/>
      <Input label="Domain Authority (DA)" value={da} onChange={setDa} placeholder="e.g. 62" type="number"/>
      <Input label="Notes" value={notes} onChange={setNotes} placeholder="Any notes about this submission"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit}>Add Listing</Btn>
      </div>
    </Modal>);
  };

  const UpdateListingModal=({listing,clientId,onClose})=>{
    const[status,setStatus]=useState(listing.status);
    const[liveLink,setLiveLink]=useState(listing.liveLink||"");
    const[liveDate,setLiveDate]=useState(listing.liveDate||"");
    const[napMatch,setNapMatch]=useState(listing.napMatch||"—");
    const[notes,setNotes]=useState(listing.notes||"");
    const submit=()=>{
      const updates={status,liveLink,liveDate:status==="live"?liveDate||new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}):listing.liveDate,napMatch,notes};
      updateListing(clientId,listing.id,updates);
      if(status==="live"&&listing.status!=="live")addActivity(clientId,"listing_live",`${listing.directory} listing went live`);
      if(status==="rejected"&&listing.status!=="rejected")addActivity(clientId,"rejected",`${listing.directory} listing rejected. ${notes}`);
      if(status==="flagged"&&listing.status!=="flagged")addActivity(clientId,"flagged",`${listing.directory} listing flagged. ${notes}`);
      onClose();
    };
    return(<Modal open onClose={onClose} title={`Update: ${listing.directory}`}>
      <Select label="Status" value={status} onChange={setStatus} options={["submitted","pending","live","rejected","flagged"].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
      <Input label="Live Listing URL" value={liveLink} onChange={setLiveLink} placeholder="https://directory.com/yourbusiness"/>
      <Input label="Live Date" value={liveDate} onChange={setLiveDate} placeholder="e.g. Jul 5"/>
      <Select label="NAP Match" value={napMatch} onChange={setNapMatch} options={[{value:"—",label:"— Pending"},{value:"match",label:"✓ Match"},{value:"mismatch",label:"⚠ Mismatch"},{value:"fixed",label:"⚡ Fixed"}]}/>
      <Input label="Internal Notes" value={notes} onChange={setNotes} placeholder="Rejection reason, fix details, etc."/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit}>Save Changes</Btn>
      </div>
    </Modal>);
  };

  const AddClientModal=({onClose})=>{
    const[form,setForm]=useState({role:"client",plan:"essentials",status:"active"});
    const set=(k,v)=>setForm(f=>({...f,[k]:v}));
    const submit=()=>{
      if(!form.email||!form.name)return;
      addUser({...form,avatar:(form.name||"?")[0].toUpperCase(),password:"client123",napScore:0});
      onClose();
    };
    return(<Modal open onClose={onClose} title="Add New Client" width={540}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} placeholder="Mike Johnson"/>
        <Input label="Business Name" value={form.businessName} onChange={v=>set("businessName",v)} placeholder="Mike's Plumbing"/>
        <Input label="Email" value={form.email} onChange={v=>set("email",v)} placeholder="mike@business.com" type="email"/>
        <Input label="Phone" value={form.phone} onChange={v=>set("phone",v)} placeholder="(555) 200-0000"/>
        <Input label="Website" value={form.website} onChange={v=>set("website",v)} placeholder="mikesplumbing.com"/>
        <Select label="Plan" value={form.plan} onChange={v=>set("plan",v)} options={[{value:"essentials",label:"Essentials $49"},{value:"growth",label:"Growth $89"},{value:"gmb",label:"GMB Pro $249"}]}/>
        <Input label="Address" value={form.address} onChange={v=>set("address",v)} placeholder="123 Main St" style={{gridColumn:"1/-1"}}/>
        <Input label="City" value={form.city} onChange={v=>set("city",v)} placeholder="Austin"/>
        <Input label="State" value={form.state} onChange={v=>set("state",v)} placeholder="TX"/>
      </div>
      <Select label="Business Category" value={form.category} onChange={v=>set("category",v)} options={["Home Services","Medical / Health","Legal","Restaurant / Food","Auto Services","Beauty & Salon","Real Estate","Other"].map(o=>({value:o,label:o}))}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={submit}>Add Client</Btn>
      </div>
    </Modal>);
  };

  const AddTeamModal=({onClose})=>{
    const[form,setForm]=useState({role:"agent"});
    const set=(k,v)=>setForm(f=>({...f,[k]:v}));
    const submit=()=>{if(!form.email||!form.name)return;addUser({...form,avatar:(form.name||"?")[0].toUpperCase(),password:"temp123"});onClose();};
    return(<Modal open onClose={onClose} title="Add Team Member">
      <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} placeholder="Team Member Name"/>
      <Input label="Email" value={form.email} onChange={v=>set("email",v)} placeholder="team@rankorbit.com" type="email"/>
      <Select label="Role" value={form.role} onChange={v=>set("role",v)} options={[{value:"manager",label:"Manager"},{value:"agent",label:"Agent"}]}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit}>Add Member</Btn>
      </div>
    </Modal>);
  };

  const GmbUpdateModal=({client,onClose})=>{
    const existing=allGmb?.[client.id]||{views:0,calls:0,directions:0,trend:[],posts:[],qa:[],photos:0,completeness:{category:false,description:false,hours:false,photo:false,services:false,attributes:false}};
    const[form,setForm]=useState({views:existing.views,calls:existing.calls,directions:existing.directions,postTitle:"",qaQ:"",qaA:""});
    const set=(k,v)=>setForm(f=>({...f,[k]:v}));
    const save=()=>{
      const newTrend=[...existing.trend,{m:new Date().toLocaleString("en-US",{month:"short"}),v:parseInt(form.views)||0,c:parseInt(form.calls)||0,d:parseInt(form.directions)||0}];
      const posts=form.postTitle?[...existing.posts,{title:form.postTitle,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),status:"live"}]:existing.posts;
      const qa=form.qaQ&&form.qaA?[...existing.qa,{q:form.qaQ,a:form.qaA,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}]:existing.qa;
      const updated={...allGmb,[client.id]:{...existing,views:parseInt(form.views)||0,calls:parseInt(form.calls)||0,directions:parseInt(form.directions)||0,trend:newTrend,posts,qa}};
      saveGmb(updated);
      addActivity(client.id,"gmb_update",`GMB data updated for ${client.businessName}`);
      onClose();
    };
    return(<Modal open onClose={onClose} title={`GMB Update: ${client.businessName}`} width={540}>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.7px"}}>Engagement Metrics</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <Input label="Profile Views" value={form.views} onChange={v=>set("views",v)} type="number"/>
        <Input label="Calls" value={form.calls} onChange={v=>set("calls",v)} type="number"/>
        <Input label="Directions" value={form.directions} onChange={v=>set("directions",v)} type="number"/>
      </div>
      <div style={{height:1,background:C.border,margin:"6px 0 14px"}}/>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.7px"}}>Add GMB Post</div>
      <Input label="Post Title" value={form.postTitle} onChange={v=>set("postTitle",v)} placeholder="e.g. Summer Special — 10% Off"/>
      <div style={{height:1,background:C.border,margin:"6px 0 14px"}}/>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.7px"}}>Add Q&A Entry</div>
      <Input label="Customer Question" value={form.qaQ} onChange={v=>set("qaQ",v)} placeholder="e.g. Do you offer emergency services?"/>
      <Input label="Answer" value={form.qaA} onChange={v=>set("qaA",v)} placeholder="Yes, we offer 24/7 emergency..."/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="green" onClick={save}>Save GMB Update</Btn>
      </div>
    </Modal>);
  };

  // ADMIN PAGES
  const Overview=()=>(<div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Platform Overview</div>
      <div style={{fontSize:13,color:C.sub,marginTop:4}}>Welcome back, {user.name}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":isAdmin?"repeat(4,1fr)":"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {isAdmin&&<StatCard label="Monthly Revenue" value={`$${revenue}`} sub={`${clients.length} active clients`} color={C.green} icon="💰" trend={8}/>}
      <StatCard label="Total Clients" value={clients.length} sub="across all plans" color={C.accent} icon="👥"/>
      <StatCard label="Listings Live" value={totalLive} sub={`${totalPending} pending`} color={C.blue} icon="🌐"/>
      <StatCard label="Needs Attention" value={totalFlagged} sub="flagged or rejected" color={C.red} icon="🚩"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:16,marginBottom:16}}>
      {isAdmin?(<Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Revenue Trend</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:16}}>Monthly recurring revenue</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={revData}><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tooltip2/>}/>
            <Area type="monotone" dataKey="r" name="Revenue $" stroke={C.green} fill="url(#rg)" strokeWidth={2.5} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>):(<Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Listings Activity</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:14}}>New live vs total per month</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={listData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tooltip2/>}/>
            <Bar dataKey="new" name="New" fill={C.accent} radius={[4,4,0,0]}/><Bar dataKey="live" name="Total Live" fill={C.green} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>)}
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Plan Distribution</div>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart><Pie data={[{n:"Essentials",v:clients.filter(c=>c.plan==="essentials").length,c:C.accent},{n:"Growth",v:clients.filter(c=>c.plan==="growth").length,c:C.green},{n:"GMB Pro",v:clients.filter(c=>c.plan==="gmb").length,c:C.purple}]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="v" strokeWidth={0}>
            {[C.accent,C.green,C.purple].map((c,i)=><Cell key={i} fill={c}/>)}
          </Pie></PieChart>
        </ResponsiveContainer>
        {[{l:"Essentials $49",c:C.accent,v:clients.filter(c=>c.plan==="essentials").length},{l:"Growth $89",c:C.green,v:clients.filter(c=>c.plan==="growth").length},{l:"GMB Pro $249",c:C.purple,v:clients.filter(c=>c.plan==="gmb").length}].map(d=>(<div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:d.c}}/><span style={{fontSize:11,color:C.sub}}>{d.l}</span></div><span style={{fontSize:12,fontWeight:700,color:d.c}}>{d.v}</span></div>))}
      </Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Listings Activity</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:14}}>New live vs total</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={listData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.sub,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip content={<Tooltip2/>}/>
            <Bar dataKey="new" name="New" fill={C.accent} radius={[4,4,0,0]}/><Bar dataKey="live" name="Total Live" fill={C.green} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Client Status</div>
        {clients.map((c,i)=>(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<clients.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:G.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{c.avatar}</div>
            <div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{c.businessName}</div><div style={{fontSize:10,color:C.sub}}>{c.plan==="essentials"?"$49":c.plan==="growth"?"$89":"$249"}/mo</div></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:C.sub}}>{allListings?.[c.id]?.filter(l=>l.status==="live").length||0} live</span>
            <Badge type={c.status}/>
          </div>
        </div>))}
      </Card>
    </div>
  </div>);

  const ClientsPage=()=>(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Clients</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>{clients.length} active clients</div></div>
      {isManager&&<Btn onClick={()=>setModal("addClient")}>+ Add Client</Btn>}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {clients.map(c=>{
        const cListings=allListings?.[c.id]||[];const live=cListings.filter(l=>l.status==="live").length;const pending=cListings.filter(l=>l.status==="pending").length;const flagged=cListings.filter(l=>l.status==="flagged"||l.status==="rejected").length;
        return(<Card key={c.id} style={{cursor:"pointer"}} onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:G.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>{c.avatar}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.businessName}</div>
                <div style={{fontSize:12,color:C.sub}}>{c.name} · {c.email}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{c.city}, {c.state} · {c.category}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.green}}>{live}</div><div style={{fontSize:10,color:C.sub}}>Live</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.amber}}>{pending}</div><div style={{fontSize:10,color:C.sub}}>Pending</div></div>
              {flagged>0&&<div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.red}}>{flagged}</div><div style={{fontSize:10,color:C.sub}}>Flagged</div></div>}
              <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:C.text}}>{c.napScore}%</div><div style={{fontSize:10,color:C.sub}}>NAP</div></div>
              <Badge type={c.plan==="essentials"?"submitted":c.plan==="growth"?"active":"live"} label={c.plan==="essentials"?"$49/mo":c.plan==="growth"?"$89/mo":"$249/mo"}/>
              <span style={{color:C.accent,fontSize:12,fontWeight:600}}>View →</span>
            </div>
          </div>
        </Card>);
      })}
    </div>
  </div>);

  const ClientDetailPage=()=>{
    const c=clients.find(cl=>cl.id===selClient);if(!c)return null;
    const cListings=allListings?.[c.id]||[];
    const[addListingOpen,setAddListingOpen]=useState(false);
    const[updateListing2,setUpdateListing2]=useState(null);
    const[gmbOpen,setGmbOpen]=useState(false);
    const[napScore,setNapScore]=useState(c.napScore||0);

    return(<div>
      {addListingOpen&&<AddListingModal clientId={c.id} onClose={()=>setAddListingOpen(false)}/>}
      {updateListing2&&<UpdateListingModal listing={updateListing2} clientId={c.id} onClose={()=>setUpdateListing2(null)}/>}
      {gmbOpen&&<GmbUpdateModal client={c} onClose={()=>setGmbOpen(false)}/>}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{setPage("clients");setSelClient(null);}} style={{background:"none",border:"none",color:C.sub,fontSize:13,cursor:"pointer",padding:0}}>← Clients</button>
        <span style={{color:C.muted}}>/</span>
        <div style={{fontSize:isMobile?16:20,fontWeight:900,color:C.text}}>{c.businessName}</div>
        <Badge type={c.status}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:20}}>
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Business Info</div>
          {[[" Plan",c.plan==="essentials"?"Essentials $49":c.plan==="growth"?"Growth $89":"GMB Pro $249"],[" Email",c.email],[" Phone",c.phone],[" Address",`${c.address}, ${c.city}, ${c.state}`],[" Website",c.website],[" Category",c.category]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.sub,flexShrink:0}}>{k}</span><span style={{fontSize:12,color:C.text,fontWeight:500,textAlign:"right",wordBreak:"break-all"}}>{v}</span>
          </div>))}
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>NAP Consistency</div>
          </div>
          <div style={{fontSize:42,fontWeight:900,color:napScore>=90?C.green:napScore>=70?C.amber:C.red,textAlign:"center",padding:"10px 0"}}>{napScore}%</div>
          <input type="range" min="0" max="100" value={napScore} onChange={e=>setNapScore(parseInt(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
          <Btn style={{width:"100%",marginTop:12}} onClick={()=>updateClient(c.id,{napScore})}>Save NAP Score</Btn>
          <div style={{marginTop:14,padding:"10px 12px",background:C.redL,border:`1px solid ${C.red}44`,borderRadius:9,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}} onClick={()=>{addActivity(c.id,"edit_blocked","Unauthorized edit blocked and reverted");updateClient(c.id,{});window.alert("Unauthorized edit logged and reverted for "+c.businessName);}}>
            <span>🛡️</span><span style={{fontSize:12,color:C.red,fontWeight:600}}>Log Unauthorized Edit + Revert</span>
          </div>
        </Card>
      </div>

      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Listings ({cListings.length})</div>
          <div style={{display:"flex",gap:8}}>
            {c.plan==="gmb"&&<Btn variant="ghost" size="sm" onClick={()=>setGmbOpen(true)}>📍 Update GMB</Btn>}
            <Btn size="sm" onClick={()=>setAddListingOpen(true)}>+ Add Listing</Btn>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
            <thead><tr>{["Directory","Status","DA","Submitted","Live Date","NAP","Live Link","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.6px",borderBottom:`1px solid ${C.border}`,background:"rgba(255,255,255,0.015)"}}>{h}</th>)}</tr></thead>
            <tbody>{cListings.map((d,i)=>(<tr key={d.id} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
              <td style={{padding:"10px 12px",fontSize:12,fontWeight:500,color:C.text,borderBottom:`1px solid ${C.border}`}}>{d.directory}</td>
              <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}><Badge type={d.status}/></td>
              <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:d.da>=80?C.green:d.da>=60?C.amber:C.sub,borderBottom:`1px solid ${C.border}`}}>{d.da}</td>
              <td style={{padding:"10px 12px",fontSize:12,color:C.sub,borderBottom:`1px solid ${C.border}`}}>{d.submitted}</td>
              <td style={{padding:"10px 12px",fontSize:12,color:d.liveDate==="—"?C.muted:C.green,fontWeight:d.liveDate!=="—"?600:400,borderBottom:`1px solid ${C.border}`}}>{d.liveDate}</td>
              <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:C.muted}}>—</span>:<Badge type={d.napMatch==="fixed"?"fixed":d.napMatch}/>}</td>
              <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}>{d.liveLink?<a href={d.liveLink} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:11,textDecoration:"none",fontWeight:600}}>View ↗</a>:<span style={{color:C.muted,fontSize:11}}>—</span>}</td>
              <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}>
                <button onClick={()=>setUpdateListing2(d)} style={{padding:"4px 10px",background:C.accentL,border:`1px solid ${C.accent}44`,borderRadius:6,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F}}>Update</button>
              </td>
            </tr>))}</tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Activity Log for {c.businessName}</div>
        {(allActivity||[]).filter(a=>a.clientId===c.id).map((a,i)=>(<div key={a.id} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
          <span style={{fontSize:16,flexShrink:0}}>{a.type==="listing_live"?"🟢":a.type==="nap_fix"?"🔧":a.type==="edit_blocked"?"🛡️":a.type==="flagged"?"🚩":a.type==="gmb_update"?"📍":"❌"}</span>
          <div><div style={{fontSize:12,color:C.text,fontWeight:500}}>{a.desc}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{a.date} · {a.by}</div></div>
        </div>))}
      </Card>
    </div>);
  };

  const AllListingsPage=()=>{
    const allFlat=Object.entries(allListings||{}).flatMap(([cId,ls])=>ls.map(l=>({...l,_clientId:cId,_clientName:clients.find(c=>c.id===cId)?.businessName||"?"})));
    const[filter,setFilter]=useState("all");
    const filtered=filter==="all"?allFlat:allFlat.filter(l=>l.status===filter);
    return(<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>All Listings</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>{allFlat.length} total across {clients.length} clients</div></div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {["all","live","pending","submitted","flagged","rejected"].map(s=>(<button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===s?C.accent:C.border}`,background:filter===s?C.accentL:"transparent",color:filter===s?C.accent:C.sub,fontSize:12,fontWeight:filter===s?700:400,cursor:"pointer",fontFamily:F}}>{s.charAt(0).toUpperCase()+s.slice(1)} {s==="all"?`(${allFlat.length})`:s==="live"?`(${allFlat.filter(l=>l.status==="live").length})`:s==="pending"?`(${allFlat.filter(l=>l.status==="pending").length})`:s==="submitted"?`(${allFlat.filter(l=>l.status==="submitted").length})`:s==="flagged"?`(${allFlat.filter(l=>l.status==="flagged").length})`:s==="rejected"?`(${allFlat.filter(l=>l.status==="rejected").length})`:""}</button>))}
      </div>
      <Card style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}>
          <thead><tr>{["Client","Directory","Status","DA","Live Date","NAP","Action"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.6px",borderBottom:`1px solid ${C.border}`,background:"rgba(255,255,255,0.015)"}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((d,i)=>(<tr key={`${d._clientId}-${d.id}`} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
            <td style={{padding:"10px 12px",fontSize:12,color:C.sub,borderBottom:`1px solid ${C.border}`}}>{d._clientName}</td>
            <td style={{padding:"10px 12px",fontSize:12,fontWeight:500,color:C.text,borderBottom:`1px solid ${C.border}`}}>{d.directory}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}><Badge type={d.status}/></td>
            <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:d.da>=80?C.green:d.da>=60?C.amber:C.sub,borderBottom:`1px solid ${C.border}`}}>{d.da}</td>
            <td style={{padding:"10px 12px",fontSize:12,color:d.liveDate==="—"?C.muted:C.green,borderBottom:`1px solid ${C.border}`}}>{d.liveDate}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}>{d.napMatch==="—"?<span style={{fontSize:11,color:C.muted}}>—</span>:<Badge type={d.napMatch==="fixed"?"fixed":d.napMatch}/>}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`}}>
              <button onClick={()=>{setSelClient(d._clientId);setPage("clientDetail");}} style={{padding:"4px 10px",background:C.accentL,border:`1px solid ${C.accent}44`,borderRadius:6,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F}}>Edit</button>
            </td>
          </tr>))}</tbody>
        </table>
      </Card>
    </div>);
  };

  const GmbPage2=()=>{
    const gmbClients=clients.filter(c=>c.plan==="gmb");
    return(<div>
      <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>GMB Management</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>{gmbClients.length} GMB Pro clients</div></div>
      {gmbClients.length===0&&<Card><div style={{textAlign:"center",padding:"30px 0",color:C.sub,fontSize:13}}>No GMB Pro clients yet</div></Card>}
      {gmbClients.map(c=>{const d=allGmb?.[c.id];return(<Card key={c.id} style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.businessName}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:2}}>{d?`${d.views} views · ${d.calls} calls · ${d.directions} directions this month`:"No GMB data yet"}</div>
            {d&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>{d.posts?.length||0} posts · {d.qa?.length||0} Q&A</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" onClick={()=>{setSelClient(c.id);setPage("clientDetail");}}>View Client</Btn>
            <Btn size="sm" variant="green" onClick={()=>setModal({type:"gmb",client:c})}>Update GMB</Btn>
          </div>
        </div>
      </Card>);})}
      {modal?.type==="gmb"&&<GmbUpdateModal client={modal.client} onClose={()=>setModal(null)}/>}
    </div>);
  };

  const TeamPage=()=>(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Team</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>{staff.length} team members</div></div>
      <Btn onClick={()=>setModal("addTeam")}>+ Add Member</Btn>
    </div>
    {staff.map(m=>(<Card key={m.id} style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:m.role==="super_admin"?G.purple:m.role==="manager"?G.amber:G.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{m.avatar}</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{m.name}</div>
            <div style={{fontSize:12,color:C.sub}}>{m.email}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Badge type={m.role==="super_admin"?"live":m.role==="manager"?"pending":"submitted"} label={m.role==="super_admin"?"Super Admin":m.role==="manager"?"Manager":"Agent"}/>
          {m.id!==user.id&&m.role!=="super_admin"&&<Btn variant="danger" size="sm" onClick={()=>deleteUser(m.id)}>Remove</Btn>}
        </div>
      </div>
    </Card>))}
    <div style={{marginTop:16,padding:16,background:C.card2,borderRadius:12,border:`1px solid ${C.border}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>ROLE PERMISSIONS</div>
      {[{r:"Super Admin",c:C.accent,p:"Full access: clients, listings, GMB, team management, billing"},{r:"Manager",c:C.amber,p:"Clients, listings, GMB. Cannot manage team or billing."},{r:"Agent",c:C.green,p:"View clients, update listing statuses only."}].map(({r,c,p})=>(<div key={r} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}><div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0,marginTop:4}}/><div><span style={{fontSize:12,fontWeight:700,color:c}}>{r}: </span><span style={{fontSize:12,color:C.sub}}>{p}</span></div></div>))}
    </div>
  </div>);

  const ActivityPage=()=>(<div>
    <div style={{marginBottom:20}}><div style={{fontSize:isMobile?18:22,fontWeight:900,color:C.text}}>Activity Log</div><div style={{fontSize:13,color:C.sub,marginTop:4}}>All platform events</div></div>
    <Card>
      {[...(allActivity||[])].reverse().map((a,i)=>(<div key={a.id} style={{display:"flex",gap:14,padding:"11px 0",borderBottom:i<allActivity.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
        <span style={{fontSize:18,flexShrink:0}}>{a.type==="listing_live"?"🟢":a.type==="nap_fix"?"🔧":a.type==="edit_blocked"?"🛡️":a.type==="flagged"?"🚩":a.type==="gmb_update"?"📍":a.type==="rejected"?"❌":a.type==="submitted"?"📤":"⚡"}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
            <div style={{fontSize:13,color:C.text,fontWeight:500}}>{a.desc}</div>
            <div style={{fontSize:11,color:C.sub,flexShrink:0}}>{a.date}</div>
          </div>
          <div style={{fontSize:11,color:C.sub,marginTop:2}}>Client: {clients.find(c=>c.id===a.clientId)?.businessName||a.clientId} · By: {a.by}</div>
        </div>
      </div>))}
      {(!allActivity||allActivity.length===0)&&<div style={{textAlign:"center",padding:"30px 0",color:C.sub,fontSize:13}}>No activity yet</div>}
    </Card>
  </div>);

  const AdminSidebar=()=>(<div style={{width:isMobile?260:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,...(isMobile?{position:"fixed",top:0,left:sidebarOpen?0:"-300px",height:"100vh",zIndex:200,transition:"left 0.3s",boxShadow:"4px 0 20px rgba(0,0,0,0.5)"}:{})}}>
    <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:900}}><span style={{color:C.accent}}>Rank</span> Orbit <span style={{fontSize:10,color:C.red,fontWeight:700,marginLeft:4,padding:"2px 6px",background:C.redL,borderRadius:4}}>ADMIN</span></div>
        {isMobile&&<button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>×</button>}
      </div>
      <div style={{marginTop:10,fontSize:11,color:C.sub}}>Role: <span style={{color:C.accent,fontWeight:700}}>{user.role==="super_admin"?"Super Admin":user.role==="manager"?"Manager":"Agent"}</span></div>
    </div>
    <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
      {nav.map(item=>(<div key={item.id} onClick={()=>{setPage(item.id);if(isMobile)setSidebarOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer",color:page===item.id||page==="clientDetail"&&item.id==="clients"?C.text:C.sub,background:page===item.id||page==="clientDetail"&&item.id==="clients"?C.accentL:"transparent",borderLeft:`3px solid ${page===item.id||page==="clientDetail"&&item.id==="clients"?C.accent:"transparent"}`,fontWeight:page===item.id?600:400,fontSize:13,transition:"all .15s"}}>
        <span style={{fontSize:15}}>{item.icon}</span><span>{item.label}</span>
        {item.id==="listings"&&totalFlagged>0&&<span style={{marginLeft:"auto",background:C.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:800,padding:"2px 7px"}}>{totalFlagged}</span>}
      </div>))}
    </nav>
    <div style={{padding:"14px 14px 18px",borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:G.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{user.avatar}</div>
        <div style={{overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
          <div style={{fontSize:10,color:C.sub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
        </div>
      </div>
      <Btn variant="ghost" size="sm" style={{width:"100%"}} onClick={onLogout}>Sign Out</Btn>
    </div>
  </div>);

  return(<div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:F,overflow:"hidden",fontSize:14}}>
    {modal==="addClient"&&<AddClientModal onClose={()=>setModal(null)}/>}
    {modal==="addTeam"&&<AddTeamModal onClose={()=>setModal(null)}/>}
    <AdminSidebar/>
    {isMobile&&sidebarOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}} onClick={()=>setSidebarOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isMobile&&<div style={{padding:"13px 16px",background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",lineHeight:1,padding:0}}>☰</button>
        <div style={{fontSize:15,fontWeight:900}}><span style={{color:C.accent}}>Rank</span> Orbit <span style={{fontSize:9,color:C.red,fontWeight:700,padding:"2px 5px",background:C.redL,borderRadius:3,marginLeft:3}}>ADMIN</span></div>
      </div>}
      <div style={{flex:1,overflow:"auto",padding:isMobile?"16px":"28px"}}>
        {page==="overview"&&<Overview/>}
        {page==="clients"&&<ClientsPage/>}
        {page==="clientDetail"&&<ClientDetailPage/>}
        {page==="listings"&&<AllListingsPage/>}
        {page==="gmb"&&<GmbPage2/>}
        {page==="team"&&<TeamPage/>}
        {page==="activity"&&<ActivityPage/>}
      </div>
    </div>
  </div>);
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App(){
  const[ready,setReady]=useState(false);
  const[currentUser,setCurrentUser]=useState(null);
  const[users,saveUsers,uLoading]=useDB("ro_users");
  const[listings,saveListings,lLoading]=useDB("ro_listings");
  const[gmb,saveGmb,gLoading]=useDB("ro_gmb");
  const[activity,saveActivity,aLoading]=useDB("ro_activity");

  useEffect(()=>{initDB();setReady(true);},[]);

  if(!ready||uLoading||lLoading||gLoading||aLoading)return(
    <div style={{height:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,fontFamily:F}}>
      <div style={{fontSize:24,fontWeight:900}}><span style={{color:C.accent}}>Rank</span> Orbit</div>
      <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:13,color:C.sub}}>Loading platform...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(!currentUser)return <AuthScreen onLogin={u=>setCurrentUser(u)}/>;

  if(currentUser.role==="client"){
    return <ClientDashboard user={currentUser} listings={listings} gmb={gmb} activity={activity}/>;
  }

  return <AdminDashboard user={currentUser} allUsers={users} saveUsers={saveUsers} allListings={listings} saveListings={saveListings} allActivity={activity} saveActivity={saveActivity} allGmb={gmb} saveGmb={saveGmb} onLogout={()=>setCurrentUser(null)}/>;
}
