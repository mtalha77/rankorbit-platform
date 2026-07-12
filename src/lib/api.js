// ─── API LAYER ───────────────────────────────────────────────────────────────
// Supabase Auth + profiles, with a localStorage demo fallback when keys are absent.
import { supa, LS, LSet } from "./supabase";
import { SEED } from "./seed";
import { uid, passwordIssues } from "./helpers";

export const api={
  mode: supa?"supabase":"local",
  async init(){
    if(supa)return;
    if(!LS("ro3_users")){
      LSet("ro3_users",SEED.users);LSet("ro3_listings",SEED.listings);
      LSet("ro3_gmb",SEED.gmb);LSet("ro3_analytics",SEED.analytics);
      LSet("ro3_activity",SEED.activity);LSet("ro3_settings",SEED.settings);
    }
  },
  // Returns the logged-in profile if a Supabase session already exists
  async currentUser(){
    if(!supa)return null;
    const{data:{session}}=await supa.auth.getSession();
    if(!session)return null;
    const{data}=await supa.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
    return data||null;
  },
  // remember=true → durable localStorage session; false → tab-only sessionStorage.
  setRemember(remember){
    try{ window.localStorage.setItem("ro_remember", remember?"1":"0"); }catch{}
  },
  async login(email,password){
    if(supa){
      const{data,error}=await supa.auth.signInWithPassword({email,password});
      if(error){
        if(error.message.includes("Email not confirmed"))
          return{error:"Please verify your email first. Check your inbox for the confirmation link."};
        if(error.status===429||/rate/i.test(error.message))
          return{error:"Too many attempts. Please wait a minute and try again."};
        return{error:error.message.includes("Invalid")?"Invalid email or password.":error.message};
      }
      const{data:prof}=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
      if(prof?.status==="suspended"){await supa.auth.signOut();return{error:"This account is suspended. Contact your account manager."};}
      return{user:prof};
    }
    const u=(LS("ro3_users")||[]).find(x=>x.email===email&&x.password===password);
    if(!u)return{error:"Invalid email or password. Try a demo account below."};
    if(u.status==="suspended")return{error:"This account is suspended. Contact your account manager."};
    return{user:u};
  },
  async signup({email,password,name,businessName,phone}){
    // Enforce password policy before hitting the network.
    const issues=passwordIssues(password);
    if(issues.length)return{error:"Password needs "+issues.join(", ")+"."};
    if(supa){
      // role is NEVER accepted from the client, the DB trigger hardcodes 'client'.
      const{data,error}=await supa.auth.signUp({email,password,options:{data:{name},emailRedirectTo:window.location.origin+"/login"+(typeof window!=="undefined"?window.location.search:"")}});
      if(error)return{error:error.message};
      if(data.user){
        await supa.from("profiles").update({name,businessName,phone,avatar:(name||email)[0].toUpperCase()}).eq("id",data.user.id);
      }
      // Email verification is required, Supabase returns no session until confirmed.
      if(!data.session)return{needsConfirm:true};
      const{data:prof}=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
      return{user:prof};
    }
    const us=LS("ro3_users")||[];
    if(us.find(x=>x.email===email))return{error:"An account with this email already exists."};
    const u={id:uid(),email,password,role:"client",name,businessName,phone,avatar:(name||email)[0].toUpperCase(),status:"active",napScore:0,createdAt:new Date().toISOString()};
    us.push(u);LSet("ro3_users",us);return{user:u};
  },
  async googleLogin(){
    if(!supa)return{error:"Google sign-in needs the live database. It's disabled in demo mode."};
    // Preserve ?plan= so post-OAuth landing still resumes the chosen plan.
    const qs=typeof window!=="undefined"?window.location.search:"";
    const{error}=await supa.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/login"+qs}});
    if(error)return{error:error.message};
    return{redirecting:true};
  },
  // Helper: refresh session and return access token for billing API calls.
  async _accessToken(){
    if(!supa)return null;
    let{data:{session}}=await supa.auth.getSession();
    if(session){const rr=await supa.auth.refreshSession();if(rr.data?.session)session=rr.data.session;}
    return session?.access_token||null;
  },
  async billingStatus(){
    try{
      const r=await fetch("/api/billing-status");
      const j=await r.json().catch(()=>({}));
      return{configured:!!j.configured,demo:!j.configured};
    }catch{return{configured:false,demo:true};}
  },
  async createCheckout(planId){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,planId})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not start checkout"};
      return{url:j.url};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async changeSubscription(planId){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/change-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,planId})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not change plan"};
      return{ok:true};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async cancelSubscription({resume=false}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      // Prefer live Stripe cancel; fall back to demo endpoint when Stripe env is unset.
      let r=await fetch("/api/cancel-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,resume})});
      let j=await r.json().catch(()=>({}));
      if(r.status===503||(r.status===403&&/not configured|Demo/i.test(j.error||""))){
        r=await fetch("/api/demo-cancel-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,resume})});
        j=await r.json().catch(()=>({}));
      }
      if(!r.ok)return{error:j.error||"Could not update subscription"};
      return{ok:true,cancelAtPeriodEnd:j.cancelAtPeriodEnd,currentPeriodEnd:j.currentPeriodEnd};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async createPortalSession(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/create-portal-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not open billing portal"};
      return{url:j.url};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async demoActivatePlan(planId){
    const token=await this._accessToken();
    if(!token){
      // Local demo (no Supabase): activate on the profile directly.
      return{local:true};
    }
    try{
      const r=await fetch("/api/demo-activate-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,planId})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not activate plan"};
      return{ok:true};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async listInvoices(clientId){
    if(supa){
      const{data,error}=await supa.from("invoices").select("*").eq("clientId",clientId).order("createdAt",{ascending:false}).limit(24);
      if(error){console.error("listInvoices:",error.message);return[];}
      return data||[];
    }
    return[];
  },
  async resetPassword(email){
    if(!supa)return{error:"Password reset needs the live database."};
    const{error}=await supa.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    return error?{error:error.message}:{ok:true};
  },
  async logout(){if(supa)await supa.auth.signOut();},
  async loadAll(){
    if(supa){
      const[u,l,g,an,ac,s,au]=await Promise.all([
        supa.from("profiles").select("*"),
        supa.from("listings").select("*"),
        supa.from("gmb").select("*"),
        supa.from("analytics").select("*"),
        supa.from("activity").select("*").order("createdAt",{ascending:false}),
        supa.from("settings").select("*").eq("id",1).maybeSingle(),
        supa.from("audit").select("*").order("createdAt",{ascending:false}).limit(500),
      ]);
      const allUsers=u.data||[];const allListings=l.data||[];
      // Split live vs trashed (soft-deleted) so the UI can show a Trash view.
      const users=allUsers.filter(x=>!x.deletedAt);
      const trashedUsers=allUsers.filter(x=>x.deletedAt);
      const liveListings=allListings.filter(x=>!x.deletedAt);
      const trashedListings=allListings.filter(x=>x.deletedAt);
      const listings={};liveListings.forEach(x=>{(listings[x.clientId]=listings[x.clientId]||[]).push(x);});
      const gmb={};(g.data||[]).forEach(x=>gmb[x.clientId]=x.data);
      const analytics={};(an.data||[]).forEach(x=>analytics[x.clientId]=x.data);
      return{users,trashedUsers,listings,trashedListings,gmb,analytics,activity:ac.data||[],audit:au.data||[],settings:s.data?.data||SEED.settings};
    }
    const flatAll=LS("ro3_listings")||[];
    const flat=flatAll.filter(x=>!x.deletedAt);
    const listings={};flat.forEach(x=>{(listings[x.clientId]=listings[x.clientId]||[]).push(x);});
    const allU=LS("ro3_users")||[];
    return{users:allU.filter(x=>!x.deletedAt),trashedUsers:allU.filter(x=>x.deletedAt),listings,trashedListings:flatAll.filter(x=>x.deletedAt),gmb:LS("ro3_gmb")||{},analytics:LS("ro3_analytics")||{},activity:LS("ro3_activity")||[],audit:LS("ro3_audit")||[],settings:LS("ro3_settings")||SEED.settings};
  },
  // Assign a client to an agent (stored on the client profile as assignedAgentId).
  async assignClient(clientId,agentId){
    if(supa){const{error}=await supa.from("profiles").update({assignedAgentId:agentId||null}).eq("id",clientId);if(error)throw error;return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===clientId);if(i>=0){us[i].assignedAgentId=agentId||null;LSet("ro3_users",us);}
  },
  // Grant/revoke a manager's ability to open (read-only) client accounts.
  // Create a staff login (manager/agent) via the serverless admin function.
  // Passes the caller's access token so the server can verify their role.
  async createStaff({name,email,password,role}){
    if(!supa)return{error:"Not connected to database (Supabase keys missing)"};
    let session=null;
    try{
      const r1=await supa.auth.getSession();
      session=r1.data.session;
      if(session){const rr=await supa.auth.refreshSession();if(rr.data?.session)session=rr.data.session;}
    }catch(e){return{error:"Session read failed: "+(e.message||"unknown")};}
    if(!session)return{error:"DIAG: getSession returned null. localStorage ro_auth = "+(()=>{try{return window.localStorage.getItem("ro_auth")?"present":"MISSING";}catch{return "err";}})()+". Try logging out and back in at /admin."};
    if(!session.access_token)return{error:"Session exists but has no token. Log out and back in at /admin."};
    try{
      const r=await fetch("/api/create-staff",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token:String(session.access_token),name,email,password,role}),
      });
      const j=await r.json();
      if(!r.ok)return{error:j.error||"Failed to create staff account"};
      return{ok:true};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async setImpersonateGrant(managerId,allowed){
    if(supa){const{error}=await supa.from("profiles").update({canImpersonate:!!allowed}).eq("id",managerId);if(error)throw error;return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===managerId);if(i>=0){us[i].canImpersonate=!!allowed;LSet("ro3_users",us);}
  },
  // Audit log: every sensitive staff action records who/what/when. Fire-and-forget.
  async logAudit({actor,action,targetType,targetId,targetName,detail}){
    const row={id:uid(),actorId:actor?.id||"",actorName:actor?.name||actor?.email||"Unknown",actorRole:actor?.role||"",action,targetType:targetType||"",targetId:targetId||"",targetName:targetName||"",detail:detail||"",createdAt:new Date().toISOString()};
    if(supa){await supa.from("audit").insert(row);return;}
    LSet("ro3_audit",[row,...(LS("ro3_audit")||[])]);
  },
  // Partial update: writes only the given fields to a profile by id. Avoids resending
  // read-only/generated columns that can cause RLS or type errors on full-object writes.
  async patchProfile(id,fields){
    if(supa){const{error}=await supa.from("profiles").update(fields).eq("id",id);if(error){console.error("patchProfile:",error.message);throw error;}return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){us[i]={...us[i],...fields};LSet("ro3_users",us);}
  },
  async upsertProfile(u){
    if(supa){
      // Existing profiles → UPDATE (RLS allows self-update); new rows → INSERT.
      // upsert() trips the INSERT policy for clients, so branch explicitly.
      const{data:exists}=await supa.from("profiles").select("id").eq("id",u.id).maybeSingle();
      const{error}=exists
        ? await supa.from("profiles").update(u).eq("id",u.id)
        : await supa.from("profiles").insert(u);
      if(error){console.error("upsertProfile:",error.message);throw error;}
      return;
    }
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===u.id);
    if(i>=0)us[i]=u;else us.push(u);LSet("ro3_users",us);
  },
  // Soft-delete: sets deletedAt. Recoverable for 30 days, then purge.
  async deleteUser(id){
    const when=new Date().toISOString();
    if(supa){await supa.from("profiles").update({deletedAt:when}).eq("id",id);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){us[i].deletedAt=when;LSet("ro3_users",us);}
  },
  async restoreUser(id){
    if(supa){await supa.from("profiles").update({deletedAt:null}).eq("id",id);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){delete us[i].deletedAt;LSet("ro3_users",us);}
  },
  async purgeUser(id){ // permanent
    if(supa){await supa.from("profiles").delete().eq("id",id);return;}
    LSet("ro3_users",(LS("ro3_users")||[]).filter(x=>x.id!==id));
    LSet("ro3_listings",(LS("ro3_listings")||[]).filter(x=>x.clientId!==id));
    const g=LS("ro3_gmb")||{};delete g[id];LSet("ro3_gmb",g);
  },
  async upsertListing(l){
    if(supa){const{error}=await supa.from("listings").upsert(l);if(error)console.error(error);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===l.id);
    if(i>=0)ls[i]=l;else ls.push(l);LSet("ro3_listings",ls);
  },
  async deleteListing(id){
    const when=new Date().toISOString();
    if(supa){await supa.from("listings").update({deletedAt:when}).eq("id",id);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);if(i>=0){ls[i].deletedAt=when;LSet("ro3_listings",ls);}
  },
  async restoreListing(id){
    if(supa){await supa.from("listings").update({deletedAt:null}).eq("id",id);return;}
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);if(i>=0){delete ls[i].deletedAt;LSet("ro3_listings",ls);}
  },
  async purgeListing(id){
    if(supa){await supa.from("listings").delete().eq("id",id);return;}
    LSet("ro3_listings",(LS("ro3_listings")||[]).filter(x=>x.id!==id));
  },
  async upsertGmb(clientId,data){
    if(supa){await supa.from("gmb").upsert({clientId,data});return;}
    const g=LS("ro3_gmb")||{};g[clientId]=data;LSet("ro3_gmb",g);
  },
  async upsertAnalytics(clientId,data){
    if(supa){await supa.from("analytics").upsert({clientId,data});return;}
    const a=LS("ro3_analytics")||{};a[clientId]=data;LSet("ro3_analytics",a);
  },
  async addActivity(a){
    if(supa){await supa.from("activity").insert(a);return;}
    LSet("ro3_activity",[a,...(LS("ro3_activity")||[])]);
  },
  async saveSettings(data){
    if(supa){await supa.from("settings").update({data}).eq("id",1);return;}
    LSet("ro3_settings",data);
  },
  // Public read of settings (used by the landing page to know which plans are live).
  async getSettings(){
    if(supa){const{data}=await supa.from("settings").select("data").eq("id",1).maybeSingle();return data?.data||{};}
    return LS("ro3_settings")||{};
  },
};
