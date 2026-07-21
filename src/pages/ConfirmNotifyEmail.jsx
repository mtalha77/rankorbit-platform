import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, FONT_B } from "../lib/theme";
import { supa } from "../lib/supabase";
import { Orbit } from "../components/Orbit";

function parseRpc(data) {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

/**
 * Confirm alternate notification email via token in the link.
 * Prefers local/Vercel API (service role); falls back to Supabase RPC.
 */
export default function ConfirmNotifyEmail() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState("Confirming your notification email…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = String(params.get("t") || "").trim();
      if (!t) {
        setMsg("Missing confirmation link.");
        return;
      }

      let result = null;

      // 1) API with service role (most reliable for DB write).
      try {
        const r = await fetch("/api/confirm-notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) result = j;
        else if (j.error && j.error !== "NOT_FOUND") result = j;
      } catch {
        /* try RPC */
      }

      // 2) Supabase RPC fallback (works without new Vercel deploy if SQL is applied).
      if (!result?.ok && supa) {
        try {
          const { data, error } = await supa.rpc("confirm_notify_email", { p_token: t });
          if (error) {
            if (!cancelled) {
              setMsg(
                /function.*does not exist/i.test(error.message || "")
                  ? "Confirmation is not set up yet. Run supabase/notify-email.sql in Supabase."
                  : error.message || "Could not confirm email."
              );
            }
            return;
          }
          result = parseRpc(data);
        } catch (e) {
          if (!cancelled) setMsg(e.message || "Could not confirm email.");
          return;
        }
      }

      if (cancelled) return;

      if (!result?.ok) {
        const err = result?.error || "invalid";
        setMsg(
          err === "expired"
            ? "This link expired. Open Settings and send a new confirmation."
            : err === "missing"
              ? "Missing confirmation link."
              : "This confirmation link is invalid or already used."
        );
        return;
      }

      const email = String(result.notifyEmail || "").trim().toLowerCase();
      try {
        sessionStorage.setItem(
          "ro_notify_email_confirmed",
          JSON.stringify({ email, at: Date.now() })
        );
      } catch { /* ignore */ }

      const staff = result.role && result.role !== "client";
      const q = new URLSearchParams({ notifyEmail: "confirmed" });
      if (email) q.set("addr", email);
      nav(staff ? `/admin?${q}` : `/dashboard?${q}`, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [params, nav]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        fontFamily: FONT_B,
        padding: 24,
        textAlign: "center",
      }}
    >
      <Orbit size={72} speed={6} />
      <div style={{ fontSize: 14, color: T.sub, fontWeight: 600, maxWidth: 360, lineHeight: 1.5 }}>{msg}</div>
    </div>
  );
}
