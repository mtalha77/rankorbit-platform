// ─── LANDING PAGE ────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT_B } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS } from "../lib/constants";
import { STAFF_ROLES } from "../lib/helpers";
import { useWindowSize } from "../hooks";
import {
  LandingNav,
  LandingHero,
  LandingMarquee,
  LandingByTheNumbers,
  LandingAiDiscovery,
  LandingBento,
  LandingHowItWorks,
  LandingDashboardTour,
  LandingStories,
  LandingPricing,
  LandingFinalCta,
  LandingFooter,
} from "../components/landing";

export default function LandingPage({ user = null, focusPricing = false, billingFlag = null }) {
  const nav = useNavigate();
  const w = useWindowSize();
  const isMobile = w < 768;
  const isTab = w >= 768 && w < 1024;
  const [planBusy, setPlanBusy] = useState(null);
  const [planErr, setPlanErr] = useState("");
  const isStaff = !!(user && STAFF_ROLES.includes(user.role));
  const scrollPricing = () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goLogin = () => nav("/login");
  const goSignup = () => nav("/signup");
  // Staff → admin. Clients with a plan → dashboard. Clients without → pricing.
  const goDash = () => {
    if (isStaff) { nav("/admin"); return; }
    if (user?.plan) nav("/dashboard");
    else scrollPricing();
  };
  // Logged-in + no plan → Stripe checkout from landing. Guest → signup with plan intent.
  // Staff never buy plans from the marketing site.
  const goPlan = async (planId) => {
    setPlanErr("");
    if (isStaff) { nav("/admin"); return; }
    if (user?.plan === planId) return;
    if (user?.plan) { nav("/dashboard"); return; }
    try { sessionStorage.setItem("ro_pending_plan", planId); } catch {}
    if (!user) { nav(`/signup?plan=${encodeURIComponent(planId)}`); return; }
    setPlanBusy(planId);
    const r = await api.createCheckout(planId);
    setPlanBusy(null);
    if (r.error) { setPlanErr(r.error); scrollPricing(); return; }
    if (r.url) window.location.href = r.url;
  };
  useEffect(() => {
    if (isStaff) nav("/admin", { replace: true });
  }, [isStaff, nav]);
  useEffect(() => {
    if (isStaff) return;
    if (focusPricing || billingFlag === "cancel") {
      const t = setTimeout(scrollPricing, 120);
      return () => clearTimeout(t);
    }
    try {
      if (user && !user.plan && sessionStorage.getItem("ro_pending_plan")) {
        const t = setTimeout(scrollPricing, 200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [focusPricing, billingFlag, user, isStaff]);
  const displayName = (user?.name || user?.email || "Account").split(" ")[0];
  const avatarLetter = (user?.avatar || displayName?.[0] || "U").toString().slice(0, 1).toUpperCase();
  // Load which plans are live + any price overrides (set by super-admin control panel).
  const [cfg, setCfg] = useState({});
  useEffect(() => { (async () => { try { const s = await api.getSettings?.(); if (s?.config) setCfg(s.config); } catch {} })(); }, []);
  const [navSolid, setNavSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const lprice = (id) => {
    const m = { essentials: "priceEssentials", growth: "priceGrowth", gmb: "priceGmb" };
    const v = cfg[m[id]];
    return v != null && v !== "" ? Number(v) : PLANS[id]?.price;
  };

  // Don't flash marketing / plan CTAs while bouncing staff to /admin.
  if (isStaff) return null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT_B, color: T.ink, overflowX: "hidden" }}>
      <LandingNav isMobile={isMobile} navSolid={navSolid} user={user} isStaff={isStaff} avatarLetter={avatarLetter} displayName={displayName} goDash={goDash} goLogin={goLogin} goSignup={goSignup} />
      <main>
        <LandingHero isMobile={isMobile} isTab={isTab} user={user} goDash={goDash} goSignup={goSignup} />
        <LandingMarquee isMobile={isMobile} />
        <LandingByTheNumbers isMobile={isMobile} />
        <LandingAiDiscovery isMobile={isMobile} />
        <LandingBento isMobile={isMobile} />
        <LandingHowItWorks isMobile={isMobile} />
        <LandingDashboardTour isMobile={isMobile} />
        <LandingStories isMobile={isMobile} />
        <LandingPricing isMobile={isMobile} isTab={isTab} w={w} user={user} cfg={cfg} lprice={lprice} goPlan={goPlan} planBusy={planBusy} planErr={planErr} billingFlag={billingFlag} />
        <LandingFinalCta isMobile={isMobile} user={user} goDash={goDash} goSignup={goSignup} />
      </main>
      <LandingFooter isMobile={isMobile} isTab={isTab} user={user} nav={nav} goDash={goDash} goLogin={goLogin} goSignup={goSignup} scrollPricing={scrollPricing} />
    </div>
  );
}
