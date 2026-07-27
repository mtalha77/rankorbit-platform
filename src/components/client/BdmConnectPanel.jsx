import { useEffect, useRef, useState } from "react";
import { T, FONT_D, FONT_B } from "../../lib/theme";
import { api } from "../../lib/api";
import { Card, Btn } from "../atoms";

/**
 * Subscribed client with no assigned BDM — request support.
 * Step 1: Request → Step 2: Billing (super admin) or Technical (managers).
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
  const [step, setStep] = useState("choose"); // "choose" | "pick"
  const [justRequested, setJustRequested] = useState(false);
  const isPending = pending || justRequested;
  const pendingRef = useRef(isPending);
  pendingRef.current = isPending;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

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
      ? "once a team member is assigned, you can book a call with them here."
      : "once a team member is assigned, you can chat with them right here.";

  const submit = async (supportType) => {
    if (busy || readOnly) return;
    setBusy(true);
    const r = await api.requestBdm(supportType);
    setBusy(false);
    if (r.error) {
      toast?.(r.error, "err");
      return;
    }
    if (!r.alreadyAssigned) setJustRequested(true);
    toast?.(
      r.alreadyAssigned
        ? "You already have a BDM assigned."
        : supportType === "billing"
          ? "Billing request sent — our team will follow up."
          : "Technical support request sent — a manager will follow up.",
      "ok"
    );
    reload?.();
  };

  const choiceBtn = (opts) => (
    <button
      key={opts.id}
      type="button"
      disabled={busy || readOnly}
      onClick={() => submit(opts.id)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        marginBottom: 10,
        borderRadius: 12,
        border: `1.5px solid ${T.line}`,
        background: T.surface,
        cursor: busy || readOnly ? "not-allowed" : "pointer",
        fontFamily: FONT_B,
        opacity: busy || readOnly ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 4 }}>
        {opts.icon} {opts.title}
      </div>
      <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.45 }}>{opts.sub}</div>
    </button>
  );

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
      ) : step === "pick" ? (
        <>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: T.ink, marginBottom: 8 }}>
            What do you need help with?
          </div>
          <div style={{ color: T.sub, lineHeight: 1.6, marginBottom: 16 }}>
            Choose a support type so we can route your request to the right team.
          </div>
          {choiceBtn({
            id: "billing",
            icon: "💳",
            title: "Billing support",
            sub: "Plans, invoices, payments, and subscription questions.",
          })}
          {choiceBtn({
            id: "technical",
            icon: "🛠️",
            title: "Technical support",
            sub: "Listings, account setup, technical help — goes to a manager.",
          })}
          <Btn
            variant="ghost"
            size="sm"
            style={{ marginTop: 4 }}
            onClick={() => setStep("choose")}
            disabled={busy}
          >
            ← Back
          </Btn>
        </>
      ) : (
        <>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: T.ink, marginBottom: 8 }}>
            Need help from our team?
          </div>
          <div style={{ color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>
            You don’t have a Business Development Manager yet. Send a request and choose Billing or
            Technical support so we can route it correctly.
          </div>
          <Btn onClick={() => setStep("pick")} disabled={busy || readOnly}>
            Request support
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
