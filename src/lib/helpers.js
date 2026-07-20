// ─── SHARED HELPERS ──────────────────────────────────────────────────────────
// Small pure utilities used across dashboards and modals.
export const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
export const todayFull=()=>new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
export const nextMonthFirst=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1).toISOString();};
export const uid=()=>(crypto.randomUUID?crypto.randomUUID():"id"+Date.now()+Math.random());

/** Map listing napMatch badge → numeric score (matches server/googleGbp.js). */
function napMatchToScore(napMatch){
  if(napMatch==="match")return 100;
  if(napMatch==="fixed")return 80;
  if(napMatch==="mismatch")return 40;
  return null;
}

/** Average NAP score from live listings that have a napMatch value. */
export function computeNapScoreFromListings(listings){
  const live=(listings||[]).filter(l=>!l.deletedAt&&l.status==="live"&&l.napMatch&&l.napMatch!=="–");
  if(!live.length)return null;
  const scores=live.map(l=>napMatchToScore(l.napMatch)).filter(s=>s!=null);
  if(!scores.length)return null;
  return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
}

/**
 * Display NAP: profile.napScore is written by both paths
 * (listing auto-sync + admin manual save). Prefer profile when set;
 * fall back to a live listing average only before the first sync.
 */
export function resolveNapScore(profileScore,listings){
  const n=Number(profileScore);
  if(Number.isFinite(n)&&n>0)return n;
  const computed=computeNapScoreFromListings(listings);
  if(computed!=null)return computed;
  return Number.isFinite(n)?n:0;
}

/** Convert stored liveDate display ("Jul 5" / "Jul 5, 2026") → YYYY-MM-DD for <input type="date"/>. */
export function toDateInputValue(display){
  if(!display||display==="–"||display==="-")return"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(display))return display;
  const d=new Date(display);
  if(Number.isNaN(d.getTime()))return"";
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return`${y}-${m}-${day}`;
}
/** Convert YYYY-MM-DD from calendar → display string stored in DB. */
export function fromDateInputValue(iso){
  if(!iso)return"–";
  const[y,m,d]=iso.split("-").map(Number);
  if(!y||!m||!d)return"–";
  return new Date(y,m-1,d).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
}

/** Parse Book-a-Call slot ("July 15, 2026" + "9:00 AM") → Date, or null. */
export function parseBookingSlot(slotDate, slotTime) {
  if (!slotDate || !slotTime) return null;
  const d = new Date(`${String(slotDate).trim()} ${String(slotTime).trim()}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the 30-min meeting slot has already ended. */
export function isBookingPast(slotDate, slotTime, now = new Date()) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() + 30 * 60 * 1000 <= now.getTime();
}

export const CALL_SLOT_TIMES = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];

export function isSlotStillOpen(slotDate, slotTime, now = new Date(), bufferMs = 5 * 60 * 1000) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() > now.getTime() + bufferMs;
}

export function slotKey(slotDate, slotTime) {
  return `${String(slotDate || "").trim()}|${String(slotTime || "").trim()}`;
}

/** Meeting-related notification whose slot is over. */
export function isPastMeetingNotif(n) {
  const t = n?.type;
  if (t !== "call_booked" && t !== "meeting_confirmed" && t !== "meeting_pending") return false;
  return isBookingPast(n?.meta?.slotDate, n?.meta?.slotTime);
}

/** Parse listing liveDate → timestamp, or null if missing/invalid. */
export function listingGoLiveAt(listing, fallbackMs = null) {
  const iso = toDateInputValue(listing?.liveDate);
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d).getTime();
  }
  return fallbackMs;
}

/**
 * Last N months of cumulative live listings from current listing rows + liveDate.
 * Listings without a parseable liveDate count from the start of the current month.
 */
export function buildLiveGrowthSeries(listings, months = 5, now = new Date()) {
  const liveOnes = (listings || []).filter((l) => l.status === "live");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const goLiveTimes = liveOnes.map((l) => listingGoLiveAt(l, monthStart));

  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    series.push({
      m: d.toLocaleString("en-US", { month: "short" }),
      live: goLiveTimes.filter((t) => t != null && t <= end).length,
    });
  }
  if (series.length) series[series.length - 1].live = liveOnes.length;
  return series;
}

/**
 * Staff overview bars: new go-lives per month (`n`) + cumulative live (`l`) from liveDate.
 */
export function buildListingsActivitySeries(listings, months = 5, now = new Date()) {
  const liveOnes = (listings || []).filter((l) => l.status === "live");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const goLiveTimes = liveOnes.map((l) => listingGoLiveAt(l, monthStart));

  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    series.push({
      m: d.toLocaleString("en-US", { month: "short" }),
      n: goLiveTimes.filter((t) => t != null && t >= start && t <= end).length,
      l: goLiveTimes.filter((t) => t != null && t <= end).length,
    });
  }
  if (series.length) series[series.length - 1].l = liveOnes.length;
  return series;
}

/** % change last month → this month from a growth series. null when not meaningful. */
export function growthMomTrend(series) {
  if (!series || series.length < 2) return null;
  const prev = Number(series[series.length - 2]?.live) || 0;
  const cur = Number(series[series.length - 1]?.live) || 0;
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Month-over-month % from GMB trend rows (`v` views, `c` calls, `d` directions). */
export function gmbMomTrend(series, key) {
  if (!series || series.length < 2 || !key) return null;
  const prev = Number(series[series.length - 2]?.[key]) || 0;
  const cur = Number(series[series.length - 1]?.[key]) || 0;
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

// Password policy: exactly 8 chars, upper+lower+number+symbol.
export function passwordIssues(pw){
  const issues=[];
  if(!pw||pw.length!==8)issues.push("exactly 8 characters");
  if(!/[A-Z]/.test(pw))issues.push("an uppercase letter");
  if(!/[a-z]/.test(pw))issues.push("a lowercase letter");
  if(!/[0-9]/.test(pw))issues.push("a number");
  if(!/[^A-Za-z0-9]/.test(pw))issues.push("a symbol");
  return issues;
}
export function passwordScore(pw){
  if(!pw)return 0;
  let s=0;
  if(pw.length===8)s++;
  if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))s++;
  if(/[0-9]/.test(pw))s++;
  if(/[^A-Za-z0-9]/.test(pw))s++;
  return Math.min(s,4); // 0-4
}
// STAFF roles can never be created via public signup, enforced here AND by DB trigger.
export const STAFF_ROLES=["super_admin","manager","agent"];
// Master switch: flip to false at go-live to hide all demo quick-fill buttons.
export const SHOW_DEMOS=(import.meta.env.VITE_SHOW_DEMOS!=="false");

// Activity-type → icon.
export const actIcon=(t)=>({listing_live:"🟢",nap_fix:"🔧",edit_blocked:"🛡️",edit_blocked_internal:"🛡️",flagged:"🚩",rejected:"❌",gmb_update:"📍",submitted:"📤",analytics:"📈",client:"👤"}[t]||"⚡");
// Client-facing anonymizer: clients never see staff names, only "Account Manager".
// "System" stays as-is. Used everywhere the client can see a "by" attribution.
export const clientBy=(by)=>(!by||by==="System"?(by||""):"Account Manager");

