import { useEffect, useRef, useState } from "react";
import { T, FONT_D, SHADOW } from "../../lib/theme";
import { Reveal } from "../Reveal";

const GOLD = "#F4B400";
const GAP = 16;
const SLIDE_MS = 700;
const HOLD_MS = 5500;

function GoldStars({ size = 16 }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path fill={GOLD} d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.1 3.6 1.6-6.8L2 9.1l7-.6z" />
        </svg>
      ))}
    </div>
  );
}

const FEATURED = {
  quote: "We were getting calls at an old number for months. NAP Orbit fixed it everywhere in a week—the phone actually rings now.",
  name: "Mike D.",
  meta: "Plumbing · Austin, Texas",
  letter: "M",
  badge: "PHONE FIXED",
};

const SIDE_REVIEWS = [
  {
    quote: "I check one dashboard and everything is simply handled.",
    name: "Sarah M.",
    meta: "Dental clinic · Houston, Texas",
    letter: "S",
    badge: "TIME SAVED",
    badgeTone: "green",
    accent: T.green,
  },
  {
    quote: "They caught a harmful hours change before it cost us again.",
    name: "John D.",
    meta: "Auto repair · Dallas, Texas",
    letter: "J",
    badge: "EDIT PROTECTED",
    badgeTone: "violet",
    accent: T.brand,
  },
  {
    quote: "Our Google listing had the wrong address for years. NAP Orbit corrected it across every directory.",
    name: "Elena R.",
    meta: "HVAC · San Antonio, Texas",
    letter: "E",
    badge: "NAP FIXED",
    badgeTone: "green",
    accent: T.green,
  },
  {
    quote: "I used to spend Sundays updating listings. Now I open the app once a week and it’s already done.",
    name: "Chris P.",
    meta: "Landscaping · Phoenix, Arizona",
    letter: "C",
    badge: "TIME SAVED",
    badgeTone: "green",
    accent: T.green,
  },
  {
    quote: "Someone changed our hours overnight. NAP Orbit flagged it and reverted it before we lost bookings.",
    name: "Priya K.",
    meta: "Salon · Atlanta, Georgia",
    letter: "P",
    badge: "EDIT PROTECTED",
    badgeTone: "violet",
    accent: T.brand,
  },
  {
    quote: "ChatGPT started recommending us after our listings stayed consistent.",
    name: "Marcus T.",
    meta: "Roofing · Denver, Colorado",
    letter: "M",
    badge: "AI DISCOVERY",
    badgeTone: "brand",
    accent: T.violet,
  },
  {
    quote: "We manage three locations. One login, one NAP source of truth—no more mismatched phones.",
    name: "Lisa W.",
    meta: "Med spa · Miami, Florida",
    letter: "L",
    badge: "MULTI-LOCATION",
    badgeTone: "brand",
    accent: T.brand,
  },
  {
    quote: "Apple Maps finally matched Google. Customers stopped arguing about which address was right.",
    name: "Omar H.",
    meta: "Electrician · Chicago, Illinois",
    letter: "O",
    badge: "SYNCED",
    badgeTone: "green",
    accent: T.green,
  },
];

function badgeColors(tone) {
  if (tone === "violet") return { bg: T.violetSoft, color: T.violet };
  if (tone === "brand") return { bg: T.brandSoft, color: T.brand };
  return { bg: T.greenSoft, color: T.green };
}

function SideCard({ r, isMobile }) {
  const b = badgeColors(r.badgeTone);
  return (
    <div
      className="lift"
      style={{
        background: "#fff",
        border: `1px solid ${T.line}`,
        borderLeft: `4px solid ${r.accent}`,
        borderRadius: 20,
        padding: isMobile ? 20 : 24,
        boxShadow: SHADOW,
        height: "100%",
        minHeight: isMobile ? 188 : 210,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <GoldStars size={14} />
        <span style={{ padding: "4px 10px", borderRadius: 20, background: b.bg, color: b.color, fontSize: 10.5, fontWeight: 800, letterSpacing: ".3px", whiteSpace: "nowrap" }}>{r.badge}</span>
      </div>
      <p style={{ fontSize: 15.5, fontWeight: 600, color: T.ink, lineHeight: 1.55, margin: "0 0 16px", flex: 1 }}>“{r.quote}”</p>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${T.brand},${T.violet})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 15 }}>{r.letter}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: T.faint }}>{r.meta}</div>
        </div>
      </div>
    </div>
  );
}

/** Vertical stack: top exits up, bottom moves up, new enters from below */
function SideReviewStack({ isMobile }) {
  const [idx, setIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [cardH, setCardH] = useState(isMobile ? 188 : 210);
  const measureRef = useRef(null);
  const n = SIDE_REVIEWS.length;

  // Measure first visible card height for pixel-perfect slide
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setCardH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, idx]);

  useEffect(() => {
    if (animating) return undefined;
    const hold = setTimeout(() => {
      setAnimating(true);
      setOffset(-(cardH + GAP));
    }, HOLD_MS);
    return () => clearTimeout(hold);
  }, [idx, animating, cardH]);

  const onTransitionEnd = () => {
    if (!animating) return;
    setIdx((i) => (i + 1) % n);
    setAnimating(false);
    setOffset(0);
  };

  const cards = [0, 1, 2].map((i) => SIDE_REVIEWS[(idx + i) % n]);
  const viewportH = cardH * 2 + GAP;

  return (
    <div style={{ position: "relative", height: viewportH, overflow: "hidden" }}>
      <div
        onTransitionEnd={onTransitionEnd}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: GAP,
          transform: `translateY(${offset}px)`,
          transition: animating ? `transform ${SLIDE_MS}ms cubic-bezier(.22,.8,.36,1)` : "none",
          willChange: "transform",
        }}
      >
        {cards.map((r, i) => (
          <div
            key={r.name}
            ref={i === 0 ? measureRef : undefined}
            style={{ height: cardH, flexShrink: 0 }}
          >
            <SideCard r={r} isMobile={isMobile} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingStories({ isMobile }) {
  return (
    <div style={{ background: `linear-gradient(180deg,#F7F5FC 0%,#EEF0F8 100%)`, padding: isMobile ? "48px 16px" : "72px 24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 20 : 32, alignItems: "end", marginBottom: isMobile ? 28 : 36 }}>
          <div>
            <Reveal>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 30, fontSize: 11.5, fontWeight: 800, color: T.green, letterSpacing: ".5px", marginBottom: 16, boxShadow: SHADOW }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} />
                CUSTOMER STORIES
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h2 style={{ fontFamily: FONT_D, fontSize: isMobile ? 28 : 42, fontWeight: 800, letterSpacing: "-1.3px", margin: 0, lineHeight: 1.12, color: T.ink }}>
                Less listing stress.<br />More calls that <span style={{ color: T.brand }}>connect.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div>
              <div style={{ fontSize: 14.5, color: T.sub, marginBottom: 12, fontWeight: 600 }}>What changes when business information stays accurate:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { t: "Correct phone", c: T.green },
                  { t: "Accurate hours", c: T.brand },
                  { t: "One dashboard", c: T.blue },
                ].map((x) => (
                  <span key={x.t} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, background: "#fff", border: `1px solid ${T.line}`, fontSize: 12.5, fontWeight: 700, color: T.ink }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: x.c }} />
                    {x.t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr 1fr", gap: 16, alignItems: "stretch" }}>
          {/* Featured — stays */}
          <Reveal delay={120}>
            <div
              style={{
                background: `linear-gradient(145deg,#171732 0%,#1E1B4B 55%,#2A2460 100%)`,
                borderRadius: 24,
                padding: isMobile ? "28px 22px" : "34px 32px",
                minHeight: isMobile ? 280 : 340,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              <div aria-hidden="true" style={{ position: "absolute", top: 18, right: 22, fontFamily: FONT_D, fontSize: 80, fontWeight: 800, color: "rgba(255,255,255,.08)", lineHeight: 1 }}>“</div>
              <div style={{ marginBottom: 18 }}>
                <GoldStars size={18} />
              </div>
              <p style={{ fontFamily: FONT_D, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#fff", lineHeight: 1.45, margin: "0 0 auto", letterSpacing: "-.3px", position: "relative", zIndex: 1 }}>
                “{FEATURED.quote}”
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontWeight: 800, fontSize: 18 }}>{FEATURED.letter}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{FEATURED.name}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)" }}>{FEATURED.meta}</div>
                  </div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, background: "rgba(15,164,122,.18)", border: "1px solid rgba(15,164,122,.3)", fontSize: 11, fontWeight: 800, color: T.green, letterSpacing: ".3px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
                  {FEATURED.badge}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right stack — smooth vertical carousel */}
          <Reveal delay={180}>
            <SideReviewStack isMobile={isMobile} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
