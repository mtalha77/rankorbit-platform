// ─── HOOKS ───────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { toast as sonnerToast } from "sonner";

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

/** Popup notifications via sonner. Same API: toast(msg) / toast(msg, "info"|"warn"|"success"|"error") */
export function useToast(){
  const push=useCallback((msg,kind="success")=>{
    const text=String(msg||"");
    if(!text)return;
    if(kind==="info")sonnerToast.message(text);
    else if(kind==="warn")sonnerToast.warning(text);
    else if(kind==="error")sonnerToast.error(text);
    else sonnerToast.success(text);
  },[]);
  // Global <Toaster /> lives in App.jsx — keep empty component so call sites stay unchanged.
  const Toasts=useCallback(()=>null,[]);
  return[push,Toasts];
}
