import { T, FONT_D } from "../../lib/theme";

const PHRASES = ["Get discovered by customers", "Get started now"];

// Enough items so one copy is always wider than the viewport — otherwise
// translateX(-50%) leaves a blank gap and the loop visibly jumps.
const ITEMS_PER_COPY = 12;

export function LandingMarquee({ isMobile }) {
  const gap = isMobile ? 28 : 40;

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
              flexShrink: 0,
              gap,
              paddingRight: gap,
              whiteSpace: "nowrap",
              fontFamily: FONT_D,
              fontSize: isMobile ? 13 : 15,
              fontWeight: 700,
              letterSpacing: ".02em",
              color: "rgba(255,255,255,.88)",
            }}
          >
            {Array.from({ length: ITEMS_PER_COPY }, (_, i) => {
              const line = PHRASES[i % PHRASES.length];
              return (
                <span
                  key={`${copy}-${i}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: i % 2 === 0 ? "#fff" : T.green }}>{line}</span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: T.brand,
                      flexShrink: 0,
                      opacity: 0.9,
                    }}
                  />
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Get discovered by customers. Get started now.
      </span>
    </div>
  );
}
