// ─── ORBIT BRAND MARKS ───────────────────────────────────────────────────────
import { T, FONT_D } from "../lib/theme";

export function Orbit({size=120,speed=14}){
  const s=size;
  return(<div style={{width:s,height:s,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.18,borderRadius:"50%",border:`1.5px dashed ${T.line}`}}/>
    <div style={{position:"absolute",inset:s*0.36,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:FONT_D,fontWeight:800,fontSize:s*0.16,boxShadow:`0 6px 18px ${T.brandGlow}`}}>RO</div>
    <div style={{position:"absolute",inset:0,animation:`orbitSpin ${speed}s linear infinite`}}><div style={{position:"absolute",top:-4,left:"50%",width:9,height:9,marginLeft:-4.5,borderRadius:"50%",background:T.green,boxShadow:"0 0 0 3px "+T.greenSoft}}/></div>
    <div style={{position:"absolute",inset:s*0.18,animation:`orbitSpinR ${speed*0.7}s linear infinite`}}><div style={{position:"absolute",bottom:-4,left:"50%",width:8,height:8,marginLeft:-4,borderRadius:"50%",background:T.brand,boxShadow:"0 0 0 3px "+T.brandSoft}}/></div>
  </div>);
}
export function MiniOrbit({size=30}){
  return(<div style={{width:size,height:size,position:"relative",flexShrink:0}}>
    <div style={{position:"absolute",inset:size*0.22,borderRadius:"50%",background:`linear-gradient(135deg,${T.brand},${T.violet})`}}/>
    <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.line}`}}/>
    <div style={{position:"absolute",inset:0,animation:"orbitSpin 8s linear infinite"}}><div style={{position:"absolute",top:-2.5,left:"50%",width:6,height:6,marginLeft:-3,borderRadius:"50%",background:T.green}}/></div>
  </div>);
}
