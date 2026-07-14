// ─── UI ATOMS ────────────────────────────────────────────────────────────────
// Reusable presentational primitives used across all pages.
import { useState } from "react";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../lib/theme";
import { exportCSV, exportXLSX, exportPDF } from "../lib/export";
import { useWindowSize, useCounter } from "../hooks";

export const Badge=({type,label})=>{
  const map={live:{bg:T.greenSoft,c:T.green,t:"Live"},pending:{bg:T.amberSoft,c:T.amber,t:"Pending"},rejected:{bg:T.redSoft,c:T.red,t:"Rejected"},flagged:{bg:T.redSoft,c:T.red,t:"Flagged"},fixed:{bg:T.blueSoft,c:T.blue,t:"NAP Fixed"},match:{bg:T.greenSoft,c:T.green,t:"✓ Match"},mismatch:{bg:T.redSoft,c:T.red,t:"Mismatch"},submitted:{bg:T.brandSoft,c:T.brand,t:"Submitted"},active:{bg:T.greenSoft,c:T.green,t:"Active"},suspended:{bg:T.redSoft,c:T.red,t:"Suspended"},paid:{bg:T.greenSoft,c:T.green,t:"Paid"},manual:{bg:T.amberSoft,c:T.amber,t:"Manual data"},connected:{bg:T.greenSoft,c:T.green,t:"Connected"}};
  const s=map[type]||map.submitted;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 11px",borderRadius:20,fontSize:11.5,fontWeight:700,background:s.bg,color:s.c}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:s.c,animation:type==="live"?"pulseDot 2.4s ease-in-out infinite":"none"}}/>{label||s.t}
  </span>);
};
export const Card=({children,style={},hover=false,className=""})=>(
  <div className={`${hover?"hoverCard ":""}${className}`} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:18,padding:22,boxShadow:SHADOW,...style}}>{children}</div>
);
export const Btn=({children,onClick,variant="primary",size="md",style={},disabled=false,title})=>{
  const v={primary:{background:`linear-gradient(135deg,${T.brand},${T.brandDark})`,color:"#fff",border:"none",boxShadow:`0 4px 14px ${T.brandGlow}`},
    ghost:{background:T.surface,color:T.sub,border:`1px solid ${T.line}`},
    soft:{background:T.brandSoft,color:T.brand,border:"none"},
    green:{background:`linear-gradient(135deg,${T.green},#0B8A67)`,color:"#fff",border:"none",boxShadow:"0 4px 14px rgba(15,164,122,.22)"},
    danger:{background:T.redSoft,color:T.red,border:"none"}};
  const s={sm:{padding:"6px 14px",fontSize:12.5},md:{padding:"10px 20px",fontSize:13.5},lg:{padding:"13px 30px",fontSize:15}};
  return(<button title={title} onClick={disabled?undefined:onClick} disabled={disabled} style={{borderRadius:11,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,fontFamily:FONT_B,...v[variant],...s[size],...style}}>{children}</button>);
};
// Input with optional validation. validate="email" | "usphone". Shows inline error, blocks bad input.
export const Input=({label,value,onChange,placeholder,type="text",style={},validate,required,error:extError,maxLength})=>{
  const[touched,setTouched]=useState(false);
  const fmtPhone=(raw)=>{
    const d=raw.replace(/\D/g,"").slice(0,11);
    const n=d.length===11&&d[0]==="1"?d.slice(1):d;
    if(n.length<=3)return n.length?`(${n}`:"";
    if(n.length<=6)return `(${n.slice(0,3)}) ${n.slice(3)}`;
    return `(${n.slice(0,3)}) ${n.slice(3,6)}-${n.slice(6,10)}`;
  };
  const handle=(v)=>{
    if(validate==="usphone")onChange(fmtPhone(v));
    else onChange(maxLength?v.slice(0,maxLength):v);
  };
  let err="";
  if(touched&&value){
    if(validate==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))err="Enter a valid email address";
    if(validate==="usphone"&&value.replace(/\D/g,"").length<10)err="Enter a valid US/Canada number";
  }
  err=extError||err||"";
  return(<div style={{marginBottom:14,...style}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}{required&&<span style={{color:T.red}}> *</span>}</label>}
    <input type={validate==="email"?"email":type} inputMode={validate==="usphone"?"tel":undefined} value={value??""} onChange={e=>handle(e.target.value)} onBlur={()=>setTouched(true)} placeholder={placeholder} maxLength={maxLength}
      style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${err?T.red:T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}/>
    {err&&<div style={{fontSize:11,color:T.red,marginTop:5,fontWeight:600}}>{err}</div>}
  </div>);
};
export const Select=({label,value,onChange,options})=>(
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:11.5,color:T.sub,fontWeight:700,display:"block",marginBottom:6,letterSpacing:".4px"}}>{label.toUpperCase()}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"11px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:11,color:T.ink,fontSize:13.5,boxSizing:"border-box",fontFamily:FONT_B}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
export const Modal=({open,onClose,title,children,width=500})=>{
  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(23,23,50,.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="pop" style={{background:T.surface,borderRadius:20,padding:26,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:SHADOW_LG}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:17,fontWeight:800,fontFamily:FONT_D}}>{title}</div>
        <button onClick={onClose} style={{background:T.surface2,border:"none",color:T.sub,fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:"50%"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
};
export const Confirm=({data,onClose})=>{
  if(!data)return null;
  return(<Modal open onClose={onClose} title={data.title} width={420}>
    <div style={{fontSize:13.5,color:T.sub,lineHeight:1.6,marginBottom:20}}>{data.msg}</div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant={data.danger?"danger":"primary"} onClick={async()=>{
        try{
          await data.onYes();
          onClose();
        }catch{
          /* keep open on failure — caller should toast */
        }
      }}>{data.yes||"Confirm"}</Btn>
    </div>
  </Modal>);
};
export const StatCard=({label,value,sub,color=T.brand,soft=T.brandSoft,icon,trend,delay=0})=>{
  const isNum=/^\d+/.test(String(value));
  const n=isNum?parseInt(String(value).replace(/[^0-9]/g,"")):0;
  const suffix=isNum?String(value).replace(/^[\d,]+/,""):"";
  const count=useCounter(n);
  return(<Card hover style={{position:"relative",overflow:"hidden"}}>
    <div style={{width:46,height:46,borderRadius:14,background:soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:14}}>{icon}</div>
    <div style={{fontSize:11.5,fontWeight:800,color:T.faint,textTransform:"uppercase",letterSpacing:".9px",marginBottom:6}}>{label}</div>
    <div style={{fontSize:36,fontWeight:800,color:T.ink,lineHeight:1,fontFamily:FONT_D,letterSpacing:"-1px"}}>{isNum?count.toLocaleString()+suffix:value}</div>
    {sub&&<div style={{fontSize:12.5,color:T.sub,marginTop:7}}>{sub}</div>}
    {trend!=null&&<div style={{fontSize:12,color:trend>0?T.green:T.red,marginTop:5,fontWeight:700}}>{trend>0?"▲":"▼"} {Math.abs(trend)}% vs last month</div>}
    <div style={{position:"absolute",top:-30,right:-30,width:90,height:90,borderRadius:"50%",background:soft,opacity:.5}}/>
  </Card>);
};
export const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.ink,borderRadius:10,padding:"9px 13px",boxShadow:SHADOW_LG}}>
    <div style={{fontSize:11,color:"#B8BBD4",marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:12.5,color:"#fff",fontWeight:700}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:p.color,marginRight:6}}/>{p.name}: {p.value}</div>)}
  </div>);
};

// Reusable toolbar: search box + optional dropdown filters + CSV/XLSX/PDF export.
// filters: [{label, value, set, options:[{value,label}]}]
export function ListToolbar({search,setSearch,filters=[],rows,cols,exportName,exportTitle,placeholder="Search…"}){
  const w=useWindowSize();const isMobile=w<820;
  return(<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder}
      style={{flex:isMobile?"1 1 100%":"1 1 220px",minWidth:0,padding:"9px 14px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:13,fontFamily:FONT_B,color:T.ink,boxSizing:"border-box"}}/>
    {filters.map((f,i)=>(
      <select key={i} value={f.value} onChange={e=>f.set(e.target.value)}
        style={{padding:"9px 12px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:12.5,fontFamily:FONT_B,color:T.ink,cursor:"pointer"}}>
        {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ))}
    {cols&&rows&&(<div style={{display:"flex",gap:6,marginLeft:isMobile?0:"auto"}}>
      <ExportBtn label="CSV" onClick={()=>exportCSV(rows,cols,exportName)}/>
      <ExportBtn label="Excel" onClick={()=>exportXLSX(rows,cols,exportName)}/>
      <ExportBtn label="PDF" onClick={()=>exportPDF(rows,cols,exportName,exportTitle)}/>
    </div>)}
  </div>);
}
export const ExportBtn=({label,onClick})=>(
  <button onClick={onClick} title={`Download ${label}`} style={{padding:"8px 12px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:9,fontSize:12,fontWeight:700,color:T.sub,cursor:"pointer",fontFamily:FONT_B,display:"inline-flex",alignItems:"center",gap:5}}>
    <span style={{fontSize:12}}>⤓</span>{label}
  </button>
);

export const SectionTitle=({children,sub,right})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:8,flexWrap:"wrap"}}>
    <div>
      <div style={{fontSize:16.5,fontWeight:800,fontFamily:FONT_D,color:T.ink,letterSpacing:"-.3px"}}>{children}</div>
      {sub&&<div style={{fontSize:13,color:T.sub,marginTop:3,lineHeight:1.45}}>{sub}</div>}
    </div>
    {right}
  </div>
);
export const Empty=({icon,title,sub})=>(
  <div style={{textAlign:"center",padding:"36px 16px",color:T.sub}}>
    <div style={{fontSize:36,marginBottom:10,animation:"floaty 3s ease-in-out infinite"}}>{icon}</div>
    <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>{title}</div>
    <div style={{fontSize:12.5}}>{sub}</div>
  </div>
);

export const PageHead=({title,sub,right,isMobile})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
    <div>
      <div style={{fontFamily:FONT_D,fontSize:isMobile?24:30,fontWeight:800,letterSpacing:"-.8px",lineHeight:1.1}}>{title}</div>
      {sub&&<div style={{fontSize:isMobile?13.5:15,color:T.sub,marginTop:5,lineHeight:1.5}}>{sub}</div>}
    </div>
    {right}
  </div>
);
