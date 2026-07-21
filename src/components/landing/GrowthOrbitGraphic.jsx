import { T, FONT_D, SHADOW_LG } from "../../lib/theme";

/** Coded CTA visual — laptop + orbit nodes (no stock/cutout image). */
export function GrowthOrbitGraphic({ isMobile }) {
  const stage = isMobile ? 300 : 400;
  const nodes = [
    { label: "Store", angle: -110, icon: "store", delay: "0s" },
    { label: "Maps", angle: -40, icon: "pin", delay: "0.4s" },
    { label: "AI", angle: 25, icon: "ai", delay: "0.8s" },
    { label: "Reviews", angle: 95, icon: "star", delay: "1.2s" },
    { label: "Secure", angle: 155, icon: "shield", delay: "0.6s" },
  ];
  const r = isMobile ? 42 : 44;

  return (
    <div
      role="img"
      aria-label="Business dashboard connected to maps, AI search, and local listings"
      style={{
        position: "relative",
        width: stage,
        height: stage * 1.02,
        margin: "0 auto",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: "6%",
          transform: "translateX(-50%)",
          width: "70%",
          height: "18%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,.35) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {[1, 0.72, 0.48].map((scale, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "46%",
            width: stage * scale * 0.92,
            height: stage * scale * 0.92,
            marginLeft: -(stage * scale * 0.92) / 2,
            marginTop: -(stage * scale * 0.92) / 2,
            borderRadius: "50%",
            border: i === 1 ? `1.5px dashed rgba(255,255,255,${0.28})` : `1.5px solid rgba(255,255,255,${0.16 - i * 0.02})`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              animation: `${i % 2 ? "orbitSpinR" : "orbitSpin"} ${18 + i * 5}s linear infinite`,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: i === 1 ? T.green : "#7EC8FF",
                boxShadow: `0 0 10px ${i === 1 ? T.green : "#7EC8FF"}`,
              }}
            />
          </div>
        </div>
      ))}

      {nodes.map((n) => {
        const rad = (n.angle * Math.PI) / 180;
        const left = 50 + r * Math.cos(rad);
        const top = 46 + r * Math.sin(rad);
        return (
          <div
            key={n.label}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%,-50%)",
              zIndex: 4,
            }}
          >
            <div style={{ animation: `ctaFloatY 3.2s ease-in-out ${n.delay} infinite` }}>
              <div
                style={{
                  width: isMobile ? 40 : 46,
                  height: isMobile ? 40 : 46,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: SHADOW_LG,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,.9)",
                }}
              >
                <NodeIcon name={n.icon} size={isMobile ? 18 : 20} />
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%,-50%)",
          zIndex: 3,
          width: isMobile ? "72%" : "68%",
        }}
      >
        <div style={{ animation: "ctaFloatY 4s ease-in-out infinite" }}>
          <LaptopMock />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: isMobile ? 4 : 10,
          bottom: isMobile ? "10%" : "12%",
          zIndex: 5,
        }}
      >
        <div
          style={{
            animation: "ctaFloatY 3.6s ease-in-out 0.5s infinite",
            background: "#fff",
            borderRadius: 12,
            padding: "8px 11px",
            boxShadow: SHADOW_LG,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="30" height="24" viewBox="0 0 30 24" aria-hidden>
            <rect x="2" y="13" width="5.5" height="9" rx="1.5" fill={T.blue} />
            <rect x="10" y="8" width="5.5" height="14" rx="1.5" fill={T.brand} />
            <rect x="18" y="3" width="5.5" height="19" rx="1.5" fill={T.green} />
            <path d="M4 15.5 12.5 8.5 21 4" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 4h4.5v4" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.green, letterSpacing: ".3px" }}>GROWTH</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, fontFamily: FONT_D, lineHeight: 1.1 }}>Live listings</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ctaFloatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function NodeIcon({ name, size }) {
  if (name === "store") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3.5 9.5 5 5h14l1.5 4.5" stroke={T.brand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 9.5h16v2.2c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V9.5z" fill={`${T.brand}18`} stroke={T.brand} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5.5 13.7V20h13v-6.3" stroke={T.brand} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 20v-4.2h4V20" stroke={T.brand} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8 7.2h.01M12 7.2h.01M16 7.2h.01" stroke={T.brand} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21.5s6.5-5.2 6.5-11.2a6.5 6.5 0 1 0-13 0c0 6 6.5 11.2 6.5 11.2z"
          fill={`${T.green}20`}
          stroke={T.green}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.2" r="2.6" fill={T.green} />
        <circle cx="12" cy="10.2" r="1.1" fill="#fff" />
      </svg>
    );
  }
  if (name === "ai") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="4.5" width="14" height="12.5" rx="3.5" fill={`${T.violet}18`} stroke={T.violet} strokeWidth="1.7" />
        <path d="M12 4.5V2.8" stroke={T.violet} strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="12" cy="2.2" r="1" fill={T.violet} />
        <circle cx="9" cy="10" r="1.35" fill={T.violet} />
        <circle cx="15" cy="10" r="1.35" fill={T.violet} />
        <path d="M9.2 13.2c.8.7 1.9 1.1 2.8 1.1s2-.4 2.8-1.1" stroke={T.violet} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.5 17.2 12 20.2l3.5-3" stroke={T.violet} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3.2l2.55 5.17 5.7.83-4.12 4.02.97 5.67L12 16.2l-5.1 2.69.97-5.67-4.12-4.02 5.7-.83L12 3.2z"
          fill="#F5B942"
          stroke="#E8A020"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.8 19.2 6v5.4c0 4.7-3.2 8.2-7.2 9.8-4-1.6-7.2-5.1-7.2-9.8V6L12 2.8z"
        fill={`${T.green}22`}
        stroke={T.green}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.8 11.6l2.2 2.2 4.3-4.4" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LaptopMock() {
  return (
    <svg viewBox="0 0 320 240" width="100%" style={{ display: "block", width: "100%", height: "auto", filter: "drop-shadow(0 22px 40px rgba(0,0,0,.4))" }} aria-hidden>
      <rect x="48" y="18" width="224" height="148" rx="12" fill="#1A1A2E" />
      <rect x="56" y="26" width="208" height="124" rx="6" fill="#0F1224" />
      <rect x="66" y="36" width="54" height="54" rx="8" fill="#1E2340" />
      <circle cx="93" cy="63" r="18" fill="none" stroke={T.brand} strokeWidth="5" strokeDasharray="70 40" strokeLinecap="round" transform="rotate(-90 93 63)" />
      <circle cx="93" cy="63" r="18" fill="none" stroke={T.violet} strokeWidth="5" strokeDasharray="35 75" strokeLinecap="round" strokeDashoffset="-70" transform="rotate(-90 93 63)" />
      <rect x="128" y="36" width="126" height="54" rx="8" fill="#1E2340" />
      <polyline points="138,72 158,58 178,64 198,48 218,52 240,40" fill="none" stroke={T.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="240" cy="40" r="3" fill={T.green} />
      <rect x="66" y="98" width="90" height="42" rx="7" fill="#1E2340" />
      <circle cx="78" cy="112" r="4" fill={T.green} />
      <path d="M76 112l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="88" y="109" width="52" height="5" rx="2" fill="rgba(255,255,255,.25)" />
      <circle cx="78" cy="126" r="4" fill={T.green} />
      <path d="M76 126l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="88" y="123" width="40" height="5" rx="2" fill="rgba(255,255,255,.18)" />
      <rect x="164" y="98" width="90" height="42" rx="7" fill="#1E2340" />
      <rect x="176" y="122" width="10" height="10" rx="2" fill={T.blue} />
      <rect x="192" y="114" width="10" height="18" rx="2" fill={T.brand} />
      <rect x="208" y="108" width="10" height="24" rx="2" fill={T.green} />
      <rect x="224" y="116" width="10" height="16" rx="2" fill="#7EC8FF" />
      <path d="M28 178h264l12 28H16l12-28z" fill="#C8CDD8" />
      <rect x="120" y="186" width="80" height="6" rx="3" fill="#A8B0C0" />
      <ellipse cx="160" cy="210" rx="110" ry="8" fill="rgba(0,0,0,.2)" />
    </svg>
  );
}
