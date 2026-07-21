// ─── PRODUCT CONSTANTS ───────────────────────────────────────────────────────
import { T } from "./theme";

export const PLANS={essentials:{name:"Essentials",price:49,quota:"10 listings/mo",color:T.blue,soft:T.blueSoft,features:["10 directory submissions every month","NAP consistency management","Unauthorized edit protection","Helps you get found in AI searches","Listing monitoring & alerts","Client dashboard access"]},
  growth:{name:"Growth",price:89,quota:"20 listings/mo",color:T.brand,soft:T.brandSoft,features:["20 directory submissions every month","Everything in Essentials","Helps you get found in AI searches","Expanded directory coverage","Priority support","Monthly coverage report"]},
  gmb:{name:"GMB Pro",price:249,quota:"15 listings/mo + GMB",color:T.violet,soft:T.violetSoft,features:["15 directory submissions every month","Google Business Profile management","Get found in AI searches (ChatGPT, Gemini, AI Overviews)","Monthly GMB posts & Q&A","Engagement analytics (views, calls)","Dedicated BDM support"]}};

const PRICE_CFG_KEYS={essentials:"priceEssentials",growth:"priceGrowth",gmb:"priceGmb"};

/** Display price: control-panel override when set, else PLANS default. */
export const planPrice=(id,cfg={})=>{
  const key=PRICE_CFG_KEYS[id];
  const v=key?cfg[key]:null;
  if(v!=null&&v!==""){const n=Number(v);if(Number.isFinite(n))return n;}
  return PLANS[id]?.price??0;
};

/** PLANS entries with prices resolved from settings config. */
export const plansWithPrices=(cfg={})=>Object.fromEntries(
  Object.entries(PLANS).map(([id,p])=>[id,{...p,price:planPrice(id,cfg)}])
);

// Which plans are publicly live. Super-admin toggles these in the control panel.
// Missing/undefined flag = live by default. A plan set to false is hidden everywhere client-facing.
export const planLive=(id,cfg={})=>{const m={essentials:"livePlanEssentials",growth:"livePlanGrowth",gmb:"livePlanGmb"};const v=cfg[m[id]];return v===undefined||v===null||v===true||v==="true";};
export const livePlanEntries=(cfg={})=>Object.entries(plansWithPrices(cfg)).filter(([id])=>planLive(id,cfg));

/** Which plan shows the “Most Popular” badge. Super-admin sets this in Control Panel. */
export const popularPlanId=(cfg={})=>{
  const id=cfg.popularPlan;
  if(id&&PLANS[id])return id;
  return"growth";
};

/** Put the popular plan in the center (e.g. [A, Popular, B]). */
export const orderPlansPopularCenter=(entries,popularId)=>{
  const list=Array.isArray(entries)?[...entries]:[];
  if(list.length<2)return list;
  const getId=(item)=>Array.isArray(item)?item[0]:item.id;
  const popIdx=list.findIndex(item=>getId(item)===popularId);
  if(popIdx<0)return list;
  const [pop]=list.splice(popIdx,1);
  // Insert at middle index so popular is visually centered
  const mid=Math.floor(list.length/2);
  list.splice(mid,0,pop);
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
