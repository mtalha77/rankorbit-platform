import { useEffect, useRef, useState } from "react";
import { T, FONT_D } from "../../lib/theme";
import { api } from "../../lib/api";
import { Card, Btn } from "../atoms";

/**
 * Subscribed client with no assigned BDM — request connect.
 * Messages: Growth / GMB Pro only. Book a Call: every paid plan.
 * pending = profiles.bdmConnectRequestedAt already set.
 */
export default function BdmConnectPanel({
  pending = false,
  toast,
  reload,
  context = "messages", // "messages" | "call"
  fill = false,
  readOnly = false,
}) {
  const [busy, setBusy] = useState(false);
  // Optimistic: flip to "pending" on click without waiting for the dashboard reload.
  const [justRequested, setJustRequested] = useState(false);
  const isPending = pending || justRequested;
  const pendingRef = useRef(isPending);
  pendingRef.current = isPending;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // This panel only renders while no BDM is assigned, so poll here instead of app-wide:
  // once a manager assigns one (or a request lands in another tab), refresh and unmount.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const s = await api.myBdmStatus();
      if (cancelled || !s) return;
      if (s.assignedBdmId || !!s.bdmConnectRequestedAt !== pendingRef.current) {
        reloadRef.current?.();
      }
    };
    pull();
    const t = setInterval(pull, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const actionLabel =
    context === "call"
      ? "once a Business Development Manager is assigned, you can book a call with them here."
      : "once a Business Development Manager is assigned, you can chat with them right here.";

  const inner = (
    <Card style={{ maxWidth: 460, textAlign: "center", padding: "32px 26px", width: "100%" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{context === "call" ? "📞" : "💬"}</div>
      {isPending ? (
        <>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: T.ink, marginBottom: 8 }}>
            Your request is pending
          </div>
          <div style={{ color: T.sub, lineHeight: 1.6 }}>
            We’ve notified our team. You’ll be updated soon — {actionLabel}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: T.ink, marginBottom: 8 }}>
            Connect with your BDM
          </div>
          <div style={{ color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>
            You don’t have a Business Development Manager yet. Send a request and our team will
            assign one to you. You’ll be notified when you’re connected.
          </div>
          <Btn
            onClick={async () => {
              if (busy || readOnly) return;
              setBusy(true);
              const r = await api.requestBdm();
              setBusy(false);
              if (r.error) {
                toast?.(r.error, "err");
                return;
              }
              if (!r.alreadyAssigned) setJustRequested(true);
              toast?.(
                r.alreadyAssigned
                  ? "You already have a BDM assigned."
                  : "Request sent — we’ll update you soon.",
                "ok"
              );
              reload?.();
            }}
            disabled={busy || readOnly}
          >
            {busy ? "Sending…" : "Connect with your BDM"}
          </Btn>
        </>
      )}
    </Card>
  );

  if (!fill) return <div style={{ marginBottom: 16 }}>{inner}</div>;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {inner}
    </div>
  );
}
