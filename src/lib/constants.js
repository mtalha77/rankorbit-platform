// ─── PRODUCT CONSTANTS ───────────────────────────────────────────────────────
import { T } from "./theme";

/** Legacy plan id `gmb` → `pro`. */
export const normalizePlanId = (id) => (id === "gmb" ? "pro" : id);
export const isProPlan = (id) => normalizePlanId(id) === "pro";

export const PLANS={essentials:{name:"Essentials Plan",price:49,quota:"10 listings/mo",color:T.blue,soft:T.blueSoft,features:["10 directory submissions every month","NAP consistency management","Unauthorized edit protection","1 regular + 1 guidance call / billing period","Listing monitoring & alerts","Client dashboard access"]},
  growth:{name:"Growth Plan",price:89,quota:"20 listings/mo",color:T.brand,soft:T.brandSoft,features:["20 directory submissions every month","Everything in Essentials Plan","BDM chat support (Messages)","2 regular + 1 guidance call / billing period","Expanded directory coverage","Monthly coverage report"]},
  pro:{name:"Pro Plan",price:99,quota:"15 listings/mo + GMB",color:T.violet,soft:T.violetSoft,features:["15 directory submissions every month","Google Business Profile management","BDM chat support (Messages)","3 regular + 1 guidance call / billing period","Monthly GMB posts & Q&A","Engagement analytics (views, calls)"]},
  "test-plan":{name:"Test Plan",price:1,quota:"1 listing/mo",color:T.amber,soft:T.amberSoft,features:["$1 Stripe test checkout","1 directory submission every month","Client dashboard access","1 regular + 1 guidance call / billing period"]}};

/** Default marketing discount % (charged price stays planPrice; list/was = price ÷ (1 − pct/100)). */
const DEFAULT_DISCOUNT_PCT={essentials:10,growth:25,pro:25,"test-plan":0};
const DISCOUNT_PCT_KEYS={essentials:"discountEssentials",growth:"discountGrowth",pro:"discountGmb","test-plan":"discountTestPlan"};
const DISCOUNT_ON_KEYS={essentials:"discountEssentialsOn",growth:"discountGrowthOn",pro:"discountGmbOn","test-plan":"discountTestPlanOn"};

/** Discount % for a plan from Control Panel, else defaults. */
export const planDiscountPct=(id,cfg={})=>{
  const nid=normalizePlanId(id);
  const key=DISCOUNT_PCT_KEYS[nid];
  const v=key?cfg[key]:null;
  if(v!=null&&v!==""){const n=Number(v);if(Number.isFinite(n)&&n>0&&n<100)return n;}
  return DEFAULT_DISCOUNT_PCT[nid]??0;
};

/** Whether the plan discount badge is shown. Default on. */
export const planDiscountOn=(id,cfg={})=>{
  const nid=normalizePlanId(id);
  const key=DISCOUNT_ON_KEYS[nid];
  const v=key?cfg[key]:undefined;
  if(v===undefined||v===null)return true;
  return v===true||v==="true";
};

/**
 * Pre-discount “was” price for display, or null when discount is off.
 * pct is true “off” from the list price: $20 @ 50% → was $40 (because 50% of 40 = 20).
 * Whole dollars only (avoid "$54.44" marketing list prices).
 */
export const planListPrice=(id,cfg={})=>{
  if(!planDiscountOn(id,cfg))return null;
  const pct=planDiscountPct(id,cfg);
  if(!pct)return null;
  const now=planPrice(id,cfg);
  if(!now)return null;
  return Math.round(now/(1-pct/100));
};

export const formatMoney=(n)=>{
  if(!Number.isFinite(n))return"0";
  const r=Math.round(n*100)/100;
  return Number.isInteger(r)?String(r):r.toFixed(2);
};

/** Meeting quotas + messaging per plan (billing period). Keep in sync with server/planEntitlements.js */
export const PLAN_ENTITLEMENTS={
  essentials:{regularMeetings:1,guidanceMeetings:1,messaging:false},
  growth:{regularMeetings:2,guidanceMeetings:1,messaging:true},
  pro:{regularMeetings:3,guidanceMeetings:1,messaging:true},
  "test-plan":{regularMeetings:1,guidanceMeetings:1,messaging:false},
};
export const getPlanEntitlements=(planId)=>PLAN_ENTITLEMENTS[normalizePlanId(planId)]||PLAN_ENTITLEMENTS.essentials;
export const planAllowsMessaging=(planId)=>!!getPlanEntitlements(planId).messaging;

/** Tier order for upgrade/downgrade rules (higher = higher plan). */
export const PLAN_RANK={"test-plan":0,essentials:1,growth:2,pro:3};
export const isPlanDowngrade=(fromId,toId)=>(PLAN_RANK[normalizePlanId(toId)]||0)<(PLAN_RANK[normalizePlanId(fromId)]||0);

const PRICE_CFG_KEYS={essentials:"priceEssentials",growth:"priceGrowth",pro:"priceGmb","test-plan":"priceTestPlan"};

/** Display price: control-panel override when set, else PLANS default. */
export const planPrice=(id,cfg={})=>{
  const nid=normalizePlanId(id);
  const key=PRICE_CFG_KEYS[nid];
  const v=key?cfg[key]:null;
  if(v!=null&&v!==""){const n=Number(v);if(Number.isFinite(n))return n;}
  return PLANS[nid]?.price??0;
};

/** PLANS entries with prices resolved from settings config. */
export const plansWithPrices=(cfg={})=>Object.fromEntries(
  Object.entries(PLANS).map(([id,p])=>[id,{...p,price:planPrice(id,cfg)}])
);

// Which plans are publicly live. Super-admin toggles these in the control panel.
// Missing/undefined flag = live by default. A plan set to false is hidden everywhere client-facing.
export const planLive=(id,cfg={})=>{
  const nid=normalizePlanId(id);
  // Retired $1 Stripe test plan — never offer for new checkout / switch / landing.
  if(nid==="test-plan")return false;
  const m={essentials:"livePlanEssentials",growth:"livePlanGrowth",pro:"livePlanGmb"};
  const v=cfg[m[nid]];
  return v===undefined||v===null||v===true||v==="true";
};
export const livePlanEntries=(cfg={})=>Object.entries(plansWithPrices(cfg)).filter(([id])=>planLive(id,cfg));

/** Which plan shows the “Most Popular” badge. Super-admin sets this in Control Panel. */
export const popularPlanId=(cfg={})=>{
  const id=normalizePlanId(cfg.popularPlan);
  if(id&&PLANS[id]&&planLive(id,cfg))return id;
  return"growth";
};

/** Put the popular plan in the center (e.g. [A, Popular, B]). */
export const orderPlansPopularCenter=(entries,popularId)=>{
  const list=Array.isArray(entries)?[...entries]:[];
  if(list.length<2)return list;
  const pop=normalizePlanId(popularId);
  const getId=(item)=>normalizePlanId(Array.isArray(item)?item[0]:item.id);
  const popIdx=list.findIndex(item=>getId(item)===pop);
  if(popIdx<0)return list;
  const [item]=list.splice(popIdx,1);
  // Insert at middle index so popular is visually centered
  const mid=Math.floor(list.length/2);
  list.splice(mid,0,item);
  return list;
};

export const BIZ_FIELDS=[["name","Full Name"],["businessName","Business Name"],["email","Email"],["phone","Phone"],["address","Address"],["city","City"],["state","State"],["zip","ZIP"],["website","Website"]];

export const CATEGORIES=[
  "Plumbing","HVAC / Heating & Cooling","Electrical","Roofing","Handyman","Landscaping / Lawn Care","Pest Control","Cleaning Services","Painting","Flooring","Remodeling / Contractor","Garage Doors","Locksmith","Moving / Storage","Appliance Repair","Pool Services","Tree Services","Window & Gutter",
  "Auto Repair","Auto Body / Detailing","Towing",
  "Dental","Medical / Clinic","Chiropractor","Physical Therapy","Optometry","Mental Health / Therapy","Veterinary","Med Spa / Aesthetics",
  "Hair Salon","Barbershop","Nail Salon","Spa / Massage","Tattoo / Piercing",
  "Restaurant","Cafe / Coffee Shop","Bakery","Catering","Food Truck","Bar / Brewery",
  "Law Firm / Attorney","Accounting / Tax","Insurance","Real Estate","Mortgage / Lending","Financial Advisor","Marketing Agency","IT Services","Consulting",
  "Gym / Fitness","Yoga / Pilates Studio","Personal Trainer",
  "Photography","Event Planning","Wedding Services",
  "Daycare / Childcare","Tutoring / Education","Driving School",
  "Retail Store","Boutique / Apparel","Jewelry","Florist","Pet Grooming / Boarding",
  "Home Services","Professional Services","Other"
];

// US states + Canadian provinces (restricts address region to US/Canada).
export const US_CA_STATES=[
  {code:"AL",name:"Alabama"},{code:"AK",name:"Alaska"},{code:"AZ",name:"Arizona"},{code:"AR",name:"Arkansas"},{code:"CA",name:"California"},{code:"CO",name:"Colorado"},{code:"CT",name:"Connecticut"},{code:"DE",name:"Delaware"},{code:"FL",name:"Florida"},{code:"GA",name:"Georgia"},{code:"HI",name:"Hawaii"},{code:"ID",name:"Idaho"},{code:"IL",name:"Illinois"},{code:"IN",name:"Indiana"},{code:"IA",name:"Iowa"},{code:"KS",name:"Kansas"},{code:"KY",name:"Kentucky"},{code:"LA",name:"Louisiana"},{code:"ME",name:"Maine"},{code:"MD",name:"Maryland"},{code:"MA",name:"Massachusetts"},{code:"MI",name:"Michigan"},{code:"MN",name:"Minnesota"},{code:"MS",name:"Mississippi"},{code:"MO",name:"Missouri"},{code:"MT",name:"Montana"},{code:"NE",name:"Nebraska"},{code:"NV",name:"Nevada"},{code:"NH",name:"New Hampshire"},{code:"NJ",name:"New Jersey"},{code:"NM",name:"New Mexico"},{code:"NY",name:"New York"},{code:"NC",name:"North Carolina"},{code:"ND",name:"North Dakota"},{code:"OH",name:"Ohio"},{code:"OK",name:"Oklahoma"},{code:"OR",name:"Oregon"},{code:"PA",name:"Pennsylvania"},{code:"RI",name:"Rhode Island"},{code:"SC",name:"South Carolina"},{code:"SD",name:"South Dakota"},{code:"TN",name:"Tennessee"},{code:"TX",name:"Texas"},{code:"UT",name:"Utah"},{code:"VT",name:"Vermont"},{code:"VA",name:"Virginia"},{code:"WA",name:"Washington"},{code:"WV",name:"West Virginia"},{code:"WI",name:"Wisconsin"},{code:"WY",name:"Wyoming"},{code:"DC",name:"Washington DC"},
  {code:"AB",name:"Alberta"},{code:"BC",name:"British Columbia"},{code:"MB",name:"Manitoba"},{code:"NB",name:"New Brunswick"},{code:"NL",name:"Newfoundland"},{code:"NS",name:"Nova Scotia"},{code:"ON",name:"Ontario"},{code:"PE",name:"Prince Edward Is."},{code:"QC",name:"Quebec"},{code:"SK",name:"Saskatchewan"},{code:"NT",name:"Northwest Terr."},{code:"NU",name:"Nunavut"},{code:"YT",name:"Yukon"}
];
