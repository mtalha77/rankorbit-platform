// ─── GLOBAL STYLE ────────────────────────────────────────────────────────────
import { T, FONT_B, SHADOW_LG } from "../lib/theme";

export function GlobalStyle(){
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
    @keyframes revealUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .marqueeTrack{display:flex;width:max-content;animation:marquee 32s linear infinite}
    @keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .reveal{opacity:0}
    .reveal.in{animation:revealUp .7s cubic-bezier(.22,.8,.36,1) both}
    .lift{transition:transform .3s cubic-bezier(.22,.8,.36,1),box-shadow .3s}
    .lift:hover{transform:translateY(-6px)}
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
