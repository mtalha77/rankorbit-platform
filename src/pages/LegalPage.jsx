import { Link, useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW } from "../lib/theme";
import { useWindowSize } from "../hooks";
import {
  TermsOfServiceBody,
  PrivacyPolicyBody,
} from "../components/LegalContent";

/**
 * Public Terms / Privacy pages (linked from landing footer).
 * mode: "terms" | "privacy"
 */
export default function LegalPage({ mode = "terms" }) {
  const nav = useNavigate();
  const w = useWindowSize();
  const isMobile = w < 768;
  const isTerms = mode === "terms";
  const eff = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg,#F8F7FF 0%,#EEF1FF 100%)`, fontFamily: FONT_B, color: T.ink }}>
      <header style={{
        borderBottom: `1px solid ${T.line}`,
        background: "rgba(255,255,255,.85)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: isMobile ? "14px 16px" : "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <button
            type="button"
            onClick={() => nav("/")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <img src="/nap-orbit-logo-removebg-preview.png" alt="NAP Orbit" style={{ height: isMobile ? 26 : 30, width: "auto", display: "block" }} />
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link
              to="/terms"
              style={{
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 18,
                border: `1.5px solid ${isTerms ? T.brand : T.line}`,
                background: isTerms ? T.brandSoft : "#fff",
                color: isTerms ? T.brand : T.sub,
                fontSize: 12.5,
                fontWeight: isTerms ? 800 : 600,
              }}
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              style={{
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 18,
                border: `1.5px solid ${!isTerms ? T.brand : T.line}`,
                background: !isTerms ? T.brandSoft : "#fff",
                color: !isTerms ? T.brand : T.sub,
                fontSize: 12.5,
                fontWeight: !isTerms ? 800 : 600,
              }}
            >
              Privacy
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: isMobile ? "28px 16px 48px" : "40px 24px 64px" }}>
        <button
          type="button"
          onClick={() => nav("/")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            marginBottom: 18,
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: 700,
            color: T.brand,
            fontFamily: FONT_B,
          }}
        >
          ← Back to home
        </button>

        <h1 style={{
          fontFamily: FONT_D,
          fontSize: isMobile ? 26 : 34,
          fontWeight: 800,
          letterSpacing: "-1px",
          margin: "0 0 6px",
          lineHeight: 1.15,
          color: T.ink,
        }}>
          {isTerms ? "Terms of Service" : "Privacy Policy"}
        </h1>
        <div style={{ fontSize: 13.5, color: T.faint, marginBottom: 22 }}>Effective {eff}</div>

        <div style={{
          background: "#fff",
          border: `1px solid ${T.line}`,
          borderRadius: 18,
          padding: isMobile ? 18 : 28,
          boxShadow: SHADOW,
        }}>
          <div style={{
            padding: "10px 12px",
            background: T.amberSoft,
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 12.5,
            color: T.amber,
            lineHeight: 1.45,
          }}>
            <b>Template notice:</b> This is a starting-point document. Have it reviewed by a qualified lawyer in your jurisdiction before relying on it for real clients.
          </div>
          {isTerms ? <TermsOfServiceBody /> : <PrivacyPolicyBody />}
        </div>
      </main>
    </div>
  );
}
