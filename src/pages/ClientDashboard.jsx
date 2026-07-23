// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { T, FONT_D, FONT_B, SHADOW_LG } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, planLive, planAllowsMessaging } from "../lib/constants";
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
  // No plan → still enter dashboard (browse all pages); actions stay locked until they pay.
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
  const [callKindPref, setCallKindPref] = useState(null); // "guidance" | "regular" | null
  const [guidanceBooked, setGuidanceBooked] = useState(false);
  const notifSig = useRef("");
  const w = useWindowSize();
  const isMobile = w < 820;
  // Prefer data.users (reload), then overlay userProp for optimistic patches (e.g. reportEmail).
  const fromData = (data?.users || []).find((u) => u.id === userProp?.id);
  // Prefer reload payload, but keep fresher signup/hydrate fields from userProp when present.
  const user = fromData
    ? {
        ...fromData,
        ...(["businessName", "phone", "address", "city", "state", "category", "website", "gbpId", "name"].reduce(
          (acc, k) => {
            const from = fromData?.[k];
            const prop = userProp?.[k];
            // Fill gaps from hydrate/signup only — never overwrite fresher reload data.
            if ((!from || String(from).trim() === "") && prop != null && String(prop).trim() !== "") {
              acc[k] = prop;
            }
            return acc;
          },
          {}
        )),
        ...(userProp?.reportEmail != null && userProp.reportEmail !== ""
          ? { reportEmail: userProp.reportEmail }
          : {}),
        ...(userProp?.notifyEmail !== undefined ? { notifyEmail: userProp.notifyEmail } : {}),
        ...(userProp?.notifyEmailPending !== undefined
          ? { notifyEmailPending: userProp.notifyEmailPending }
          : {}),
      }
    : userProp || {};
  const userId = user.id || userProp?.id || null;
  // True when client has no plan (staff impersonation uses its own read-only path).
  // Use live `user.plan` so webhook/reload unlocks actions without a full remount.
  const needsPlan = !user?.plan && !impersonating;
  // Async action runner: run fn, optionally toast, then refresh data. Used by billing actions.
  // Returns true on success, false on failure (and toasts the error).
  // Note: first-time Stripe Checkout does not go through R — Subscribe stays available.
  const R = async (fn, msg) => {
    if (impersonating) {
      toast("Read-only view — changes are disabled", "info");
      return false;
    }
    if (!user?.plan) {
      toast("Subscribe to a plan to use this feature", "info");
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
  // Confirm alternate notification email redirect (?notifyEmail=confirmed).
  useEffect(() => {
    if (impersonating) return;
    let cancelled = false;
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const ne = sp.get("notifyEmail");
        let addr = (sp.get("addr") || "").trim().toLowerCase();
        if (!addr) {
          try {
            const raw = sessionStorage.getItem("ro_notify_email_confirmed");
            if (raw) {
              const j = JSON.parse(raw);
              if (j?.email && Date.now() - (j.at || 0) < 10 * 60 * 1000) addr = String(j.email).toLowerCase();
              sessionStorage.removeItem("ro_notify_email_confirmed");
            }
          } catch { /* ignore */ }
        }
        if (!ne && !addr) return;
        // Only trust an explicit confirmed redirect from the email-link flow.
        if (ne === "confirmed") {
          const fresh = await api.currentUser();
          if (!cancelled && fresh) {
            onUserUpdate?.({
              notifyEmail: fresh.notifyEmail || addr || null,
              notifyEmailPending: fresh.notifyEmailPending || null,
            });
          } else if (addr) {
            onUserUpdate?.({ notifyEmail: addr, notifyEmailPending: null });
          }
          toast("Notification email confirmed. Alerts will go there.");
          setPage("settings");
          await reload?.();
        } else if (ne === "expired") toast("Confirmation link expired. Request a new one in Settings.", "info");
        else if (ne === "invalid" || ne === "missing") toast("That confirmation link is invalid.", "info");
        else if (ne === "error") toast("Could not confirm notification email.", "info");
        sp.delete("notifyEmail");
        sp.delete("addr");
        const q = sp.toString();
        window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [impersonating]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // First-login tour: once per account (localStorage by id+email, and profile.manualSeen).
  const markTourSeen = () => {
    if (!userId) return;
    const email = (user?.email || userProp?.email || "").trim().toLowerCase();
    try {
      localStorage.setItem("ro_manual_seen_" + userId, "1");
      if (email) localStorage.setItem("ro_manual_seen_email_" + email, "1");
      sessionStorage.setItem("ro_manual_seen_session_" + userId, "1");
    } catch { /* ignore */ }
    if (!user?.manualSeen) {
      api.patchProfile(userId, { manualSeen: true }).catch(() => {});
      onUserUpdate?.({ manualSeen: true });
    }
  };
  useEffect(() => {
    if (impersonating || !userId) return;
    if (user?.manualSeen) return;
    const email = (user?.email || userProp?.email || "").trim().toLowerCase();
    let seen = false;
    try {
      seen =
        localStorage.getItem("ro_manual_seen_" + userId) === "1" ||
        (email && localStorage.getItem("ro_manual_seen_email_" + email) === "1") ||
        sessionStorage.getItem("ro_manual_seen_session_" + userId) === "1";
    } catch { /* ignore */ }
    if (seen) {
      // Keep profile in sync when browser already finished the tour.
      api.patchProfile(userId, { manualSeen: true }).catch(() => {});
      onUserUpdate?.({ manualSeen: true });
      return;
    }
    setShowManual(true);
    // Persist immediately so Skip/refresh/sign-out still counts as "already shown".
    markTourSeen();
  }, [userId, impersonating]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Chat unread badge — poll while not on Messages (Growth / GMB Pro only).
  const pageRef = useRef(page);
  pageRef.current = page;
  const messagingAllowed = planAllowsMessaging(user?.plan);
  useEffect(() => {
    if (impersonating || !userId || !messagingAllowed) {
      setChatUnread(0);
      return;
    }
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
  }, [userId, impersonating, messagingAllowed]);

  // Guidance onboarding banner — confirm via bookings API (source of truth).
  useEffect(() => {
    if (impersonating || !userId || !user?.plan) {
      setGuidanceBooked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await api.getMyBdm();
      if (cancelled) return;
      const used = (r.quota?.guidance?.used || 0) > 0;
      const upcoming = (r.bookings || []).some((b) => b.kind === "guidance");
      setGuidanceBooked(used || upcoming);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, user?.plan, impersonating, page, data?.activity?.length]);

  if (!data || !userId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.sub, fontFamily: FONT_B }}>
        Loading your dashboard…
      </div>
    );
  }
  const my = ((data.listings && data.listings[userId]) || []).filter((l) => !l.deletedAt);
  const myGmb = (data.gmb && data.gmb[userId]) || null;
  const myAnalytics = (data.analytics && data.analytics[userId]) || null;
  // Hide staff-only internal logs (unauthorized-edit notes not shared with client).
  const myAct = (Array.isArray(data.activity) ? data.activity : []).filter(
    (a) => a.clientId === userId && a.type !== "edit_blocked_internal"
  );
  // Onboarding banner: hide once a guidance meeting is booked (or first listing exists).
  const guidanceFromNotifs = sysNotifs.some((n) => n?.meta?.kind === "guidance");
  const guidanceFromActivity = myAct.some((a) => /guidance\s+call/i.test(String(a.desc || "")));
  const showSetupBanner =
    !!user.plan && my.length === 0 && !guidanceBooked && !guidanceFromNotifs && !guidanceFromActivity;
  const canMessage = planAllowsMessaging(user.plan);
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
  // Browse every area even without a plan; GMB/Messages stay visible as locked previews.
  const nav = [
    { id: "home", icon: "chart", label: "Home" },
    { id: "notifications", icon: "bell", label: "Notifications" },
    ...(canMessage || needsPlan ? [{ id: "messages", icon: "message", label: "Messages" }] : []),
    { id: "listings", icon: "listing", label: "Listings" },
    { id: "analytics", icon: "analytics", label: "Analytics" },
    ...(user.plan === "gmb" || needsPlan ? [{ id: "gmb", icon: "globe", label: "GMB" }] : []),
    { id: "billing", icon: "billing", label: "Plan & Billing" },
    { id: "call", icon: "message", label: "Book a Call" },
  ];
  // Product actions locked until plan (and while staff is impersonating).
  const viewOnly = needsPlan || impersonating;
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
  // Grace expired → billing only. No-plan clients may browse every page (actions locked).
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
    user, userId, data, reload, onLogout, impersonating, needsPlan, viewOnly, onUserUpdate,
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
      {viewPage === "home" && !viewOnly && (
        <Btn variant="soft" size="sm" onClick={() => goPage("call")} style={{ whiteSpace: "nowrap" }}>
          📞 Talk to your BDM
        </Btn>
      )}
      {viewPage === "home" && needsPlan && (
        <Btn size="sm" onClick={() => goPage("billing")} style={{ whiteSpace: "nowrap" }}>
          Choose a plan →
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
              : showSetupBanner || grace.pastDue
                ? isMobile
                  ? "10px 16px 40px"
                  : "14px 34px 50px"
                : null
        }
      >
        {showSetupBanner && (
          <div
            style={{
              padding: "14px 16px",
              marginTop: viewPage === "home" ? 0 : -4,
              marginBottom: 16,
              borderRadius: 14,
              background: `linear-gradient(135deg,${T.brandSoft},#fff)`,
              border: `1px solid ${T.brand}33`,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.brand, fontFamily: FONT_D }}>
                Schedule your guidance meeting
              </div>
              <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4, lineHeight: 1.45 }}>
                Book a guidance call with a senior BDM to get onboarded. This disappears once your guidance meeting is booked.
              </div>
            </div>
            <Btn size="sm" onClick={() => { setCallKindPref("guidance"); goPage("call"); }}>Book guidance call →</Btn>
          </div>
        )}
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
        {viewPage === "messages" && (canMessage || needsPlan) && (
          <div
            style={{
              height: isMobile ? "calc(100dvh - 140px)" : "calc(100vh - 100px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              // Negative top margin hugs the header — skip it when a banner sits above so titles don't overlap.
              margin: (showSetupBanner || grace.pastDue)
                ? (isMobile ? "0 0 -24px" : "0 0 -40px")
                : (isMobile ? "-8px 0 -24px" : "-18px 0 -40px"),
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
                readOnly={viewOnly}
                toast={toast}
                onUnreadChange={viewOnly ? undefined : setChatUnread}
                onOpenCall={() => goPage("call")}
                fill
              />
            </div>
          </div>
        )}
        {viewPage === "messages" && !canMessage && !needsPlan && (
          <div>
            <PageHead isMobile={isMobile} title="Messages" sub="Chat with your Business Development Manager" />
            <div
              style={{
                padding: "28px 22px",
                borderRadius: 16,
                background: T.amberSoft,
                border: `1px solid ${T.amber}33`,
                maxWidth: 520,
              }}
            >
              <div style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 800, color: T.amber, marginBottom: 8 }}>
                Upgrade to chat with your BDM
              </div>
              <div style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.55, marginBottom: 16 }}>
                Chat with your BDM is available on Growth and GMB Pro. Upgrade your plan to unlock Messages.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => goPage("billing")}>View plans →</Btn>
                <Btn variant="soft" onClick={() => goPage("call")}>Book a call instead</Btn>
              </div>
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
            readOnly={viewOnly}
            needsPlan={needsPlan}
            initialKind={callKindPref || "regular"}
            onInitialKindConsumed={() => setCallKindPref(null)}
          />
        )}
        {viewPage === "settings" && !impersonating && (
          <AccountSettings
            user={user}
            toast={toast}
            reload={reload}
            onUserUpdate={onUserUpdate}
            isMobile={isMobile}
            readOnly={needsPlan}
          />
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
          onClose={() => {
            markTourSeen();
            setShowManual(false);
          }}
          goTo={(p) => {
            markTourSeen();
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
