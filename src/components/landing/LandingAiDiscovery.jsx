import { T, FONT_D, SHADOW, SHADOW_LG } from "../../lib/theme";
import { Reveal } from "../Reveal";
import { BrandMark } from "./BrandMark";

function SearchBar({ isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#fff",
        border: `1px solid ${T.line}`,
        borderRadius: 999,
        padding: isMobile ? "12px 14px" : "14px 18px",
        boxShadow: SHADOW_LG,
        marginBottom: isMobile ? 16 : 20,
        maxWidth: "100%",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <div style={{ flex: 1, fontSize: isMobile ? 13.5 : 15, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        best roofing company near me
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}

function DetailIcon({ type }) {
  const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: T.faint, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "phone") return <svg {...common}><path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.3a2 2 0 0 1-.5 2.1L7.1 9.2a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.7.3 1.5.5 2.3.6A2 2 0 0 1 22 16.9z"/></svg>;
  if (type === "clock") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  return <svg {...common}><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>;
}

function GoogleListingCard({ isMobile }) {
  const thumbs = ["/ai-thumb-1.webp", "/ai-thumb-2.webp", "/ai-thumb-3.webp"];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        border: `1px solid ${T.line}`,
        boxShadow: "0 8px 28px rgba(23,23,50,.10)",
        padding: isMobile ? 14 : 18,
        width: isMobile ? "100%" : "auto",
        flex: isMobile ? "none" : 1,
        minWidth: 0,
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <BrandMark name="Google" size={22} color="#4285F4" />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 9px",
            borderRadius: 8,
            background: T.greenSoft,
            fontSize: 10.5,
            fontWeight: 800,
            color: T.green,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Google Guaranteed
        </div>
      </div>

      <div style={{ fontFamily: FONT_D, fontSize: isMobile ? 17 : 18, fontWeight: 800, color: T.ink, marginBottom: 5 }}>
        Summit Peak Roofing
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12, fontSize: 12.5, fontWeight: 700, color: T.sub }}>
        <span style={{ color: "#F4B400", letterSpacing: 1 }}>★★★★★</span>
        <span>4.9</span>
        <span style={{ color: T.faint, fontWeight: 600 }}>(128)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
        {thumbs.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            width={120}
            height={62}
            style={{
              height: isMobile ? 52 : 62,
              width: "100%",
              borderRadius: 10,
              objectFit: "cover",
              display: "block",
              background: T.surface2,
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {["Website", "Directions", "Call"].map((a) => (
          <div
            key={a}
            style={{
              padding: "7px 12px",
              borderRadius: 9,
              background: "#EAF1FB",
              fontSize: 11.5,
              fontWeight: 700,
              color: T.blue,
            }}
          >
            {a}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { type: "phone", t: "(555) 214-8900" },
          { type: "clock", t: "Open · Closes 6 PM" },
          { type: "pin", t: "1420 Ridgeway Ave" },
        ].map((row) => (
          <div key={row.t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: T.sub, fontWeight: 600 }}>
            <DetailIcon type={row.type} />
            {row.t}
          </div>
        ))}
      </div>
    </div>
  );
}

function AiAnswerCard({ isMobile }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        border: `1px solid ${T.line}`,
        boxShadow: "0 8px 28px rgba(23,23,50,.10)",
        padding: isMobile ? 14 : 18,
        width: isMobile ? "100%" : "auto",
        flex: isMobile ? "none" : 1,
        minWidth: 0,
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: T.green,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="2.8" />
          </svg>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, fontFamily: FONT_D }}>AI Answer</div>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.green }}>+</span>
      </div>

      <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, margin: "0 0 12px", fontWeight: 500 }}>
        Here are top-rated roofing companies near you based on reviews and local listing data:
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: T.greenSoft,
            color: T.green,
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          1
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, marginBottom: 2 }}>
            Summit Peak Roofing{" "}
            <span style={{ fontSize: 10, fontWeight: 800, color: T.green, background: T.greenSoft, padding: "2px 6px", borderRadius: 4, marginLeft: 4 }}>
              Top pick
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#F4B400", fontWeight: 700, marginBottom: 4 }}>★★★★★ 4.9</div>
          <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.45, fontWeight: 500 }}>
            Highly rated local roofer with consistent NAP data across Google and directories.
          </div>
        </div>
      </div>

      {[2, 3].map((n) => (
        <div key={n} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: T.surface2,
              color: T.faint,
              fontSize: 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {n}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, width: "72%", background: T.surface2, borderRadius: 4, marginBottom: 5 }} />
            <div style={{ height: 7, width: "48%", background: T.surface2, borderRadius: 4 }} />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, fontWeight: 600, color: T.faint }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Recommendations are AI-generated.
      </div>
    </div>
  );
}

export function LandingAiDiscovery({ isMobile }) {
  const platforms = [
    { name: "GoogleMaps", label: "Google Maps", color: "#EA4335" },
    { name: "AppleMaps", label: "Apple Maps", color: "#007AFF" },
    { name: "ChatGPT", label: "ChatGPT", color: "#10A37F" },
    { name: "Gemini", label: "Gemini", color: T.violet },
  ];

  return (
    <div
      style={{
        background: "#fff",
        padding: isMobile ? "48px 16px" : "72px 24px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: isMobile ? 36 : 56,
          alignItems: "center",
        }}
      >
        {/* Left visual — side by side, no overlap */}
        <Reveal>
          <div style={{ position: "relative", width: "100%" }}>
            <SearchBar isMobile={isMobile} />
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "stretch",
                gap: isMobile ? 14 : 16,
              }}
            >
              <GoogleListingCard isMobile={isMobile} />
              <AiAnswerCard isMobile={isMobile} />
            </div>
          </div>
        </Reveal>

        {/* Right copy */}
        <Reveal delay={100}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.2px",
                color: T.green,
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              AI Listings Management
            </div>
            <h2
              style={{
                fontFamily: FONT_D,
                fontSize: isMobile ? 28 : 40,
                fontWeight: 800,
                letterSpacing: "-1.2px",
                margin: "0 0 16px",
                lineHeight: 1.15,
                color: T.ink,
              }}
            >
              Structure listings for Google, Apple Maps, ChatGPT, and Gemini
            </h2>
            <p
              style={{
                fontSize: isMobile ? 15 : 16.5,
                color: T.sub,
                lineHeight: 1.65,
                margin: "0 0 28px",
                maxWidth: 460,
              }}
            >
              NAP Orbit keeps your business details accurate across the trusted sources AI assistants use to recommend local businesses — so when customers ask, your listing is ready.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: isMobile ? 8 : 12,
              }}
            >
              {platforms.map((p) => (
                <div
                  key={p.label}
                  style={{
                    background: "#fff",
                    border: `1px solid ${T.line}`,
                    borderRadius: 14,
                    padding: isMobile ? "12px 6px" : "14px 10px",
                    boxShadow: SHADOW,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? 36 : 40,
                      height: isMobile ? 36 : 40,
                      borderRadius: 12,
                      background: T.surface2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BrandMark name={p.name} size={isMobile ? 18 : 20} color={p.color} />
                  </div>
                  <div style={{ fontSize: isMobile ? 10 : 11.5, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
