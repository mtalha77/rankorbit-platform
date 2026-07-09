// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

export const SUPA_URL=import.meta.env.VITE_SUPABASE_URL||"";
export const SUPA_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY||"";

// Supabase client. persistSession=true keeps the session across reloads.
// OAuth uses the implicit flow (token arrives in the URL hash) so it survives the
// remember-me storage swap. We always persist to localStorage; "remember me" instead
// controls session LENGTH by signing out tab-only sessions on unload (handled below).
export const supa=(SUPA_URL&&SUPA_KEY)?createClient(SUPA_URL,SUPA_KEY,{
  auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:"implicit", storage:(typeof window!=="undefined"?window.localStorage:undefined), storageKey:"ro_auth" }
}):null;

// Remember-me: if the user did NOT check it, clear the durable session when the tab closes.
if(typeof window!=="undefined"){
  window.addEventListener("pagehide",()=>{
    try{ if(window.localStorage.getItem("ro_remember")==="0" && !window.sessionStorage.getItem("ro_active")) window.localStorage.removeItem("ro_auth"); }catch{}
  });
  try{ window.sessionStorage.setItem("ro_active","1"); }catch{}
}

// localStorage JSON helpers (used by the local fallback mode of the API layer).
export const LS=(k)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}};
export const LSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
