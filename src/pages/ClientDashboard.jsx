// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, planLive } from "../lib/constants";
import { isPastMeetingNotif, buildLiveGrowthSeries, growthMomTrend, resolveNapScore, paymentGraceState } from "../lib/helpers";
import { Btn, Confirm, PageHead } from "../components/atoms";
import Shell from "../components/Shell";
import ChatThread from "../components/ChatThread";
import AccountSettings from "../components/AccountSettings";
import UserManual from "./UserManual";
import HelpFaqs from "./HelpFaqs";
import { useWindowSize, useToast } from "../hooks";
import {
  ClientContext,
  NotifBell,
  NotificationsPage,
  Home,
  Listings,
  Analytics,
  Gmb,
  Billing,
  ClientCallPage,
  ClientLegalPage,
} from "../components/client";

export default function ClientDashboard({ user: userProp, data, reload, onLogout, impersonating = false, onUserUpdate }) {
  const [page, setPage] = useState("home");
  const [toast, Toasts] = useToast();
  const [showManual, setShowManual] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [stripeConfigured, setStripeConfigured] = useState(null); // null=loading, true/false
  const [invoices, setInvoices] = useState([]);
  const [sysNotifs, setSysNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const notifSig = useRef("");
  const w = useWindowSize();
  const isMobile = w < 820;
  // Async action runner: run fn, optionally toast, then refresh data. Used by billing actions.
  // Returns true on success, false on failure (and toasts the error).
  const R = async (fn, msg) => {
    if (impersonating) {
      toast("Read-only view — changes are disabled", "info");
      return false;
    }
    try {
      await fn();
      if (msg) toast(msg);
      await reload();
      return true;
    } catch (e) {
      toast(e.message || "Something went wrong", "info");
      return false;
    }
  };
  // Always use the freshest copy of the profile (data.users is refreshed by reload()).
  // Safe fallbacks — never crash if a field is briefly missing during load.
  const user = (data?.users || []).find((u) => u.id === userProp?.id) || userProp || {};
  const userId = user.id || userProp?.id || null;
  // Resume plan intent from landing (?plan= or sessionStorage) and checkout return (?billing=success).
  useEffect(() => {
    if (impersonating || !userId) return;
    let planIntent = null;
    let billingFlag = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      planIntent = sp.get("plan");
      billingFlag = sp.get("billing");
      if (!planIntent) planIntent = sessionStorage.getItem("ro_pending_plan");
      if (planIntent && ["essentials", "growth", "gmb"].includes(planIntent)) {
        setPage("billing");
        // Consume once so remounts don't keep forcing Billing.
        if (!billingFlag) {
          try {
            sessionStorage.removeItem("ro_pending_plan");
          } catch {}
        }
      }
      if (billingFlag === "success") {
        setPage("billing");
        toast("Payment received — your plan will activate in a moment", "success");
        try {
          sessionStorage.removeItem("ro_pending_plan");
        } catch {}
        reload();
      } else if (billingFlag === "cancel") {
        setPage("billing");
        toast("Checkout canceled — pick a plan whenever you're ready", "info");
      } else if (billingFlag === "portal") {
        setPage("billing");
        reload();
      }
      if (planIntent || billingFlag) {
        const url = new URL(window.location.href);
        url.searchParams.delete("plan");
        url.searchParams.delete("billing");
        window.history.replaceState(null, "", url.pathname + (url.search || ""));
      }
    } catch {}
  }, [userId, impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
  // Detect whether Stripe Checkout is configured (server env).
  useEffect(() => {
    (async () => {
      const s = await api.billingStatus();
      setStripeConfigured(!!s.configured);
    })();
  }, []);
  // Sync Stripe invoices every time Billing opens (fills descriptions + new proration invoices).
  useEffect(() => {
    if (page !== "billing" || !userId || impersonating) return;
    let cancelled = false;
    (async () => {
      const synced = await api.syncInvoices();
      if (cancelled) return;
      if (synced.invoices?.length) setInvoices(synced.invoices);
      else {
        const rows = await api.listInvoices(userId);
        if (!cancelled) setInvoices(rows || []);
      }
      const p = synced.profile;
      if (
        !cancelled &&
        p &&
        (p.plan !== user.plan ||
          p.subscriptionStatus !== user.subscriptionStatus ||
          p.currentPeriodEnd !== user.currentPeriodEnd ||
          !!p.cancelAtPeriodEnd !== !!user.cancelAtPeriodEnd ||
          p.pendingPlanId !== user.pendingPlanId)
      )
        await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [page, userId, impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
  // First-login user manual: show once. Never auto-open while staff is impersonating.
  useEffect(() => {
    if (impersonating || !userId) return;
    try {
      const key = "ro_manual_seen_" + userId;
      if (!localStorage.getItem(key)) {
        setShowManual(true);
        localStorage.setItem(key, "1");
      }
    } catch {}
  }, [userId, impersonating]);
  useEffect(() => {
    // Staff session notifications must not appear in impersonation view.
    if (impersonating || !userId) {
      setSysNotifs([]);
      notifSig.current = "";
      return;
    }
    let cancelled = false;
    const pull = async () => {
      const rows = await api.listMyNotifications();
      if (cancelled) return;
      const next = rows || [];
      const sig = next.map((n) => `${n.id}:${n.read ? 1 : 0}`).join("|");
      if (sig === notifSig.current) return;
      notifSig.current = sig;
      setSysNotifs(next);
    };
    pull();
    const t = setInterval(pull, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [userId, impersonating]);

  // Chat unread badge — poll while not on Messages; don't rebind on every page change.
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    if (impersonating || !userId) return;
    let cancelled = false;
    const pull = async () => {
      if (pageRef.current === "messages") return;
      const r = await api.listChatMessages({ limit: 40 });
      if (cancelled || r.error) return;
      setChatUnread(r.unread || 0);
    };
    pull();
    const t = setInterval(pull, 20000);
    const unsub = api.subscribeChat(userId, {
      onInsert: (row) => {
        if (pageRef.current === "messages") return;
        if (row.senderId && row.senderId !== userId) setChatUnread((n) => n + 1);
      },
    });
    return () => {
      cancelled = true;
      clearInterval(t);
      unsub();
    };
  }, [userId, impersonating]);

  if (!data || !userId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.sub, fontFamily: FONT_B }}>
        Loading your dashboard…
      </div>
    );
  }
  const my = (data.listings && data.listings[userId]) || [];
  const myGmb = (data.gmb && data.gmb[userId]) || null;
  const myAnalytics = (data.analytics && data.analytics[userId]) || null;
  // Hide staff-only internal logs (unauthorized-edit notes not shared with client).
  const myAct = (Array.isArray(data.activity) ? data.activity : []).filter(
    (a) => a.clientId === userId && a.type !== "edit_blocked_internal"
  );
  const settings = data.settings || {};
  const cfg = settings?.config || {};
  // Client-visible prices honor the super-admin control-panel overrides, falling back to defaults.
  const priceOf = (id) => {
    const m = { essentials: "priceEssentials", growth: "priceGrowth", gmb: "priceGmb" };
    const v = cfg[m[id]];
    return v != null && v !== "" ? Number(v) : PLANS[id]?.price;
  };
  // Full map (all plans, for looking up a client's current plan even if now hidden).
  const PLANSALL = Object.fromEntries(Object.entries(PLANS).map(([id, p]) => [id, { ...p, price: priceOf(id) }]));
  // Selectable map: only live plans show in the choose/upgrade grid.
  const PLANSV = Object.fromEntries(
    Object.entries(PLANS)
      .filter(([id]) => planLive(id, cfg))
      .map(([id, p]) => [id, { ...p, price: priceOf(id) }])
  );
  const live = my.filter((l) => l.status === "live").length;
  const pending = my.filter((l) => l.status === "pending").length;
  const napScore = resolveNapScore(user.napScore, my);
  const plan = PLANSALL[user.plan] || PLANSALL.essentials;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nav = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "messages", icon: "💬", label: "Messages" },
    { id: "listings", icon: "📋", label: "Listings" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    ...(user.plan === "gmb" ? [{ id: "gmb", icon: "📍", label: "GMB" }] : []),
    { id: "billing", icon: "💳", label: "Plan & Billing" },
    { id: "call", icon: "📞", label: "Book a Call" },
  ];
  const growthData = buildLiveGrowthSeries(my, 5);
  const liveMomTrend = growthMomTrend(growthData);
  const planBadge = user.plan ? (
    <div style={{ marginTop: 14, padding: "10px 13px", background: plan.soft, borderRadius: 13 }}>
      <div style={{ fontSize: 10, color: T.sub, fontWeight: 800, letterSpacing: ".5px" }}>YOUR PLAN</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: plan.color, marginTop: 2, fontFamily: FONT_D }}>
        {plan.name} · ${plan.price}/mo
      </div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 2 }}>{plan.quota}</div>
    </div>
  ) : (
    <div style={{ marginTop: 14, padding: "10px 13px", background: T.amberSoft, borderRadius: 13 }}>
      <div style={{ fontSize: 10, color: T.amber, fontWeight: 800, letterSpacing: ".5px" }}>NO PLAN YET</div>
      <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>Pick a plan on the Billing page to get started.</div>
    </div>
  );

  // Single headline metric: blends coverage, NAP consistency, and live ratio into one 0-100 score.
  const visScore = (() => {
    const coverage = Math.min(100, (live / 60) * 100);
    const nap = napScore;
    const liveRatio = my.length ? (live / my.length) * 100 : 0;
    return Math.round(coverage * 0.4 + nap * 0.4 + liveRatio * 0.2);
  })();
  const visLabel = visScore >= 75 ? "Excellent" : visScore >= 50 ? "Good" : visScore >= 25 ? "Building" : "Getting started";
  const visColor = visScore >= 75 ? T.green : visScore >= 50 ? T.brand : visScore >= 25 ? T.amber : T.faint;
  // Home plan card: only show renew date from Stripe-synced currentPeriodEnd (no invented +1 month).
  const homePeriodEnd = (() => {
    if (!user.currentPeriodEnd) return { label: null, daysLeft: null, daysLeftLabel: null, pending: !!user.plan };
    const end = new Date(user.currentPeriodEnd);
    if (Number.isNaN(end.getTime())) return { label: null, daysLeft: null, daysLeftLabel: null, pending: !!user.plan };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(0, Math.round((endDay - start) / 86400000));
    return {
      label: end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      daysLeft,
      daysLeftLabel: daysLeft === 0 ? "Ends today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`,
      pending: false,
    };
  })();

  const liveNotifs = sysNotifs.filter((n) => !isPastMeetingNotif(n));
  const recentNotifs = liveNotifs.slice(0, 12).map((n) => ({
    id: n.id,
    kind: "sys",
    type: n.type,
    title: n.title,
    desc: n.body || n.title,
    date: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
    read: !!n.read,
  }));
  const unreadSys = liveNotifs.filter((n) => !n.read).length;
  const markAllRead = async () => {
    if (impersonating) return;
    const ids = liveNotifs.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await api.markNotificationsRead(ids);
    setSysNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const markOneRead = async (id) => {
    if (impersonating) return;
    const row = sysNotifs.find((n) => n.id === id);
    if (!row || row.read) return;
    await api.markNotificationsRead([id]);
    setSysNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };
  const notifTarget = (t) =>
    ({
      listing_live: "listings",
      nap_fix: "listings",
      edit_blocked: "listings",
      flagged: "listings",
      rejected: "listings",
      submitted: "listings",
      gmb_update: "gmb",
      analytics: "analytics",
      meeting_confirmed: "call",
      meeting_cancelled: "call",
      meeting_pending: "call",
      call_booked: "call",
      bdm_assigned: "call",
      message_sent: "messages",
      bdm_message: "messages",
      chat_message: "messages",
      plan_subscribed: "billing",
      plan_changed: "billing",
      plan_cancel_scheduled: "billing",
      plan_cancelled: "billing",
      plan_resumed: "billing",
      payment_failed: "billing",
      invoice_paid: "billing",
      welcome: "home",
    }[t] || "home");
  const notifIcon = (t) =>
    ({
      meeting_confirmed: "✅",
      meeting_cancelled: "❌",
      meeting_pending: "📅",
      call_booked: "📅",
      bdm_assigned: "👤",
      message_sent: "💬",
      bdm_message: "💬",
      chat_message: "💬",
      plan_subscribed: "💳",
      plan_changed: "🔄",
      plan_cancel_scheduled: "⛔",
      plan_cancelled: "⛔",
      plan_resumed: "✅",
      payment_failed: "⚠️",
      invoice_paid: "🧾",
      welcome: "👋",
      listing_live: "🟢",
      rejected: "❌",
      flagged: "🚩",
      nap_fix: "🔧",
    }[t] || "🔔");
  const grace = paymentGraceState(user);
  const graceAllowed = new Set(["billing", "settings", "messages", "notifications", "legal", "help"]);
  // After grace expires, keep user on billing (no effect — avoids hooks-after-return).
  const viewPage = grace.expired && !graceAllowed.has(page) ? "billing" : page;
  const goPage = (p) => {
    if (grace.expired && !graceAllowed.has(p)) {
      toast("Update your payment method to restore full access", "info");
      setPage("billing");
      return;
    }
    setPage(p);
  };

  const openNotif = async (a) => {
    setNotifOpen(false);
    if (a.kind === "sys") await markOneRead(a.id);
    goPage(notifTarget(a.type));
  };

  const clientCtx = {
    user, userId, data, reload, onLogout, impersonating, onUserUpdate,
    page: viewPage, setPage: goPage, toast, showManual, setShowManual, confirm, setConfirm,
    stripeConfigured, invoices, setInvoices, sysNotifs, setSysNotifs, notifOpen, setNotifOpen,
    chatUnread, setChatUnread, isMobile, R,
    my, myGmb, myAnalytics, myAct, settings, cfg, PLANSALL, PLANSV,
    live, pending, napScore, plan, greet, nav, planBadge, growthData, liveMomTrend,
    visScore, visLabel, visColor, homePeriodEnd,
    liveNotifs, recentNotifs, unreadSys, markAllRead, markOneRead, notifTarget, notifIcon, openNotif,
  };

  // Stable module components — <Home/> is safe (no remount flicker from inner const recreation).
  const homeHeaderLeft =
    viewPage === "home" ? (
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_D,
            fontSize: isMobile ? 20 : 26,
            fontWeight: 800,
            letterSpacing: "-.6px",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {greet}, {(user.name || "there").split(" ")[0]} 👋
        </div>
        <div
          style={{
            fontSize: isMobile ? 12 : 13.5,
            color: T.sub,
            marginTop: 2,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: isMobile ? "normal" : "nowrap",
          }}
        >
          Here's what we're doing for {user.businessName || "your business"} right now
        </div>
      </div>
    ) : null;
  const homeHeaderRight = (
    <>
      {viewPage === "home" && (
        <Btn variant="soft" size="sm" onClick={() => goPage("call")} style={{ whiteSpace: "nowrap" }}>
          📞 Talk to your BDM
        </Btn>
      )}
      <NotifBell />
    </>
  );

  return (
    <ClientContext.Provider value={clientCtx}>
      <Shell
        user={user}
        nav={nav}
        page={viewPage}
        setPage={goPage}
        onLogout={onLogout}
        planBadge={planBadge}
        showLegalLinks
        headerLeft={homeHeaderLeft}
        headerRight={homeHeaderRight}
        badgeCounts={{ notifications: unreadSys, messages: chatUnread }}
        settingsPageId={impersonating ? null : "settings"}
        contentPadding={
          viewPage === "legal"
            ? isMobile
              ? "6px 14px 4px"
              : "8px 34px 4px"
            : viewPage === "home"
              ? isMobile
                ? "14px 16px 40px"
                : "20px 34px 50px"
              : null
        }
      >
        {grace.pastDue && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: 14,
              borderRadius: 12,
              background: grace.expired ? T.redSoft : T.amberSoft,
              border: `1px solid ${grace.expired ? T.red : T.amber}33`,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: grace.expired ? T.red : T.amber }}>
                {grace.expired ? "Payment overdue — access limited" : "Payment failed"}
              </div>
              <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3, lineHeight: 1.45 }}>
                {grace.expired
                  ? "Your 5-day grace period ended. Update your card under Plan & Billing to restore access."
                  : `We couldn't charge your card. Plan stays active until ${grace.label}${grace.daysLeft != null ? ` (${grace.daysLeft} day${grace.daysLeft === 1 ? "" : "s"} left)` : ""}.`}
              </div>
            </div>
            <Btn variant="soft" size="sm" onClick={() => goPage("billing")}>Fix payment →</Btn>
          </div>
        )}
        {viewPage === "home" && <Home />}
        {viewPage === "notifications" && <NotificationsPage />}
        {viewPage === "messages" && (
          <div
            style={{
              height: isMobile ? "calc(100dvh - 140px)" : "calc(100vh - 100px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              margin: isMobile ? "-8px 0 -24px" : "-18px 0 -40px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <PageHead isMobile={isMobile} title="Messages" sub="Chat with your Business Development Manager" />
            </div>
            <div style={{ flex: 1, minHeight: 0, marginTop: -8, overflow: "hidden" }}>
              <ChatThread
                myId={userId}
                clientId={impersonating ? userId : undefined}
                readOnly={impersonating}
                toast={toast}
                onUnreadChange={impersonating ? undefined : setChatUnread}
                onOpenCall={() => goPage("call")}
                fill
              />
            </div>
          </div>
        )}
        {viewPage === "listings" && <Listings />}
        {viewPage === "gmb" && <Gmb />}
        {viewPage === "analytics" && <Analytics />}
        {viewPage === "billing" && <Billing />}
        {viewPage === "call" && (
          <ClientCallPage
            user={user}
            isMobile={isMobile}
            toast={toast}
            reload={reload}
            onOpenMessages={() => goPage("messages")}
            readOnly={impersonating}
          />
        )}
        {viewPage === "settings" && !impersonating && (
          <AccountSettings user={user} toast={toast} reload={reload} onUserUpdate={onUserUpdate} isMobile={isMobile} />
        )}
        {viewPage === "legal" && <ClientLegalPage isMobile={isMobile} />}
      </Shell>
      {/* Floating Help button — FAQs (tour stays first-login only) */}
      <button
        onClick={() => setShowHelp(true)}
        title="Help & FAQs"
        style={{
          position: "fixed",
          bottom: isMobile ? 18 : 24,
          right: isMobile ? 18 : 24,
          zIndex: 900,
          background: `linear-gradient(135deg,${T.brand},${T.violet})`,
          color: "#fff",
          border: "none",
          borderRadius: isMobile ? "50%" : 24,
          width: isMobile ? 52 : "auto",
          height: 52,
          padding: isMobile ? 0 : "0 20px",
          boxShadow: SHADOW_LG,
          cursor: "pointer",
          fontFamily: FONT_B,
          fontSize: 14,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>?</span>
        {!isMobile && <span>Help</span>}
      </button>
      {showManual && (
        <UserManual
          user={user}
          plan={plan}
          onClose={() => setShowManual(false)}
          goTo={(p) => {
            setPage(p);
            setShowManual(false);
          }}
        />
      )}
      {showHelp && (
        <HelpFaqs
          onClose={() => setShowHelp(false)}
          goTo={(p) => {
            setPage(p);
            setShowHelp(false);
          }}
        />
      )}
      {confirm && <Confirm data={confirm} onClose={() => setConfirm(null)} />}
      <Toasts />
    </ClientContext.Provider>
  );
}
