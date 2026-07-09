// ─── REVEAL (scroll-in animation) ────────────────────────────────────────────
import { useState, useEffect } from "react";

// Adds .in when the element scrolls into view (bold landing animations).
export function Reveal({children,delay=0,style={},as="div"}){
  const[el,setEl]=useState(null);
  useEffect(()=>{
    if(!el)return;
    const io=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.12});
    io.observe(el);return()=>io.disconnect();
  },[el]);
  const Tag=as;
  return<Tag ref={setEl} className="reveal" style={{animationDelay:`${delay}ms`,...style}}>{children}</Tag>;
}
