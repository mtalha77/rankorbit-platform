// ─── SHARED HELPERS ──────────────────────────────────────────────────────────
// Small pure utilities used across dashboards and modals.
export const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
export const todayFull=()=>new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
export const nextMonthFirst=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,1).toISOString();};
