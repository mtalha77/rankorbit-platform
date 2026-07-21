import { T } from "../../lib/theme";
import { BrandMark } from "./BrandMark";

function OrbitIcon({ name, bg, fg, size, label }) {
  return (
    <div
      title={label || name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg || "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,.35), 0 0 0 2px rgba(255,255,255,.12)",
        flexShrink: 0,
      }}
    >
      {name ? (
        <BrandMark name={name} size={Math.round(size * 0.48)} color={fg || "#fff"} />
      ) : (
        <span style={{ fontSize: size * 0.28, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1 }}>{label}</span>
      )}
    </div>
  );
}

/** One ring: static circle + equally spaced upright icons on that exact radius */
function OrbitRing({ items, radiusPct, duration, reverse, iconSize }) {
  const dir = reverse ? "orbitSpinR" : "orbitSpin";
  const counter = reverse ? "orbitSpin" : "orbitSpinR";
  const n = items.length;
  const sizePct = radiusPct * 2;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        marginLeft: `-${sizePct / 2}%`,
        marginTop: `-${sizePct / 2}%`,
        pointerEvents: "none",
      }}
    >
      {/* Path — edge of this box = icon path (r = 50% of box) */}
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 0 }}
      >
        <circle
          cx="50"
          cy="50"
          r="50"
          fill="none"
          stroke="rgba(184,184,255,.45)"
          strokeWidth="1.2"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </svg>

      {/* Icons only — slight left nudge; orbit SVG stays put */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          transform: "translateX(-16px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: `${dir} ${duration}s linear infinite`,
          }}
        >
          {items.map((item, i) => {
            // Equal angles, start at top (−90°)
            const rad = ((360 / n) * i - 90) * (Math.PI / 180);
            const x = 50 + 50 * Math.cos(rad);
            const y = 50 + 50 * Math.sin(rad);
            return (
              <div
                key={`${item.label || item.name}-${i}`}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 0,
                  height: 0,
                  animation: `${counter} ${duration}s linear infinite`,
                }}
              >
                <div style={{ transform: "translate(-50%, -50%)" }}>
                  <OrbitIcon {...item} size={iconSize} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NumbersOrbitGraphic({ isMobile }) {
  const iconSm = isMobile ? 32 : 38;
  const iconLg = isMobile ? 36 : 44;

  // Unique icons only — no duplicates across rings (avoids overlap look)
  const outer = [
    { name: "Apple", bg: "#111", fg: "#fff", label: "Apple" },
    { name: "Google", bg: "#fff", fg: "#4285F4", label: "Google" },
    { name: "Facebook", bg: "#1877F2", fg: "#fff", label: "Facebook" },
    { name: "Instagram", bg: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", fg: "#fff", label: "Instagram" },
    { name: "TikTok", bg: "#010101", fg: "#fff", label: "TikTok" },
    { name: "Snapchat", bg: "#FFFC00", fg: "#111", label: "Snapchat" },
    { name: "Edge", bg: "linear-gradient(135deg,#0ED3B2,#087BE6)", fg: "#fff", label: "Microsoft Edge" },
    { name: null, bg: "#00B206", fg: "#fff", label: "n" },
    { name: null, bg: "#6001D2", fg: "#fff", label: "y!" },
    { name: "Yelp", bg: "#FF1A1A", fg: "#fff", label: "Yelp" },
  ];

  const inner = [
    { name: "ChatGPT", bg: "#10A37F", fg: "#fff", label: "ChatGPT" },
    { name: "Gemini", bg: "#fff", fg: T.violet, label: "Gemini" },
    { name: "Bing", bg: "#008373", fg: "#fff", label: "Bing" },
    { name: "AIO", bg: T.brand, fg: "#fff", label: "AI" },
    { name: null, bg: "#FF3008", fg: "#fff", label: "DD" },
    { name: null, bg: "#0F9D58", fg: "#fff", label: "Maps" },
  ];

  return (
    <div
      role="img"
      aria-label="NAP Orbit connected across maps, directories, and AI platforms"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: isMobile ? 340 : 520,
        aspectRatio: "1",
        margin: "0 auto",
        overflow: "visible",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "65%",
          height: "65%",
          marginLeft: "-32.5%",
          marginTop: "-32.5%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.brand}40 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* radiusPct = distance from center to line, as % of stage */}
      <OrbitRing items={outer} radiusPct={49} duration={50} reverse={false} iconSize={iconLg} />
      <OrbitRing items={inner} radiusPct={31} duration={34} reverse iconSize={iconSm} />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 5,
          width: isMobile ? 70 : 88,
          height: isMobile ? 70 : 88,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 30%, #4A47A8 0%, #2A2870 55%, #171732 100%)",
          border: "2px solid rgba(184,184,255,.35)",
          boxShadow: `0 12px 36px rgba(0,0,0,.45), 0 0 0 8px rgba(91,91,214,.15), 0 0 40px ${T.brand}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/favicon-source.png"
          alt="NAP Orbit"
          style={{
            width: isMobile ? 40 : 52,
            height: isMobile ? 40 : 52,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
