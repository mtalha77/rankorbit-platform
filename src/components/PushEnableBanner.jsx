import { useEffect, useState } from "react";
import { T, FONT_B } from "../lib/theme";
import { api } from "../lib/api";
import { Btn } from "./atoms";
import {
  isPushAvailable,
  isPushPromptDismissed,
  dismissPushPrompt,
  permissionState,
  getExistingSubscription,
  enablePush,
} from "../lib/push";

/**
 * Soft banner: ask logged-in users to enable browser push (clients + staff).
 * Hidden when unsupported, already subscribed, dismissed, or impersonating.
 */
export default function PushEnableBanner({ toast, enabled = true, onVisibilityChange }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || isPushPromptDismissed()) {
      setShow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const available = await isPushAvailable();
      if (cancelled || !available) {
        if (!cancelled) setShow(false);
        return;
      }
      const perm = await permissionState();
      if (cancelled) return;
      if (perm === "denied" || perm === "unsupported") {
        setShow(false);
        return;
      }
      const existing = await getExistingSubscription();
      if (cancelled) return;
      setShow(!existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    onVisibilityChange?.(show);
  }, [show, onVisibilityChange]);

  if (!show) return null;

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "12px 14px",
        borderRadius: 12,
        background: T.brandSoft || "#EEF0FF",
        border: `1px solid ${T.line}`,
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        fontFamily: FONT_B,
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 2 }}>
          Enable browser notifications
        </div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.45 }}>
          Get alerts for messages, calls, and account updates — even when this tab is in the background.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await enablePush((subscription) => api.pushSubscribe(subscription));
            setBusy(false);
            if (r.error) {
              toast?.(r.error, "error");
              return;
            }
            toast?.("Notifications enabled");
            setShow(false);
          }}
        >
          {busy ? "Enabling…" : "Enable"}
        </Btn>
        <Btn
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            dismissPushPrompt(7);
            setShow(false);
          }}
        >
          Not now
        </Btn>
      </div>
    </div>
  );
}
