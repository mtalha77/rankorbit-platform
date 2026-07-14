// ─── HOOKS ───────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { T, SHADOW_LG } from "../lib/theme";

export function useWindowSize(){
  const[w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}
export function useCounter(target,dur=900){
  const[val,setVal]=useState(()=>{
    const n=typeof target==="number"?target:parseFloat(target)||0;
    return n||0;
  });
  const prev=useRef(null);
  useEffect(()=>{
    const n=typeof target==="number"?target:parseFloat(target)||0;
    // Skip re-animating the same number (stops dashboard flicker on re-render).
    if(prev.current===n){setVal(n||0);return;}
    prev.current=n;
    if(!n){setVal(0);return;}
    let start=null,raf;
    const step=(ts)=>{if(!start)start=ts;const p=Math.min((ts-start)/dur,1);const e=1-Math.pow(1-p,3);setVal(Math.round(n*e));if(p<1)raf=requestAnimationFrame(step);};
    raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
  },[target,dur]);
  return val;
}
export function useToast(){
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
