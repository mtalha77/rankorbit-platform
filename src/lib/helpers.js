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

/** Filter a notification by createdAt against YYYY-MM-DD from/to inputs (inclusive). */
export function notifMatchesDateRange(n, fromIso, toIso){
  if(!fromIso&&!toIso)return true;
  const t=n?.createdAt?new Date(n.createdAt).getTime():NaN;
  if(Number.isNaN(t))return false;
  if(fromIso){
    const[y,m,d]=fromIso.split("-").map(Number);
    if(y&&m&&d&&t<new Date(y,m-1,d).getTime())return false;
  }
  if(toIso){
    const[y,m,d]=toIso.split("-").map(Number);
    if(y&&m&&d&&t>new Date(y,m-1,d,23,59,59,999).getTime())return false;
  }
  return true;
}

/** Local YYYY-MM-DD for today (for date inputs / presets). */
export function todayIso(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return`${y}-${m}-${day}`;
}

/** YYYY-MM-DD for N days ago (local). */
export function daysAgoIso(days){
  const d=new Date();
  d.setDate(d.getDate()-days);
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return`${y}-${m}-${day}`;
}

/** Payment-failed grace: 5 days of access after first fail. */
export function paymentGraceState(user){
  const pastDue=user?.subscriptionStatus==="past_due"||!!user?.paymentFailedAt;
  if(!pastDue)return{pastDue:false,inGrace:false,expired:false,endsAt:null,daysLeft:null,label:""};
  const ends=user?.paymentGraceEndsAt?new Date(user.paymentGraceEndsAt):null;
  const validEnds=ends&&!Number.isNaN(ends.getTime())?ends:null;
  if(!validEnds){
    return{pastDue:true,inGrace:true,expired:false,endsAt:null,daysLeft:null,label:"Payment failed — update your card soon."};
  }
  const daysLeft=Math.max(0,Math.ceil((validEnds.getTime()-Date.now())/86400000));
  const label=validEnds.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  if(daysLeft>0){
    return{pastDue:true,inGrace:true,expired:false,endsAt:validEnds,daysLeft,label};
  }
  return{pastDue:true,inGrace:false,expired:true,endsAt:validEnds,daysLeft:0,label};
}

function startOfLocalDay(d=new Date()){
  const x=new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

/** Whole days from today until date (0 if today/past). */
export function daysUntil(date){
  if(date==null||date==="")return null;
  const end=date instanceof Date?date:new Date(date);
  if(Number.isNaN(end.getTime()))return null;
  const a=startOfLocalDay();
  const b=startOfLocalDay(end);
  return Math.max(0,Math.round((b-a)/86400000));
}

/** Whole days since date until today (0 if today/future). */
export function daysSince(date){
  if(date==null||date==="")return null;
  const start=date instanceof Date?date:new Date(date);
  if(Number.isNaN(start.getTime()))return null;
  const a=startOfLocalDay(start);
  const b=startOfLocalDay();
  return Math.max(0,Math.round((b-a)/86400000));
}

/**
 * Parse loose listing/UI dates: ISO, "Mar 1", "Mar 1, 2025", "July 15, 2026".
 * Yearless short dates assume current year (rollover if >31 days in future).
 */
export function parseLooseDate(str){
  if(str==null||str===""||str==="–"||str==="-")return null;
  if(str instanceof Date)return Number.isNaN(str.getTime())?null:str;
  const raw=String(str).trim();
  if(!raw)return null;
  const iso=new Date(raw);
  if(!Number.isNaN(iso.getTime())&&(/^\d{4}-\d{2}-\d{2}/.test(raw)||raw.includes("T")))return iso;
  const withYear=new Date(raw);
  if(!Number.isNaN(withYear.getTime())&&/\d{4}/.test(raw))return withYear;
  // "Mar 1" / "Mar 1, 2025" without relying on year in string
  const y=new Date().getFullYear();
  let d=new Date(`${raw}, ${y}`);
  if(Number.isNaN(d.getTime()))d=new Date(raw);
  if(Number.isNaN(d.getTime()))return null;
  if(!/\d{4}/.test(raw)){
    const ahead=(startOfLocalDay(d)-startOfLocalDay())/86400000;
    if(ahead>31)d=new Date(`${raw}, ${y-1}`);
  }
  return Number.isNaN(d.getTime())?null:d;
}

/**
 * Admin Clients list: plan renew, grace, oldest pending listing age, Needs-BDM wait.
 * urgencyDays = most pressing (lower = more urgent). Grace expired sorts first.
 */
export function clientDaysMetrics(client,listings=[]){
  const empty={
    planDaysLeft:null,
    graceDaysLeft:null,
    graceExpired:false,
    listingPendingDays:null,
    bdmWaitDays:null,
    urgencyDays:null,
    urgencyKind:null,
    urgencyLabel:null,
    chips:[],
  };
  if(!client)return empty;

  const planDaysLeft=client.plan&&client.currentPeriodEnd?daysUntil(client.currentPeriodEnd):null;
  const grace=paymentGraceState(client);
  const graceExpired=!!grace.expired;
  const graceDaysLeft=grace.pastDue?(graceExpired?0:grace.daysLeft):null;

  let listingPendingDays=null;
  for(const l of listings||[]){
    if(!l||(l.status!=="pending"&&l.status!=="submitted"))continue;
    const age=daysSince(parseLooseDate(l.submitted));
    if(age==null)continue;
    if(listingPendingDays==null||age>listingPendingDays)listingPendingDays=age;
  }

  const needsBdm=!!(client.plan&&!client.assignedBdmId);
  const bdmWaitDays=needsBdm
    ?daysSince(client.currentPeriodStart||client.createdAt)
    :null;

  // sortKey: lower = more urgent. Plan/grace = days left; listing/BDM wait = -days (longer wait first).
  const chips=[];
  if(graceExpired)chips.push({kind:"grace",days:0,label:"Grace over",sortKey:-1000});
  else if(graceDaysLeft!=null)chips.push({kind:"grace",days:graceDaysLeft,label:`${graceDaysLeft}d grace`,sortKey:graceDaysLeft});
  if(planDaysLeft!=null)chips.push({kind:"plan",days:planDaysLeft,label:`${planDaysLeft}d plan`,sortKey:planDaysLeft});
  if(listingPendingDays!=null)chips.push({kind:"listing",days:listingPendingDays,label:`${listingPendingDays}d listing`,sortKey:-listingPendingDays});
  if(bdmWaitDays!=null)chips.push({kind:"bdm",days:bdmWaitDays,label:`${bdmWaitDays}d BDM`,sortKey:-bdmWaitDays});

  if(!chips.length)return{...empty,planDaysLeft,graceDaysLeft,graceExpired,listingPendingDays,bdmWaitDays};

  chips.sort((a,b)=>{
    if(a.kind==="grace"&&b.kind!=="grace")return-1;
    if(b.kind==="grace"&&a.kind!=="grace")return 1;
    return a.sortKey-b.sortKey;
  });
  const top=chips[0];
  return{
    planDaysLeft,
    graceDaysLeft,
    graceExpired,
    listingPendingDays,
    bdmWaitDays,
    urgencyDays:top.days,
    urgencyKind:top.kind,
    urgencyLabel:top.label,
    urgencySortKey:top.sortKey,
    chips,
  };
}

/**
 * True if listing falls in a relative window (all | 7 | 30 | 90).
 * Uses submitted date, then liveDate. Unparseable dates pass through (kept visible).
 */
export function listingInDateWindow(listing,timeF="all"){
  if(!timeF||timeF==="all")return true;
  const daysMax=Number(timeF);
  if(!daysMax)return true;
  const d=parseLooseDate(listing?.submitted)||parseLooseDate(listing?.liveDate);
  if(!d)return true;
  const age=(Date.now()-d.getTime())/86400000;
  return age<=daysMax&&age>=-1;
}

/** Shared toolbar options for listing date filters. */
export const LISTING_DATE_FILTER_OPTS=[
  {value:"all",label:"All time"},
  {value:"7",label:"Last 7 days"},
  {value:"30",label:"Last 30 days"},
  {value:"90",label:"Last 90 days"},
];

/**
 * Color for urgency days.
 * Plan/grace (days left): red ≤3, amber ≤7.
 * Listing/BDM wait (days elapsed): red ≥14, amber ≥7.
 */
export function urgencyDaysColor(days,graceExpired=false,kind=null){
  if(graceExpired)return"red";
  if(days==null)return"ok";
  if(kind==="listing"||kind==="bdm"){
    if(days>=14)return"red";
    if(days>=7)return"amber";
    return"ok";
  }
  if(days<=3)return"red";
  if(days<=7)return"amber";
  return"ok";
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

/** Minimum lead time before a slot can be booked (all plans). */
export const BOOKING_LEAD_MS = 24 * 60 * 60 * 1000;

export function isSlotBeyondLead(slotDate, slotTime, now = new Date(), leadMs = BOOKING_LEAD_MS) {
  const start = parseBookingSlot(slotDate, slotTime);
  if (!start) return false;
  return start.getTime() >= now.getTime() + leadMs;
}

/** Open for booking: not past buffer AND meets 24h lead. */
export function isSlotBookable(slotDate, slotTime, now = new Date()) {
  return isSlotStillOpen(slotDate, slotTime, now) && isSlotBeyondLead(slotDate, slotTime, now);
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

/** Random 8-char password that always passes passwordIssues (login maxLength=8). */
export function generatePassword(){
  const upper="ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower="abcdefghijkmnpqrstuvwxyz";
  const digits="23456789";
  const symbols="!@#$%&*";
  const pick=(s)=>s[Math.floor(Math.random()*s.length)];
  // Guarantee one of each required class, then fill + shuffle.
  const chars=[pick(upper),pick(lower),pick(digits),pick(symbols)];
  const all=upper+lower+digits+symbols;
  while(chars.length<8)chars.push(pick(all));
  for(let i=chars.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [chars[i],chars[j]]=[chars[j],chars[i]];
  }
  return chars.join("");
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
// BDM = client-facing assignee; Agent = backend ops assignee (separate).
export const STAFF_ROLES=["super_admin","manager","bdm","agent"];
export const isBdmRole=(role)=>role==="bdm";
export const isAgentRole=(role)=>role==="agent";
export const staffRoleLabel=(role)=>{
  if(role==="super_admin")return"Super Admin";
  if(role==="manager")return"Manager";
  if(role==="bdm")return"BDM";
  if(role==="agent")return"Agent";
  return role||"Staff";
};
/** Human-readable labels for audit trail action codes. */
export const auditActionLabel=(action)=>{
  const map={
    "agent.assign":"Assign clients (Agent)",
    "bdm.assign":"Assign BDM",
    "staff.create":"Invite team member",
    "staff.perms":"Update permissions",
    "staff.delete":"Remove team member",
    "grant.impersonate":"Account view access",
    "settings.update":"Update settings",
    "client.impersonate":"View client account",
    "client.suspend":"Suspend client",
    "client.reactivate":"Reactivate client",
    "client.delete":"Delete client",
    "client.restore":"Restore client",
    "client.purge":"Permanently delete client",
    "listing.edit":"Update listing",
    "listing.delete":"Delete listing",
    "listing.restore":"Restore listing",
    "listing.purge":"Permanently delete listing",
    "nap.update":"Update NAP score",
    "edit.revert":"Log unauthorized edit",
    "report.sent":"Mark GMB report sent",
  };
  if(map[action])return map[action];
  if(!action)return"–";
  // Fallback: "foo.bar" → "Foo bar"
  return String(action).replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
};
// Master switch: flip to false at go-live to hide all demo quick-fill buttons.
export const SHOW_DEMOS=(import.meta.env.VITE_SHOW_DEMOS!=="false");

// Activity-type → icon.
export const actIcon=(t)=>({listing_live:"🟢",nap_fix:"🔧",edit_blocked:"🛡️",edit_blocked_internal:"🛡️",flagged:"🚩",rejected:"❌",gmb_update:"📍",submitted:"📤",analytics:"📈",client:"👤"}[t]||"⚡");
// Client-facing anonymizer: clients never see staff names, only "Account Manager".
// "System" stays as-is. Used everywhere the client can see a "by" attribution.
export const clientBy=(by)=>(!by||by==="System"?(by||""):"Account Manager");

