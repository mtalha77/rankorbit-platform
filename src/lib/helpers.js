// ─── SHARED HELPERS ──────────────────────────────────────────────────────────
// Small pure utilities used across dashboards and modals.
export const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
export const todayFull=()=>new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
export const nextMonthFirst=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1).toISOString();};
export const uid=()=>(crypto.randomUUID?crypto.randomUUID():"id"+Date.now()+Math.random());

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
export const actIcon=(t)=>({listing_live:"🟢",nap_fix:"🔧",edit_blocked:"🛡️",flagged:"🚩",rejected:"❌",gmb_update:"📍",submitted:"📤",analytics:"📈",client:"👤"}[t]||"⚡");
// Client-facing anonymizer: clients never see staff names, only "Account Manager".
// "System" stays as-is. Used everywhere the client can see a "by" attribution.
export const clientBy=(by)=>(!by||by==="System"?(by||""):"Account Manager");

