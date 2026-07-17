import { T, FONT_D, FONT_B } from "../../lib/theme";
import { BrandMark } from "./BrandMark";

export function PublisherNetworkSVG({isMobile}){
  const W=isMobile?320:460, H=isMobile?340:420;
  const cx=W/2, cy=H/2;
  const R=isMobile?120:160;
  const nodeR=isMobile?26:30;
  // Evenly spaced around the hub. label used only for the small caption under each mark.
  const nodes=[
    {mark:"Google",label:"Google",angle:-90,ai:false},
    {mark:"Apple",label:"Apple",angle:-45,ai:false},
    {mark:"Yelp",label:"Yelp",angle:0,ai:false},
    {mark:"Bing",label:"Bing",angle:45,ai:false},
    {mark:"ChatGPT",label:"ChatGPT",angle:90,ai:true},
    {mark:"Gemini",label:"Gemini",angle:135,ai:true},
    {mark:"AIO",label:"AI Overviews",angle:180,ai:true},
    {mark:"Facebook",label:"Facebook",angle:225,ai:false},
  ];
  const pt=(a)=>[cx+R*Math.cos(a*Math.PI/180), cy+R*Math.sin(a*Math.PI/180)];
  const hubR=isMobile?42:50;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",maxWidth:W,margin:"0 auto"}} role="img" aria-label="NAP Orbit connecting to 200+ publishers and AI engines">
      <defs>
        <radialGradient id="hubGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={T.brand}/><stop offset="100%" stopColor={T.violet}/>
        </radialGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.brand} stopOpacity="0.45"/><stop offset="100%" stopColor={T.brand} stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      {/* connection lines + animated pulse dots */}
      {nodes.map((n,i)=>{const[x,y]=pt(n.angle);const dur=2.6+i*0.16;return(
        <g key={n.label}>
          <line x1={cx} y1={cy} x2={x} y2={y} stroke="url(#lineGrad)" strokeWidth="1.5"/>
          <circle r="3" fill={n.ai?T.violet:T.brand}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M${cx},${cy} L${x},${y}`}/>
            <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} repeatCount="indefinite"/>
          </circle>
        </g>);})}
      {/* outer logo nodes, caption sits BELOW the circle so nothing overflows */}
      {nodes.map((n)=>{const[x,y]=pt(n.angle);return(
        <g key={n.label+"-node"}>
          <circle cx={x} cy={y} r={nodeR} fill={T.surface} stroke={n.ai?T.violetSoft:T.line} strokeWidth="1.5" style={{filter:"drop-shadow(0 2px 6px rgba(23,23,50,0.06))"}}/>
          <g transform={`translate(${x-(isMobile?11:13)},${y-(isMobile?11:13)})`}><BrandMark name={n.mark} size={isMobile?22:26} color={n.ai?T.violet:T.sub}/></g>
          <text x={x} y={y+nodeR+13} textAnchor="middle" fontSize={isMobile?8.5:9.5} fontWeight="700" fill={n.ai?T.violet:T.faint} fontFamily={FONT_B}>{n.label}</text>
        </g>);})}
      {/* center hub */}
      <circle cx={cx} cy={cy} r={hubR} fill="none" stroke={T.brand} strokeOpacity="0.3" strokeWidth="2">
        <animate attributeName="r" values={`${hubR};${hubR+10};${hubR}`} dur="3s" repeatCount="indefinite"/>
        <animate attributeName="stroke-opacity" values="0.35;0;0.35" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx={cx} cy={cy} r={hubR} fill="url(#hubGrad)"/>
      <text x={cx} y={cy-3} textAnchor="middle" fontSize={isMobile?14:16} fontWeight="800" fill="#fff" fontFamily={FONT_D}>NAP</text>
      <text x={cx} y={cy+13} textAnchor="middle" fontSize={isMobile?10:11} fontWeight="700" fill="#fff" fillOpacity="0.9" fontFamily={FONT_B}>Orbit</text>
    </svg>
  );
}
