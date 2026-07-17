import { useState, useEffect } from "react";
import { T, FONT_D, SHADOW } from "../../lib/theme";
import { useCounter } from "../../hooks";

export function Eyebrow({ children, color = T.brand }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 15px", background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: 30, fontSize: 12.5, fontWeight: 800, letterSpacing: ".4px", color, marginBottom: 18, boxShadow: SHADOW }}>{children}</div>
  );
}

export function Ico({ d, c = T.brand, s = 24 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}

export function StatNumberCard({ value, suffix, title, sub, accent, icon, suffixColor, splitSuffix, isMobile }) {
  const [el, setEl] = useState(null);
  const [go2, setGo2] = useState(false);
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      e.forEach((x) => {
        if (x.isIntersecting) {
          setGo2(true);
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  const v = useCounter(go2 ? value : 0, 1400);
  return (
    <div ref={setEl} style={{ background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.08)`, borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: "18px 16px 16px", backdropFilter: "blur(6px)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Ico d={icon} c={accent} s={17} />
      </div>
      <div style={{ fontFamily: FONT_D, fontSize: isMobile ? 30 : 36, fontWeight: 800, color: "#fff", letterSpacing: "-1.2px", lineHeight: 1, marginBottom: 8 }}>
        {splitSuffix ? (<>{v}<span style={{ color: suffixColor || accent }}>{suffix}</span></>) : (<>{v}<span style={{ color: suffixColor || accent }}>{suffix}</span></>)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 500, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}
