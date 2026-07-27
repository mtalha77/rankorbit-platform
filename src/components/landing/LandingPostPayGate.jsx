import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../../lib/theme";
import { api } from "../../lib/api";
import { Btn } from "../atoms";

/**
 * Blocking post-payment gate — cannot dismiss by X or backdrop click.
 * User must set password via email, then continue to Sign in.
 */
export function LandingPostPayGate({
  busy,
  email,
  message,
  error,
  sessionId,
  planId,
}) {
  const nav = useNavigate();
  const [resending, setResending] = useState(false);
  const [note, setNote] = useState("");

  const resend = async () => {
    if (!sessionId) {
      setNote("Open the link from your payment email, or use Forgot password on the sign-in page.");
      return;
    }
    setResending(true);
    setNote("");
    const r = await api.claimLandingCheckout(sessionId, { resend: true });
    setResending(false);
    if (r.error) setNote(r.error);
    else setNote(r.passwordEmailSent ? "Email sent again — check your inbox and spam folder." : "Account is ready. Use Sign in or Forgot password.");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-pay-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(23,23,50,.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      // No onClick dismiss — blocking by design
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: T.surface,
          borderRadius: 20,
          padding: "28px 26px 24px",
          boxShadow: SHADOW_LG,
          border: `1.5px solid ${T.line}`,
          fontFamily: FONT_B,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: T.greenSoft || "#E8F8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 16,
          }}
        >
          {busy ? "…" : "✓"}
        </div>
        <h2 id="post-pay-title" style={{ fontFamily: FONT_D, fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: T.ink, letterSpacing: "-0.4px" }}>
          {busy ? "Confirming your payment…" : "Set your password"}
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: T.sub, lineHeight: 1.55, fontWeight: 600 }}>
          {busy
            ? "We’re linking your plan and preparing your account. This only takes a moment."
            : error
              ? error
              : message ||
                "Payment successful. Check your email to set your password and confirm access — then sign in to open your dashboard."}
        </p>

        {email && !busy && (
          <div
            style={{
              padding: "12px 14px",
              background: T.surface2 || "#F6F7FB",
              borderRadius: 12,
              border: `1.5px solid ${T.line}`,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T.faint, letterSpacing: ".5px", marginBottom: 4 }}>EMAIL SENT TO</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, wordBreak: "break-all" }}>{email}</div>
          </div>
        )}

        {!busy && !error && (
          <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 13, color: T.sub, lineHeight: 1.6, fontWeight: 600 }}>
            <li>Open the “Set your NAP Orbit password” email</li>
            <li>Create your password from the link</li>
            <li>Sign in — do not Sign up again with this email</li>
          </ul>
        )}

        {note && (
          <div style={{ fontSize: 12.5, color: T.brand, fontWeight: 700, marginBottom: 12, lineHeight: 1.45 }}>{note}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn
            onClick={() => nav(planId ? `/login?plan=${encodeURIComponent(planId)}` : "/login")}
            disabled={busy}
            style={{ width: "100%" }}
          >
            I’ve set my password — Sign in
          </Btn>
          <Btn variant="soft" onClick={resend} disabled={busy || resending} style={{ width: "100%" }}>
            {resending ? "Sending…" : "Resend password email"}
          </Btn>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: T.faint, fontWeight: 600, lineHeight: 1.45, textAlign: "center" }}>
          This step is required to access your dashboard. This window cannot be closed until you continue to sign in.
        </p>
      </div>
    </div>
  );
}
