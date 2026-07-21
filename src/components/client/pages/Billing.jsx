import { useState } from "react";
import { T, FONT_D, FONT_B, SHADOW, SHADOW_LG } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { downloadBlob, openExternalFile } from "../../../lib/export";
import { PLANS, popularPlanId, orderPlansPopularCenter, isPlanDowngrade } from "../../../lib/constants";
import { paymentGraceState } from "../../../lib/helpers";
import { Badge, Card, Btn, PageHead, SectionTitle, Modal } from "../../atoms";
import { ProfileGate } from "../ProfileGate";
import { useClient } from "../ClientContext";

export function Billing() {
  const { user, isMobile, stripeConfigured, toast, R, reload, setConfirm, PLANSV, plan, invoices, setInvoices, my, myAct, impersonating, cfg } = useClient();
  const popularId = popularPlanId(cfg || {});
  const [switchTo, setSwitchTo] = useState(null);
  const [when, setWhen] = useState("now");
  const [switching, setSwitching] = useState(false);

  const stripeReady = stripeConfigured === true;
  const billingBlocked = stripeConfigured === false;
  const grace = paymentGraceState(user);
  const pendingName = user.pendingPlanId && PLANS[user.pendingPlanId] ? PLANS[user.pendingPlanId].name : user.pendingPlanId;
  const pendingDate = user.pendingPlanEffectiveAt
    ? new Date(user.pendingPlanEffectiveAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const blockWrite = () => {
    if (!impersonating) return false;
    toast("Read-only view — changes are disabled", "info");
    return true;
  };

  const goStripe = async (planId) => {
    if (blockWrite()) return;
    try { sessionStorage.setItem("ro_pending_plan", planId); } catch {}
    if (billingBlocked) {
      toast("Billing is not connected yet. Checkout opens once Stripe is configured.", "info");
      return;
    }
    if (stripeConfigured !== true) {
      toast("Checking billing setup…", "info");
      return;
    }
    if (user.stripeSubscriptionId) {
      // Downgrade → only next billing period; upgrade can choose now or later.
      setWhen(isPlanDowngrade(user.plan, planId) ? "period_end" : "now");
      setSwitchTo(planId);
      return;
    }
    const r = await api.createCheckout(planId);
    if (r.error) { toast(r.error, "info"); return; }
    if (r.url) globalThis.location.assign(r.url);
  };

  const confirmSwitch = async () => {
    if (!switchTo || blockWrite()) return;
    const timing = isPlanDowngrade(user.plan, switchTo) ? "period_end" : when;
    setSwitching(true);
    try {
      const r = await api.changeSubscription(switchTo, { when: timing });
      if (r.error) { toast(r.error, "info"); return; }
      try { sessionStorage.removeItem("ro_pending_plan"); } catch {}
      const targetName = PLANS[switchTo].name;
      setSwitchTo(null);
      // Pull latest Stripe invoices (proration / renewal) into the history table.
      try {
        const synced = await api.syncInvoices();
        if (synced?.invoices?.length && setInvoices) setInvoices(synced.invoices);
      } catch { /* non-blocking */ }
      if (timing === "period_end") {
        await R(async () => {}, `Scheduled switch to ${targetName}`);
      } else {
        await R(async () => {}, `Switched to ${targetName}`);
      }
    } finally {
      setSwitching(false);
    }
  };

  const cancelPending = async () => {
    if (blockWrite()) return;
    const r = await api.cancelPendingPlanChange();
    if (r.error) { toast(r.error, "info"); return; }
    toast("Scheduled plan change canceled");
    await reload();
  };

  const doCancel = async () => {
    if (blockWrite()) return;
    if (api.mode !== "supabase") {
      const ok = await R(async () => {
        await api.patchProfile(user.id, { cancelAtPeriodEnd: true, canceledAt: new Date().toISOString() });
      }, "Subscription set to cancel at period end");
      if (!ok) throw new Error("Cancel failed");
      return;
    }
    const r = await api.cancelSubscription({ resume: false });
    if (r.error) { toast(r.error, "info"); throw new Error(r.error); }
    toast("Subscription set to cancel at period end");
    await reload();
  };

  const doResume = async () => {
    if (blockWrite()) return;
    if (api.mode !== "supabase") {
      const ok = await R(async () => {
        await api.patchProfile(user.id, { cancelAtPeriodEnd: false, canceledAt: null });
      }, "Subscription resumed, you're all set");
      if (!ok) throw new Error("Resume failed");
      return;
    }
    const r = await api.cancelSubscription({ resume: true });
    if (r.error) { toast(r.error, "info"); throw new Error(r.error); }
    toast("Subscription resumed, you're all set");
    await reload();
  };

  const openPortal = async () => {
    if (blockWrite()) return;
    if (!stripeReady) { toast("Card management opens in Stripe once billing is connected", "info"); return; }
    const r = await api.createPortalSession();
    if (r.error) { toast(r.error, "info"); return; }
    if (r.url) globalThis.location.assign(r.url);
  };

  const periodEndDate = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
  const periodSynced = !!(periodEndDate && !Number.isNaN(periodEndDate.getTime()));
  const periodLabel = periodSynced
    ? periodEndDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the end of your billing period";
  const nextChargeLabel = periodSynced
    ? periodEndDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Renewal date syncing from Stripe…";
  const daysLeft = (() => {
    if (!periodSynced) return null;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(periodEndDate); end.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((end - start) / 86400000));
  })();
  const daysLeftLabel = daysLeft == null ? null : daysLeft === 0 ? "Ends today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  const profileComplete = !!(user.businessName && user.phone && user.address && user.city && user.state && user.category);
  const invoiceRows = invoices.length ? invoices : null;

  const target = switchTo ? (PLANSV?.[switchTo] || PLANS[switchTo]) : null;
  const currentName = plan?.name || "your current plan";
  const downgrade = !!(switchTo && user.plan && isPlanDowngrade(user.plan, switchTo));
  const switchOptions = [
    !downgrade && {
      id: "now",
      title: "Change now",
      body: `Your plan switches to ${target?.name} today. Unused days on ${currentName} are credited toward the new plan. You pay only the prorated difference for the rest of this billing period. New features unlock immediately.`,
    },
    {
      id: "period_end",
      title: `Start next billing period${periodSynced ? ` (${periodLabel})` : ""}`,
      body: downgrade
        ? `Downgrades apply at the end of your current period. You keep ${currentName} (and its features) until ${periodLabel}. Then you move to ${target?.name} at $${target?.price}/month — no prorated refund for unused days.`
        : `You keep ${currentName} until ${periodLabel}. No extra charge today for switching. On your next bill, you move to ${target?.name} at $${target?.price}/month. Features stay on ${currentName} until then.`,
    },
  ].filter(Boolean);

  return (
    <div>
      <PageHead isMobile={isMobile} title="Plan & Billing" sub="Everything about what you pay and what you get" />
      {impersonating && (
        <div style={{ padding: "10px 14px", background: T.amberSoft, borderRadius: 11, marginBottom: 14, fontSize: 12.5, color: T.amber, fontWeight: 700 }}>
          Read-only view — billing changes are disabled.
        </div>
      )}
      {grace.pastDue && (
        <div
          style={{
            padding: "12px 14px",
            background: grace.expired ? T.redSoft : T.amberSoft,
            borderRadius: 12,
            marginBottom: 14,
            border: `1px solid ${grace.expired ? T.red : T.amber}33`,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800, color: grace.expired ? T.red : T.amber }}>
            {grace.expired ? "Payment overdue — service limited" : "Payment failed"}
          </div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>
            {grace.expired
              ? "Your grace period ended. Update your payment method to restore full access."
              : `We couldn't charge your card. Your plan stays active until ${grace.label}${grace.daysLeft != null ? ` (${grace.daysLeft} day${grace.daysLeft === 1 ? "" : "s"} left)` : ""}. Update your card to avoid interruption.`}
          </div>
          <Btn variant="soft" size="sm" style={{ marginTop: 10 }} disabled={impersonating} onClick={openPortal}>
            Update payment method →
          </Btn>
        </div>
      )}
      {user.pendingPlanId && (
        <div style={{ padding: "12px 14px", background: T.brandSoft, borderRadius: 12, marginBottom: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: T.brand }}>Plan change scheduled</div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>
              Switching to <b>{pendingName}</b>{pendingDate ? ` on ${pendingDate}` : " at next billing period"}. You keep {currentName} until then.
            </div>
          </div>
          <Btn variant="ghost" size="sm" disabled={impersonating} onClick={cancelPending}>Cancel scheduled change</Btn>
        </div>
      )}
      {!profileComplete && !user.plan && !impersonating && <ProfileGate user={user} onSaved={reload} toast={toast} isMobile={isMobile} />}
      {(profileComplete || user.plan) && (
        <>
          {user.plan && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, marginBottom: 20 }}>
              <Card className="fadeUp" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: plan.soft, opacity: 0.6 }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".8px", marginBottom: 6 }}>CURRENT PLAN</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: FONT_D, fontSize: 26, fontWeight: 800 }}>{plan.name}</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 22, fontWeight: 800, color: plan.color }}>
                    ${plan.price}<span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>/month</span>
                  </div>
                  <Badge type={user.subscriptionStatus === "past_due" ? "pending" : "active"} />
                </div>
                <div style={{ marginTop: 16 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 8 }}>
                      <div style={{ width: 19, height: 19, borderRadius: "50%", background: T.greenSoft, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>✓</div>
                      <span style={{ fontSize: 13, color: T.sub }}>{f}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="fadeUp" style={{ animationDelay: "100ms", background: user.cancelAtPeriodEnd ? `linear-gradient(135deg,${T.amberSoft},#fff)` : `linear-gradient(135deg,${T.brandSoft},#fff)` }}>
                {user.cancelAtPeriodEnd ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.amber, letterSpacing: ".8px", marginBottom: 8 }}>SUBSCRIPTION ENDING</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 19, fontWeight: 800, color: T.amber }}>Cancels on renewal</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 6, lineHeight: 1.5 }}>You keep full access until <b>{periodLabel}</b>. You won't be charged again.</div>
                    {daysLeftLabel && (
                      <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: T.amberSoft, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: T.amber }}>{daysLeftLabel}</span>
                        <span style={{ fontSize: 11.5, color: T.sub }}>in this billing period · ends {periodLabel}</span>
                      </div>
                    )}
                    <Btn variant="green" size="sm" style={{ width: "100%", marginTop: 12 }} disabled={impersonating} onClick={doResume}>Resume subscription</Btn>
                  </>
                ) : user.pendingPlanId && (PLANSV?.[user.pendingPlanId] || PLANS[user.pendingPlanId]) ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.brand, letterSpacing: ".8px", marginBottom: 8 }}>NEXT CHARGE (SCHEDULED)</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 24, fontWeight: 800, color: T.brand }}>
                      ${(PLANSV?.[user.pendingPlanId] || PLANS[user.pendingPlanId]).price}.00
                    </div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>
                      {pendingName} · {pendingDate || nextChargeLabel}
                    </div>
                    {daysLeftLabel && (
                      <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: T.brandSoft, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: T.brand }}>{daysLeftLabel}</span>
                        <span style={{ fontSize: 11.5, color: T.sub }}>on {currentName} · then {pendingName}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>
                      You keep <b>{currentName}</b> until {periodLabel}. Next bill is for <b>{pendingName}</b> at ${(PLANSV?.[user.pendingPlanId] || PLANS[user.pendingPlanId]).price}/mo.
                    </div>
                    <Btn variant="ghost" size="sm" style={{ marginTop: 12 }} disabled={impersonating} onClick={cancelPending}>
                      Cancel scheduled change
                    </Btn>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".8px", marginBottom: 8 }}>NEXT CHARGE</div>
                    <div style={{ fontFamily: FONT_D, fontSize: 24, fontWeight: 800, color: T.brand }}>${plan.price}.00</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{nextChargeLabel}</div>
                    {daysLeftLabel && (
                      <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: T.brandSoft, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: T.brand }}>{daysLeftLabel}</span>
                        <span style={{ fontSize: 11.5, color: T.sub }}>in this billing period · renews {periodLabel}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>Renews automatically. Cancel before your renewal date to avoid the next charge, you keep access until the period ends.</div>
                    <button
                      disabled={impersonating}
                      onClick={() => setConfirm({ title: "Cancel subscription?", msg: `Your ${plan.name} plan will stay active until the end of your current billing period, then cancel. You won't be charged again. No refunds for the current period (see Terms).`, danger: true, yes: "Cancel at period end", onYes: doCancel })}
                      style={{ marginTop: 12, background: "none", border: "none", color: T.faint, fontSize: 11.5, fontWeight: 700, cursor: impersonating ? "not-allowed" : "pointer", textDecoration: "underline", fontFamily: FONT_B, padding: 0, opacity: impersonating ? 0.5 : 1 }}
                    >
                      Cancel subscription
                    </button>
                  </>
                )}
              </Card>
            </div>
          )}
          <SectionTitle sub="Pick a plan to start, or upgrade anytime, secure checkout via Stripe">{user.plan ? "Change Plan" : "Choose Your Plan"}</SectionTitle>
          {billingBlocked && (
            <div style={{ padding: "10px 14px", background: T.amberSoft, borderRadius: 11, marginBottom: 14, fontSize: 12, color: T.amber, fontWeight: 600 }}>
              Checkout is unavailable until Stripe is configured. All plans are paid — there is no free activation.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
            {orderPlansPopularCenter(Object.entries(PLANSV), popularId).map(([id, p], i) => {
              const current = id === user.plan;
              const scheduled = id === user.pendingPlanId;
              return (
                <div key={id} className="fadeUp hoverCard" style={{ animationDelay: `${i * 90}ms`, background: T.surface, border: `2px solid ${current ? p.color : T.line}`, borderRadius: 18, padding: 22, position: "relative", boxShadow: current ? SHADOW_LG : SHADOW }}>
                  {current && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>CURRENT PLAN</div>}
                  {scheduled && !current && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: T.brand, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>SCHEDULED</div>}
                  {id === popularId && !current && !scheduled && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${T.brand},${T.violet})`, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
                  <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 30, fontWeight: 800, color: p.color, margin: "5px 0 2px" }}>${p.price}<span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>/mo</span></div>
                  <div style={{ fontSize: 12, color: T.sub, fontWeight: 700, marginBottom: 14 }}>{p.quota}</div>
                  <div style={{ height: 1, background: T.line, marginBottom: 14 }} />
                  {p.features.map((f, j) => <div key={j} style={{ fontSize: 12, color: T.sub, marginBottom: 8, display: "flex", gap: 7 }}><span style={{ color: T.green, fontWeight: 800 }}>✓</span>{f}</div>)}
                  {current ? (
                    <Btn variant="ghost" size="sm" style={{ width: "100%", marginTop: 10 }} onClick={() => toast("This is your active plan")}>Your current plan</Btn>
                  ) : (
                    <Btn size="sm" style={{ width: "100%", marginTop: 10 }} disabled={impersonating || billingBlocked || stripeConfigured === null} onClick={() => goStripe(id)}>
                      {impersonating ? "Read-only" : billingBlocked ? "Checkout unavailable" : `${user.plan ? "Switch to " : "Subscribe to "}${p.name} →`}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
          {user.plan && (
            <Card style={{ marginTop: 20 }}>
              <SectionTitle right={<Btn variant="ghost" size="sm" disabled={impersonating} onClick={openPortal}>💳 Manage billing</Btn>}>Invoice History</SectionTitle>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead>
                    <tr>{["Date", "Description", "Card", "Amount", "Status", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800, color: T.faint, textTransform: "uppercase", letterSpacing: ".7px", borderBottom: `1.5px solid ${T.line}` }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {invoiceRows ? invoiceRows.map((inv) => {
                      const dt = inv.createdAt ? new Date(inv.createdAt) : new Date();
                      const amt = ((inv.amountCents || 0) / 100).toFixed(2);
                      const last4 = user.cardLast4 || "••••";
                      const paid = inv.status === "paid";
                      const desc =
                        inv.description ||
                        (inv.billingReason === "subscription_update"
                          ? "Plan change (prorated)"
                          : inv.billingReason === "subscription_create"
                            ? "Subscription started"
                            : `${plan.name} plan · monthly`);
                      return (
                        <tr key={inv.id} className="hoverRow">
                          <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${T.line}` }}>{dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td style={{ padding: "12px", fontSize: 12.5, color: T.sub, borderBottom: `1px solid ${T.line}`, maxWidth: 280 }}>{desc}</td>
                          <td style={{ padding: "12px", fontSize: 12.5, color: T.sub, borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>{user.cardBrand || "Card"} •••• {last4}</td>
                          <td style={{ padding: "12px", fontSize: 13, fontWeight: 800, borderBottom: `1px solid ${T.line}` }}>${amt}</td>
                          <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}><Badge type={paid ? "paid" : "pending"} /></td>
                          <td style={{ padding: "12px", borderBottom: `1px solid ${T.line}` }}>
                            <button onClick={() => { const u = inv.invoicePdf || inv.hostedInvoiceUrl; if (openExternalFile(u)) return; toast("Open Manage billing to view invoices in Stripe", "info"); }} style={{ background: "none", border: "none", color: T.brand, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT_B }}>PDF ↓</button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={6} style={{ padding: "18px 12px", fontSize: 13, color: T.sub }}>No invoices yet. They appear here after your first payment.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.line}`, fontSize: 11.5, color: T.faint, lineHeight: 1.5 }}>
                Your primary card shows above. Add or remove cards, and download official invoices, in <b>Manage billing</b> (secure Stripe portal). Card details are never stored on our servers.
              </div>
            </Card>
          )}
          <Card style={{ marginTop: 16 }}>
            <SectionTitle sub="Download everything we hold about your account, profile, listings, and activity.">Your Data</SectionTitle>
            <Btn variant="ghost" size="sm" onClick={() => {
              try {
                const mine = { profile: user, listings: my, activity: myAct, invoices: invoices || [], exportedAt: new Date().toISOString() };
                downloadBlob(JSON.stringify(mine, null, 2), `naporbit-my-data-${Date.now()}.json`, "application/json");
                toast("Your data downloaded");
              } catch (e) {
                toast(e.message || "Download failed", "info");
              }
            }}>⤓ Download my data (JSON)</Btn>
          </Card>
        </>
      )}

      <Modal open={!!switchTo && !!target} onClose={() => !switching && setSwitchTo(null)} title={`Switch to ${target?.name || ""}?`} width={480}>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>
          {downgrade ? (
            <>Downgrade to <b>{target?.name}</b> starts at your next billing date. Current plan: <b>{currentName}</b>.</>
          ) : (
            <>Choose when <b>{target?.name}</b> should start. Current plan: <b>{currentName}</b>.</>
          )}
        </div>
        {switchOptions.map((opt) => {
          const on = when === opt.id;
          const selectable = switchOptions.length > 1;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectable && setWhen(opt.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                marginBottom: 10,
                borderRadius: 12,
                border: `1.5px solid ${on ? T.brand : T.line}`,
                background: on ? T.brandSoft : T.surface,
                cursor: selectable ? "pointer" : "default",
                fontFamily: FONT_B,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {selectable ? (
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${on ? T.brand : T.line}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.brand }} />}
                  </span>
                ) : null}
                <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{opt.title}</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, paddingLeft: selectable ? 24 : 0 }}>{opt.body}</div>
            </button>
          );
        })}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" disabled={switching} onClick={() => setSwitchTo(null)}>Cancel</Btn>
          <Btn disabled={switching} onClick={confirmSwitch}>{switching ? "Updating…" : downgrade ? "Schedule downgrade" : "Confirm switch"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
