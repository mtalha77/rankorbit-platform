import { T, FONT_D } from "../../lib/theme";

export function LandingMarquee({ isMobile }) {
  return (
    <div
      role="presentation"
      style={{
        position: "relative",
        background: T.ink,
        borderTop: `1px solid rgba(255,255,255,.08)`,
        borderBottom: `1px solid rgba(255,255,255,.08)`,
        overflow: "hidden",
        padding: isMobile ? "12px 0" : "14px 0",
        marginTop: 0,
      }}
    >
      <div className="marqueeTrack" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 28 : 40,
              paddingRight: isMobile ? 28 : 40,
              whiteSpace: "nowrap",
              fontFamily: FONT_D,
              fontSize: isMobile ? 13 : 15,
              fontWeight: 700,
              letterSpacing: ".02em",
              color: "rgba(255,255,255,.88)",
            }}
          >
            {[
              "Get started and grow your business now with NAP Orbit",
              "Get discovered by customers worldwide",
              "Get started and grow your business now with NAP Orbit",
              "Get discovered by customers worldwide",
            ].map((line, i) => (
              <span key={`${copy}-${i}`} style={{display: "inline-flex", alignItems: "center", gap: isMobile ? 28 : 40}}>
                <span style={{color: i % 2 === 0 ? "#fff" : T.green}}>{line}</span>
                <span style={{width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0, opacity: 0.9}} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <span style={{position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)"}}>
        Get started and grow your business now with NAP Orbit. Get discovered by customers worldwide.
      </span>
    </div>
  );
}
