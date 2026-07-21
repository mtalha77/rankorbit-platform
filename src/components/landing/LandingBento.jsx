import { T, FONT_D } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { BrandMark } from "./BrandMark";

function BrandChip({ name, color, size = 36, iconSize = 16, style }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 6px 18px rgba(23,23,50,.10), 0 1px 3px rgba(23,23,50,.06)",
        border: "1px solid rgba(23,23,50,.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <BrandMark name={name} size={iconSize} color={color} />
    </div>
  );
}

function FeatureCard({ num, label, badge, badgeBg, badgeColor, iconBg, icon, title, body, isMobile }) {
  return (
    <div
      className="lift"
      style={{
        background: "#fff",
        border: `1px solid ${T.line}`,
        borderRadius: 20,
        padding: isMobile ? "16px 14px" : "18px 16px",
        boxShadow: "0 2px 12px rgba(23,23,50,.05)",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 6px 14px ${iconBg}55`,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: T.faint, letterSpacing: ".5px" }}>
            {num} - {label}
          </div>
          <div
            style={{
              padding: "4px 9px",
              borderRadius: 20,
              background: badgeBg,
              color: badgeColor,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".3px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {badge}
          </div>
        </div>
        <div style={{ fontFamily: FONT_D, fontSize: isMobile ? 16 : 17, fontWeight: 800, color: T.ink, marginBottom: 4, letterSpacing: "-.3px" }}>
          {title}
        </div>
        <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}

function MapGraphic({ isMobile }) {
  const stage = isMobile ? 270 : 320;
  // Positions match reference: Apple L, Yelp top, Facebook TR, Bing BR, Google BL
  const chips = [
    { name: "Apple", color: "#111", left: "8%", top: "28%" },
    { name: "Yelp", color: "#FF1A1A", left: "42%", top: "4%" },
    { name: "Facebook", color: "#1877F2", left: "78%", top: "18%" },
    { name: "Bing", color: "#008373", left: "76%", top: "68%" },
    { name: "Google", color: null, left: "12%", top: "72%" },
  ];

  return (
    <div
      style={{
        position: "relative",
        width: stage,
        height: stage,
        margin: "0 auto",
        overflow: "visible",
      }}
    >
      {/* Soft ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "18% 12% 22%",
          background: "radial-gradient(ellipse at 50% 45%, rgba(120,160,255,.22), rgba(180,210,255,.08) 45%, transparent 72%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      {/* Perspective map grid */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "54%",
          width: "88%",
          height: "62%",
          transform: "translate(-50%, -50%) perspective(720px) rotateX(56deg) rotateZ(-6deg)",
          transformOrigin: "center center",
          borderRadius: 18,
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(140,180,255,.18), transparent 60%),
            linear-gradient(180deg, rgba(235,242,255,.9), rgba(245,248,252,.4))
          `,
          boxShadow: "0 28px 50px rgba(90,120,200,.10)",
          overflow: "hidden",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 200 140" preserveAspectRatio="none" style={{ display: "block", opacity: 0.85 }}>
          <defs>
            <linearGradient id="bentoGridStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8EB4FF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#A8C4F0" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={10 + i * 15} x2="200" y2={10 + i * 15} stroke="url(#bentoGridStroke)" strokeWidth="0.8" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={10 + i * 18} y1="0" x2={10 + i * 18} y2="140" stroke="url(#bentoGridStroke)" strokeWidth="0.8" />
          ))}
          {/* Soft route glow lines */}
          <path d="M20 95 C55 70, 90 110, 130 55 S180 40, 190 70" fill="none" stroke="#7BA3FF" strokeWidth="1.6" strokeOpacity="0.35" strokeLinecap="round" />
          <path d="M30 40 C70 50, 100 20, 150 45 S185 90, 175 110" fill="none" stroke="#9BC0FF" strokeWidth="1.2" strokeOpacity="0.28" strokeLinecap="round" />
        </svg>
      </div>

      {/* Soft dashed orbit rings */}
      {[0.98, 0.78, 0.58].map((scale, i) => {
        const d = stage * scale * 0.72;
        return (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "48%",
              width: d,
              height: d,
              marginLeft: -d / 2,
              marginTop: -d / 2,
              borderRadius: "50%",
              border: "1.5px dashed rgba(140,168,220,.38)",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Brand chips — fixed like reference */}
      {chips.map((b) => (
        <div
          key={b.name}
          style={{
            position: "absolute",
            left: b.left,
            top: b.top,
            zIndex: 3,
          }}
        >
          <div
            style={{
              animation: "floaty 5.5s ease-in-out infinite",
              animationDelay:
                b.name === "Yelp" ? "0s" : b.name === "Apple" ? ".4s" : b.name === "Facebook" ? ".8s" : b.name === "Google" ? "1.2s" : "1.6s",
            }}
          >
            <BrandChip name={b.name} color={b.color} size={isMobile ? 34 : 38} iconSize={isMobile ? 15 : 17} />
          </div>
        </div>
      ))}

      {/* Business card */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%, -50%)",
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#fff",
            borderRadius: 16,
            padding: "13px 15px",
            boxShadow: "0 18px 44px rgba(23,23,50,.14), 0 4px 12px rgba(23,23,50,.06)",
            border: "1px solid rgba(23,23,50,.06)",
            minWidth: isMobile ? 168 : 186,
            animation: "floaty 6s ease-in-out infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: T.brandSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M10 21v-6h4v6" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, fontFamily: FONT_D, letterSpacing: "-.2px" }}>Your Business</div>
              <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginTop: 2 }}>123 Main St, City</div>
              <div style={{ fontSize: 11, color: T.faint, fontWeight: 600 }}>(555) 123-4567</div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: -5,
              bottom: -5,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: T.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(15,164,122,.4)",
              border: "2.5px solid #fff",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingBento({ isMobile }) {
  const avatars = [
    "/trust-avatar-1.png",
    "/trust-avatar-2.png",
    "/trust-avatar-3.png",
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? "40px 16px" : "64px 24px", width: "100%", boxSizing: "border-box" }}>
      <Reveal>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${T.line}`,
            borderRadius: isMobile ? 24 : 28,
            padding: isMobile ? "28px 18px" : "36px 36px 32px",
            boxShadow: "0 8px 32px rgba(23,23,50,.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr 1.1fr",
              gap: isMobile ? 28 : 24,
              alignItems: "center",
            }}
          >
            {/* Left copy */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: T.violetSoft,
                  color: T.violet,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".2px",
                  marginBottom: 16,
                }}
              >
                Why it matters
              </div>
              <h2
                style={{
                  fontFamily: FONT_D,
                  fontSize: isMobile ? 28 : 34,
                  fontWeight: 800,
                  letterSpacing: "-1.1px",
                  margin: "0 0 12px",
                  lineHeight: 1.15,
                  color: T.ink,
                }}
              >
                Bad business data costs{" "}
                <span style={{ color: T.brand }}>real customers.</span>
              </h2>
              <p
                style={{
                  fontSize: isMobile ? 14.5 : 15.5,
                  color: T.sub,
                  lineHeight: 1.6,
                  margin: "0 0 22px",
                  maxWidth: 340,
                }}
              >
                Inaccurate or inconsistent information means missed opportunities. We help you fix that.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {avatars.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2.5px solid #fff",
                        marginLeft: i === 0 ? 0 : -12,
                        zIndex: avatars.length - i,
                        boxShadow: "0 2px 8px rgba(23,23,50,.12)",
                        display: "block",
                        background: T.surface2,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub }}>Trusted by 1,000+ businesses</div>
              </div>
            </div>

            {/* Center graphic */}
            <div style={{ order: isMobile ? 3 : 2 }}>
              <MapGraphic isMobile={isMobile} />
            </div>

            {/* Right feature cards — circular icons like reference */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, order: isMobile ? 2 : 3 }}>
              <FeatureCard
                isMobile={isMobile}
                num="01"
                label="CONSISTENCY"
                badge="ALL MATCHED"
                badgeBg={T.greenSoft}
                badgeColor={T.green}
                iconBg={T.green}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                }
                title="Stay correct everywhere"
                body="Name, address and phone stay identical across every platform so search engines trust you."
              />
              <FeatureCard
                isMobile={isMobile}
                num="02"
                label="PROTECTION"
                badge="24/7 ACTIVE"
                badgeBg={T.violetSoft}
                badgeColor={T.violet}
                iconBg={T.violet}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12.2l2 2 4.2-4.5" />
                  </svg>
                }
                title="Reverse harmful edits"
                body="When someone changes your hours or address, we catch it and put the correct details back."
              />
              <FeatureCard
                isMobile={isMobile}
                num="03"
                label="VISIBILITY"
                badge="500+ DIRECTORIES"
                badgeBg={T.blueSoft}
                badgeColor={T.blue}
                iconBg={T.blue}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                }
                title="Get listed everywhere"
                body="Reach customers across maps, directories, apps and AI-powered local search."
              />
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
