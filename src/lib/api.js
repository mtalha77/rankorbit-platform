// ─── API LAYER ───────────────────────────────────────────────────────────────
// Supabase Auth + profiles, with a localStorage demo fallback when keys are absent.
import { supa, LS, LSet } from "./supabase";
import { SEED } from "./seed";
import { uid, passwordIssues, computeNapScoreFromListings } from "./helpers";

export const api={
  mode: supa?"supabase":"local",
  /**
   * Auto NAP from live listing napMatch → profiles.napScore.
   * When the score changes, append napHistory and (optionally) notify the client.
   * Manual admin saves also write napScore; whichever runs last wins.
   */
  async _syncNapScoreForClient(clientId,{notify=true}={}){
    if(!clientId)return null;
    let listings=[];
    let prev=null;
    let hist=[];
    if(supa){
      const[{data:rows},{data:prof}]=await Promise.all([
        supa.from("listings").select("status,napMatch,deletedAt").eq("clientId",clientId),
        supa.from("profiles").select("napScore,napHistory").eq("id",clientId).maybeSingle(),
      ]);
      listings=rows||[];
      prev=prof?.napScore;
      hist=Array.isArray(prof?.napHistory)?prof.napHistory:[];
    }else{
      listings=(LS("ro3_listings")||[]).filter(x=>x.clientId===clientId&&!x.deletedAt);
      const us=LS("ro3_users")||[];
      const i=us.findIndex(x=>x.id===clientId);
      if(i>=0){prev=us[i].napScore;hist=Array.isArray(us[i].napHistory)?us[i].napHistory:[];}
    }
    const score=computeNapScoreFromListings(listings);
    if(score==null)return null;
    if(Number(prev)===score)return score;

    const entry={score,date:new Date().toISOString(),by:"Listings (auto)",source:"auto"};
    const napHistory=[...hist,entry].slice(-20);

    if(supa){
      const{error}=await supa.from("profiles").update({napScore:score,napHistory}).eq("id",clientId);
      if(error){console.error("_syncNapScoreForClient:",error.message);return null;}
    }else{
      const us=LS("ro3_users")||[];
      const i=us.findIndex(x=>x.id===clientId);
      if(i>=0){us[i]={...us[i],napScore:score,napHistory};LSet("ro3_users",us);}
    }

    if(notify){
      try{
        await this.addActivity({
          id:uid(),
          clientId,
          type:"nap_fix",
          desc:`NAP consistency updated to ${score}% (from listings)`,
          date:new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),
          by:"System",
        });
      }catch(e){console.error("nap auto activity:",e);}
      this.notifyClient({
        clientId,
        type:"nap_fix",
        title:"NAP score updated",
        body:`Your NAP consistency score is now ${score}%${prev!=null&&prev!==""?` (was ${prev}%).`:"."} Updated from your directory listings.`,
      });
    }
    return score;
  },
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
      let{data:prof}=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
      if(!prof){
        // Profile trigger sometimes lags right after signup/confirm — create once.
        const meta=data.user.user_metadata||{};
        const name=meta.name||meta.full_name||data.user.email?.split("@")[0]||"there";
        await supa.from("profiles").upsert({
          id:data.user.id,email:data.user.email,role:"client",name,
          avatar:(name[0]||"U").toUpperCase(),status:"active",
        },{onConflict:"id"});
        const r=await supa.from("profiles").select("*").eq("id",data.user.id).maybeSingle();
        prof=r.data;
      }
      if(!prof){await supa.auth.signOut();return{error:"Account profile missing. Try again in a moment."};}
      if(prof.status==="suspended"){await supa.auth.signOut();return{error:"This account is suspended. Contact your account manager."};}
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
      // Fire-and-forget welcome. Mark localStorage only after success so a failed
      // request can still be retried on first login via ensureWelcomeNotify.
      if(data.session?.access_token&&data.user){
        const uid=data.user.id;
        fetch("/api/notify-client",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({token:data.session.access_token,type:"welcome"}),
        }).then(r=>{
          if(r.ok&&typeof localStorage!=="undefined")localStorage.setItem(`ro_welcome_${uid}`,"1");
        }).catch(()=>{});
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
  /** Staff → client in-app + email. Types: listing_live, rejected, flagged, nap_fix, welcome, info, agent_edit */
  async notifyClient({clientId,type,title,body,meta}={}){
    if(!supa)return{ok:false,skipped:"local"};
    const token=await this._accessToken();
    if(!token)return{ok:false,error:"Not signed in"};
    try{
      const r=await fetch("/api/notify-client",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,clientId,type,title,body,meta}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{ok:false,error:j.error||"Notify failed"};
      return{ok:true,...j};
    }catch(e){return{ok:false,error:e.message};}
  },
  /**
   * Welcome once per client after register / first session.
   * Covers email-confirm signups (no session at signup). Server dedupes.
   */
  async ensureWelcomeNotify(){
    if(!supa)return;
    try{
      const{data:{user}}=await supa.auth.getUser();
      if(!user)return;
      const token=await this._accessToken();
      if(!token)return;
      const r=await fetch("/api/notify-client",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,type:"welcome"}),
      });
      if(r.ok&&typeof localStorage!=="undefined")localStorage.setItem(`ro_welcome_${user.id}`,"1");
    }catch{/* welcome is best-effort */}
  },
  /**
   * First plan subscribe notification once. Webhook may fire first; this covers
   * missed webhooks (local) after plan lands on the profile. Server dedupes.
   */
  async ensurePlanSubscribedNotify(){
    if(!supa)return;
    try{
      const{data:{user}}=await supa.auth.getUser();
      if(!user)return;
      const{data:prof}=await supa.from("profiles").select("plan,role").eq("id",user.id).maybeSingle();
      if(!prof||prof.role!=="client"||!prof.plan)return;
      const token=await this._accessToken();
      if(!token)return;
      await fetch("/api/notify-client",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,type:"plan_subscribed"}),
      });
    }catch{/* plan notify is best-effort */}
  },
  /** Register → welcome; first plan → plan_subscribed. Safe to call often. */
  ensureClientLifecycleNotifs(profile){
    if(!profile||profile.role!=="client")return;
    this.ensureWelcomeNotify();
    if(profile.plan)this.ensurePlanSubscribedNotify();
  },
  async googleLogin(){
    if(!supa)return{error:"Google sign-in needs the live database. It's disabled in demo mode."};
    // Preserve ?plan= so post-OAuth landing still resumes the chosen plan.
    const qs=typeof window!=="undefined"?window.location.search:"";
    const{error}=await supa.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/login"+qs}});
    if(error)return{error:error.message};
    return{redirecting:true};
  },
  // Single-flight refresh — concurrent refreshSession() rotates tokens and can
  // fire a spurious SIGNED_OUT (dashboard flash → back to login).
  _refreshPromise:null,
  // Return the current access token for API calls.
  // getSession() already returns an auto-refreshed token; only refresh manually
  // when it is expired / about to expire — and never in parallel.
  async _accessToken(){
    if(!supa)return null;
    const{data:{session}}=await supa.auth.getSession();
    if(!session)return null;
    const expMs=(session.expires_at||0)*1000;
    if(expMs&&expMs-Date.now()<60000){
      try{
        if(!this._refreshPromise){
          this._refreshPromise=supa.auth.refreshSession().finally(()=>{this._refreshPromise=null;});
        }
        const rr=await this._refreshPromise;
        if(rr?.data?.session?.access_token)return rr.data.session.access_token;
      }catch{/* fall back to current token */}
    }
    return session.access_token||null;
  },
  async billingStatus(){
    try{
      const r=await fetch("/api/billing-status");
      if(!r.ok)return{configured:false,demo:false,unreachable:true};
      const j=await r.json().catch(()=>({}));
      return{configured:!!j.configured,demo:false,hasWebhookSecret:!!j.hasWebhookSecret};
    }catch{
      return{configured:false,demo:false,unreachable:true};
    }
  },
  async _gbpPost(path,body={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,...body})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Request failed"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  googleGbpStatus(clientId){return this._gbpPost("/api/google-gbp-status",{clientId});},
  googleGbpStart(clientId){
    const returnOrigin=typeof window!=="undefined"?window.location.origin:undefined;
    return this._gbpPost("/api/google-gbp-start",{clientId,returnOrigin});
  },
  googleGbpLocations(clientId){return this._gbpPost("/api/google-gbp-locations",{clientId});},
  googleGbpSelectLocation(clientId,{locationName,accountName,locationTitle}={}){
    return this._gbpPost("/api/google-gbp-select-location",{clientId,locationName,accountName,locationTitle});
  },
  googleGbpSync(clientId){return this._gbpPost("/api/google-gbp-sync",{clientId});},
  googleGbpDisconnect(clientId){return this._gbpPost("/api/google-gbp-disconnect",{clientId});},
  async createCheckout(planId){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const returnOrigin=typeof window!=="undefined"?window.location.origin:undefined;
      const r=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,planId,returnOrigin})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not start checkout"};
      return{url:j.url};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async changeSubscription(planId,{when="now"}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/change-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,planId,when})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not change plan"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async cancelPendingPlanChange(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/change-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,action:"cancel_pending"})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not cancel scheduled change"};
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
      const returnOrigin=typeof window!=="undefined"?window.location.origin:undefined;
      const r=await fetch("/api/create-portal-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,returnOrigin})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not open billing portal"};
      return{url:j.url};
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
  async syncInvoices(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in",invoices:[]};
    try{
      const r=await fetch("/api/sync-invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not sync invoices",invoices:[]};
      return{invoices:j.invoices||[],synced:j.synced||0,profile:j.profile||null,currentPeriodEnd:j.currentPeriodEnd||null};
    }catch(e){return{error:e.message||"Network error",invoices:[]};}
  },
  async bookCall({slotDate,slotTime,note,replaceBookingId,kind}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/book-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,slotDate,slotTime,note,replaceBookingId,kind})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not book call"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async cancelCall({bookingId}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/cancel-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,bookingId})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not cancel meeting"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async sendBdmMessage(message){
    // Prefer chat thread; keep name for older callers.
    return this.sendChatMessage({ body: message });
  },
  async listChatMessages({clientId,before,limit}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in",messages:[]};
    try{
      const r=await fetch("/api/chat-messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,clientId,before,limit}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not load messages",messages:[]};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error",messages:[]};}
  },
  async sendChatMessage({body,clientId}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/chat-send",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,body,clientId}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not send message"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async markChatRead({clientId}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/chat-read",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,clientId}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not mark read"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async listChatThreads(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in",threads:[]};
    try{
      const r=await fetch("/api/chat-threads",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not load threads",threads:[]};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error",threads:[]};}
  },
  // ── Staff DM chat (super admin ↔ manager/agent) ──
  async listStaffMessages({staffId,limit}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in",messages:[]};
    try{
      const r=await fetch("/api/staff-messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,staffId,limit}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not load messages",messages:[]};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error",messages:[]};}
  },
  async sendStaffMessage({staffId,body}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/staff-send",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,staffId,body}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not send message"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async markStaffRead({staffId}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/staff-read",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,staffId}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not mark read"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async listStaffThreads(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in",threads:[]};
    try{
      const r=await fetch("/api/staff-threads",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not load threads",threads:[]};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error",threads:[]};}
  },
  /** Subscribe to a staff DM thread (keyed by staffId). Returns unsubscribe fn. */
  subscribeStaffChat(staffId,{onInsert,onUpdate}={}){
    if(!supa||!staffId)return()=>{};
    try{
      const channel=supa
        .channel(`staffchat:${staffId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {event:"INSERT",schema:"public",table:"staff_messages",filter:`staffId=eq.${staffId}`},
          (payload)=>{if(payload?.new&&typeof onInsert==="function")onInsert(payload.new);}
        )
        .on(
          "postgres_changes",
          {event:"UPDATE",schema:"public",table:"staff_messages",filter:`staffId=eq.${staffId}`},
          (payload)=>{if(payload?.new&&typeof onUpdate==="function")onUpdate(payload.new);}
        )
        .subscribe();
      return()=>{try{supa.removeChannel(channel);}catch{}};
    }catch{
      return()=>{};
    }
  },
  /** Subscribe to new/updated messages for a client thread. Returns unsubscribe fn. */
  subscribeChat(clientId,{onInsert,onUpdate}={}){
    if(!supa||!clientId)return()=>{};
    try{
      const channel=supa
        .channel(`chat:${clientId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {event:"INSERT",schema:"public",table:"messages",filter:`clientId=eq.${clientId}`},
          (payload)=>{if(payload?.new&&typeof onInsert==="function")onInsert(payload.new);}
        )
        .on(
          "postgres_changes",
          {event:"UPDATE",schema:"public",table:"messages",filter:`clientId=eq.${clientId}`},
          (payload)=>{if(payload?.new&&typeof onUpdate==="function")onUpdate(payload.new);}
        )
        .subscribe();
      return()=>{try{supa.removeChannel(channel);}catch{}};
    }catch{
      return()=>{};
    }
  },
  async getMyBdm(){
    const token=await this._accessToken();
    if(!token)return{agent:null,bookings:[],takenSlots:[]};
    try{
      const r=await fetch("/api/my-bdm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{agent:null,bookings:[],takenSlots:[],error:j.error};
      return{
        agent:j.agent||null,
        bookings:j.bookings||[],
        takenSlots:Array.isArray(j.takenSlots)?j.takenSlots:[],
        support:!!j.support,
        needsBdm:!!j.needsBdm,
        quota:j.quota||null,
      };
    }catch(e){return{agent:null,bookings:[],takenSlots:[],error:e.message};}
  },
  async listMyBookings(){
    const r=await this.getMyBdm();
    return{bookings:r.bookings||[],error:r.error};
  },
  async listMyNotifications(){
    if(!supa)return[];
    const{data:{session}}=await supa.auth.getSession();
    if(!session)return[];
    const{data,error}=await supa.from("notifications").select("*").eq("userId",session.user.id).order("createdAt",{ascending:false}).limit(100);
    if(error){console.warn("notifications:",error.message);return[];}
    return data||[];
  },
  async markNotificationsRead(ids){
    if(!supa||!ids?.length)return;
    await supa.from("notifications").update({read:true}).in("id",ids);
  },
  async respondCall({bookingId,action,notificationId,meetingUrl}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/respond-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,bookingId,action,notificationId,meetingUrl})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not update meeting"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async resetPassword(email){
    if(!supa)return{error:"Password reset needs the live database."};
    const{error}=await supa.auth.resetPasswordForEmail(email,{
      redirectTo:`${window.location.origin}/reset-password`,
    });
    if(!error)return{ok:true};
    const msg=error.message||"";
    if(/rate limit|too many/i.test(msg)||error.status===429)
      return{error:"Too many reset emails sent. Please wait a few minutes, then try again — or check your inbox for the earlier link."};
    return{error:msg};
  },
  async updatePassword(password){
    if(!supa)return{error:"Password update needs the live database."};
    const issues=passwordIssues(password);
    if(issues.length)return{error:"Password needs "+issues.join(", ")+"."};
    const{error}=await supa.auth.updateUser({password});
    return error?{error:error.message}:{ok:true};
  },
  /** Upload profile photo to Storage (or data-URL fallback locally). Returns {url} or {error}. */
  async uploadAvatar(blobOrFile,userId){
    if(!blobOrFile)return{error:"No image selected"};
    if(supa){
      const{data:{session}}=await supa.auth.getSession();
      const id=userId||session?.user?.id;
      if(!id)return{error:"Not signed in"};
      const path=`${id}/${Date.now()}.jpg`;
      const{error:upErr}=await supa.storage.from("avatars").upload(path,blobOrFile,{
        upsert:true,
        contentType:blobOrFile.type||"image/jpeg",
      });
      if(upErr){
        const missing=/bucket|not found|row-level security/i.test(upErr.message||"");
        return{error:missing
          ?"Avatar storage is not set up. Run supabase/avatars-storage.sql in the Supabase SQL editor."
          :upErr.message};
      }
      const{data:pub}=supa.storage.from("avatars").getPublicUrl(path);
      const url=pub?.publicUrl;
      if(!url)return{error:"Could not get photo URL"};
      const{error:pErr}=await supa.from("profiles").update({avatar:url}).eq("id",id);
      if(pErr)return{error:pErr.message};
      return{ok:true,url};
    }
    if(!userId)return{error:"Not signed in"};
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error("Could not read image"));
      reader.readAsDataURL(blobOrFile);
    });
    await this.patchProfile(userId,{avatar:String(dataUrl)});
    return{ok:true,url:String(dataUrl)};
  },
  async logout(){
    if(!supa)return;
    // Local scope clears the browser session immediately without waiting on the
    // Auth revoke network call (that hang/fail is a common production-only stall).
    try{
      await supa.auth.signOut({scope:"local"});
    }catch{
      try{localStorage.removeItem("ro_auth");}catch{/* ignore */}
    }
  },
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
  // Assign a client to an agent (notifies agent + super admins via API).
  async assignClient(clientId,agentId){
    if(supa){
      const token=await this._accessToken();
      if(!token)throw new Error("Not signed in");
      const r=await fetch("/api/assign-client",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,clientId,agentId:agentId||null}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||"Could not assign client");
      return j;
    }
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===clientId);if(i>=0){us[i].assignedAgentId=agentId||null;LSet("ro3_users",us);}
  },
  // Grant/revoke a manager's ability to open (read-only) client accounts.
  // Create a staff login (manager/agent) via the serverless admin function.
  // Passes the caller's access token so the server can verify their role.
  async createStaff({name,email,role}){
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
        body:JSON.stringify({token:String(session.access_token),name,email,role}),
      });
      const j=await r.json();
      if(!r.ok)return{error:j.error||"Failed to invite staff account"};
      return{ok:true,invited:!!j.invited};
    }catch(e){return{error:e.message||"Network error"};}
  },
  async setImpersonateGrant(managerId,allowed){
    if(supa){const{error}=await supa.from("profiles").update({canImpersonate:!!allowed}).eq("id",managerId);if(error)throw error;return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===managerId);if(i>=0){us[i].canImpersonate=!!allowed;LSet("ro3_users",us);}
  },
  // Audit log: every sensitive staff action records who/what/when. Fire-and-forget
  // (never throw — missing audit table must not break listing/assign saves).
  async logAudit({actor,action,targetType,targetId,targetName,detail}){
    const row={id:uid(),actorId:actor?.id||"",actorName:actor?.name||actor?.email||"Unknown",actorRole:actor?.role||"",action,targetType:targetType||"",targetId:targetId||"",targetName:targetName||"",detail:detail||"",createdAt:new Date().toISOString()};
    if(supa){
      const{error}=await supa.from("audit").insert(row);
      if(error)console.error("logAudit:",error.message);
      return;
    }
    LSet("ro3_audit",[row,...(LS("ro3_audit")||[])]);
  },
  // Partial update: writes only the given fields to a profile by id. Avoids resending
  // read-only/generated columns that can cause RLS or type errors on full-object writes.
  async patchProfile(id,fields){
    if(supa){const{error}=await supa.from("profiles").update(fields).eq("id",id);if(error){console.error("patchProfile:",error.message);throw error;}return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){us[i]={...us[i],...fields};LSet("ro3_users",us);}
  },
  /** Request confirmation email for alternate notification address (or clear). */
  async setNotifyEmail({email,clear}={}){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const appOrigin=typeof window!=="undefined"?window.location.origin:undefined;
      const r=await fetch("/api/set-notify-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,email,clear:!!clear,appOrigin})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not update notification email"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
  },
  /** Confirm pending notify email for the signed-in user (no inbox link needed). */
  async confirmMyNotifyEmail(){
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/confirm-my-notify-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not confirm notification email"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
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
  // Soft-delete: sets deletedAt. Recoverable for 30 days, then purge. (clients)
  async deleteUser(id){
    const when=new Date().toISOString();
    if(supa){await supa.from("profiles").update({deletedAt:when}).eq("id",id);return;}
    const us=LS("ro3_users")||[];const i=us.findIndex(x=>x.id===id);if(i>=0){us[i].deletedAt=when;LSet("ro3_users",us);}
  },
  // Permanent staff remove — login + profile + team DMs gone. Super admin only (server-enforced).
  async deleteStaff(id){
    if(!supa){
      LSet("ro3_users",(LS("ro3_users")||[]).filter(x=>x.id!==id));
      return{ok:true};
    }
    const token=await this._accessToken();
    if(!token)return{error:"Not signed in"};
    try{
      const r=await fetch("/api/delete-staff",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,staffId:id}),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return{error:j.error||"Could not remove team member"};
      return{ok:true,...j};
    }catch(e){return{error:e.message||"Network error"};}
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
    // Whitelist only real DB columns — never send UI-only fields like _name.
    const base={
      id:l.id,
      clientId:l.clientId,
      directory:l.directory,
      status:l.status,
      submitted:l.submitted??"",
      liveDate:l.liveDate??"–",
      napMatch:l.napMatch??"–",
      liveLink:l.liveLink??"",
      da:Number.isFinite(+l.da)?+l.da:0,
      notes:l.notes??"",
    };
    // Optional columns (added later) — include when present so older DBs can still save.
    const row={
      ...base,
      actionNeeded:!!l.actionNeeded,
      actionNote:l.actionNote??"",
      ...(l.deletedAt!=null?{deletedAt:l.deletedAt}:{}),
    };
    if(supa){
      let{error}=await supa.from("listings").upsert(row);
      // Older schemas may lack actionNeeded / actionNote / deletedAt — retry core fields.
      if(error&&/actionNeeded|actionNote|deletedAt|Could not find/i.test(error.message||"")){
        ({error}=await supa.from("listings").upsert(base));
      }
      if(error)throw new Error(error.message||"Could not save listing");
      await this._syncNapScoreForClient(row.clientId);
      return;
    }
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===row.id);
    if(i>=0)ls[i]={...row,deletedAt:l.deletedAt};else ls.push({...row,deletedAt:l.deletedAt});LSet("ro3_listings",ls);
    await this._syncNapScoreForClient(row.clientId);
  },
  async deleteListing(id){
    const when=new Date().toISOString();
    if(supa){
      const{data:row}=await supa.from("listings").select("clientId").eq("id",id).maybeSingle();
      const{error}=await supa.from("listings").update({deletedAt:when}).eq("id",id);
      if(error)throw new Error(error.message);
      if(row?.clientId)await this._syncNapScoreForClient(row.clientId);
      return;
    }
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);
    const clientId=i>=0?ls[i].clientId:null;
    if(i>=0){ls[i].deletedAt=when;LSet("ro3_listings",ls);}
    if(clientId)await this._syncNapScoreForClient(clientId);
  },
  async restoreListing(id){
    if(supa){
      const{data:row}=await supa.from("listings").select("clientId").eq("id",id).maybeSingle();
      const{error}=await supa.from("listings").update({deletedAt:null}).eq("id",id);
      if(error)throw new Error(error.message);
      if(row?.clientId)await this._syncNapScoreForClient(row.clientId);
      return;
    }
    const ls=LS("ro3_listings")||[];const i=ls.findIndex(x=>x.id===id);
    const clientId=i>=0?ls[i].clientId:null;
    if(i>=0){delete ls[i].deletedAt;LSet("ro3_listings",ls);}
    if(clientId)await this._syncNapScoreForClient(clientId);
  },
  async purgeListing(id){
    if(supa){const{error}=await supa.from("listings").delete().eq("id",id);if(error)throw new Error(error.message);return;}
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
    if(supa){
      // Explicit column map — avoids silent drops / reserved-name quirks on "desc".
      const row={
        id:a.id,
        clientId:a.clientId,
        type:a.type,
        desc:a.desc??a.description??"",
        date:a.date??"",
        by:a.by??"",
      };
      const{error}=await supa.from("activity").insert(row);
      if(error){console.error("addActivity:",error.message,error);throw new Error(error.message||"Could not save activity");}
      return;
    }
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
