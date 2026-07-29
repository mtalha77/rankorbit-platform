/**
 * Landing pay-first helpers: validate form fields, pack Stripe metadata,
 * provision client after checkout.session.completed (source=landing_payfirst only).
 */
import { randomBytes } from "node:crypto";
import { sendNotifyEmails } from "./assign.js";
import { appBaseUrl, onboardingHelpLine } from "./emailTemplate.js";
import {
  planFromPriceId,
  subscriptionFieldsFromStripe,
  updateProfileSubscriptionFields,
} from "./billing.js";

const META_MAX = 450;

function authErrDetail(err) {
  if (!err) return "(no error)";
  const parts = [
    err.message,
    err.code,
    err.status,
    err.statusCode,
    typeof err === "string" ? err : null,
  ].filter(Boolean);
  try {
    const raw = JSON.stringify(err, Object.getOwnPropertyNames(err));
    if (raw && raw !== "{}") parts.push(raw);
  } catch {
    /* ignore */
  }
  return parts.join(" | ") || String(err);
}

/** Random password for Auth createUser (never emailed; client sets real password via Resend link). */
function tempAuthPassword() {
  return randomBytes(32).toString("base64url");
}

/** Find Auth user id by email without generateLink (generateLink can fire Auth emails). */
async function findAuthUserIdByEmail(admin, email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.warn("listUsers:", error.message);
      return null;
    }
    const users = data?.users || [];
    const hit = users.find((u) => String(u.email || "").trim().toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function tagLandingAuthUser(admin, authId, name, { ensurePassword = false } = {}) {
  if (!authId) return;
  try {
    const { data: u } = await admin.auth.admin.getUserById(authId);
    const prev = u?.user?.user_metadata || {};
    const patch = {
      email_confirm: true,
      user_metadata: {
        ...prev,
        name: name || prev.name,
        role: prev.role || "client",
        source: "landing_payfirst",
      },
    };
    // Only for invited/passwordless Auth rows — do not overwrite a real password.
    if (ensurePassword) patch.password = tempAuthPassword();
    await admin.auth.admin.updateUserById(authId, patch);
  } catch (e) {
    console.warn("landing_payfirst tag auth user:", e.message || authErrDetail(e));
  }
}

function clip(v, n = META_MAX) {
  const s = String(v ?? "").trim();
  if (s.length <= n) return s;
  return s.slice(0, n);
}

export function validateLandingFields(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const businessName = String(body.businessName || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
  const zip = String(body.zip || "").replace(/\D/g, "");
  const category = String(body.category || "").trim();
  const website = String(body.website || "").trim();
  const gbpId = String(body.gbpId || "").trim();

  if (!name) return { error: "Name is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Valid email is required" };
  if (!businessName) return { error: "Business name is required" };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Valid phone is required" };
  if (!address) return { error: "Address is required" };
  if (!city || !/^[A-Za-z\s]+$/.test(city)) return { error: "Valid city is required" };
  if (!state) return { error: "State is required" };
  if (zip.length < 5) return { error: "Valid ZIP is required" };
  if (!category) return { error: "Category is required" };

  return {
    name,
    email,
    businessName,
    phone,
    address,
    city,
    state,
    zip,
    category,
    website,
    gbpId,
  };
}

/** Stripe metadata (values clipped to stay under Stripe limits). */
export function metaFromLandingFields(fields, planId) {
  return {
    source: "landing_payfirst",
    plan_id: planId,
    email: clip(fields.email, 200),
    name: clip(fields.name, 200),
    businessName: clip(fields.businessName),
    phone: clip(fields.phone, 40),
    address: clip(fields.address),
    city: clip(fields.city, 100),
    state: clip(fields.state, 20),
    zip: clip(fields.zip, 20),
    category: clip(fields.category, 120),
    website: clip(fields.website, 200),
    gbpId: clip(fields.gbpId, 200),
  };
}

export function fieldsFromSessionMeta(meta = {}) {
  return {
    name: String(meta.name || "").trim(),
    email: String(meta.email || "").trim().toLowerCase(),
    businessName: String(meta.businessName || "").trim(),
    phone: String(meta.phone || "").trim(),
    address: String(meta.address || "").trim(),
    city: String(meta.city || "").trim(),
    state: String(meta.state || "").trim(),
    zip: String(meta.zip || "").replace(/\D/g, ""),
    category: String(meta.category || "").trim(),
    website: String(meta.website || "").trim(),
    gbpId: String(meta.gbpId || "").trim(),
  };
}

/**
 * Find or create client profile from landing checkout session metadata.
 * Returns { profileId, created }.
 */
export async function provisionLandingPayfirstClient(admin, session) {
  const meta = session.metadata || {};
  const fields = fieldsFromSessionMeta(meta);
  const email =
    fields.email ||
    String(session.customer_details?.email || session.customer_email || "")
      .trim()
      .toLowerCase();
  if (!email) {
    console.warn("landing_payfirst: no email on session", session.id);
    return { profileId: null, created: false };
  }

  const knownId = session.client_reference_id || meta.supabase_user_id || null;
  let profile = null;
  if (knownId) {
    const { data } = await admin
      .from("profiles")
      .select("id,email,role,name")
      .eq("id", knownId)
      .maybeSingle();
    profile = data;
  }
  if (!profile) {
    const { data } = await admin
      .from("profiles")
      .select("id,email,role,name")
      .eq("email", email)
      .maybeSingle();
    profile = data;
  }

  const profilePatch = {
    email,
    name: fields.name || profile?.name || email.split("@")[0],
    businessName: fields.businessName || undefined,
    phone: fields.phone || undefined,
    address: fields.address || undefined,
    city: fields.city || undefined,
    state: fields.state || undefined,
    zip: fields.zip || undefined,
    category: fields.category || undefined,
    website: fields.website || undefined,
    gbpId: fields.gbpId || undefined,
    role: "client",
  };
  // Drop undefined keys
  Object.keys(profilePatch).forEach((k) => profilePatch[k] === undefined && delete profilePatch[k]);

  let created = false;
  let profileId = profile?.id || null;

  if (profile && profile.role && profile.role !== "client") {
    console.warn("landing_payfirst: email is staff, refusing", email);
    return { profileId: null, created: false };
  }

  if (!profileId) {
    // Password + confirmed email → Auth must not send invite/magiclink; we email set-password via Resend only.
    const tempPassword = tempAuthPassword();
    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: profilePatch.name, role: "client", source: "landing_payfirst" },
    });
    if (createErr) {
      const msg = authErrDetail(createErr);
      console.warn("landing_payfirst createUser failed:", msg);
      // Always try resolve by email — AuthError message is often empty ("{}") even for duplicates.
      const { data: byEmail } = await admin
        .from("profiles")
        .select("id,role,name")
        .eq("email", email)
        .maybeSingle();
      if (byEmail?.id) {
        // Existing client profile — do not rewrite Auth password/metadata.
        profileId = byEmail.id;
        profile = byEmail;
      } else {
        const authId = await findAuthUserIdByEmail(admin, email);
        if (!authId) {
          console.error("landing_payfirst could not create or find auth user:", msg);
          return { profileId: null, created: false };
        }
        profileId = authId;
        created = true; // still need profile + set-password mail
        // Prior invite/passwordless users: give a temp password so Auth stops invite mails.
        await tagLandingAuthUser(admin, authId, profilePatch.name, { ensurePassword: true });
      }
    } else {
      profileId = createdUser.user.id;
      created = true;
    }

    const { error: upErr } = await admin.from("profiles").upsert(
      {
        id: profileId,
        ...profilePatch,
        avatar: (profilePatch.name?.[0] || "?").toUpperCase(),
        status: "active",
        createdAt: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (upErr) console.error("landing_payfirst profile upsert:", upErr.message);
  } else {
    const { error: upErr } = await admin.from("profiles").update(profilePatch).eq("id", profileId);
    if (upErr) console.error("landing_payfirst profile update:", upErr.message);
  }

  // Password email is sent once from claim-landing-checkout (deduped) — not here.
  return { profileId, created, email };
}

/**
 * Branded Resend set-password mail. Never calls Auth generateLink (that can trigger
 * Supabase "You've been invited" / recovery mail from mail.app.supabase.io).
 * Does not overwrite passwords for users who already signed in.
 */
export async function sendLandingSetPasswordEmail(admin, email, name, { force = false } = {}) {
  const authId = await findAuthUserIdByEmail(admin, email);
  if (!authId) throw new Error("Auth user not found for set-password email");

  let user = null;
  try {
    const { data } = await admin.auth.admin.getUserById(authId);
    user = data?.user || null;
  } catch (e) {
    console.warn("landing_payfirst getUserById:", e.message);
  }

  // Returning client already has a password — do not email a reset or rotate Auth password.
  if (!force && user?.last_sign_in_at) {
    return { sent: false, skipped: true, reason: "existing_user" };
  }

  // Invite-only Auth rows (never signed in): temp password stops Auth invite mails.
  if (user?.invited_at && !user?.last_sign_in_at) {
    await tagLandingAuthUser(admin, authId, name, { ensurePassword: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 48 * 3600 * 1000;
  const rowId = `lpw_${token}`;
  const { error: insErr } = await admin.from("stripe_events").insert({
    id: rowId,
    type: `landing_password:${authId}:${expiresAt}`,
  });
  if (insErr) throw new Error(insErr.message || "Could not create set-password token");

  const actionLink = `${appBaseUrl()}/reset-password?lpw=${encodeURIComponent(token)}`;

  const who = name || "there";
  const result = await sendNotifyEmails(
    [email],
    "Set your NAP Orbit password",
    `Hi ${who} — your payment went through and your NAP Orbit account is ready. Click below to set your password, then sign in to open your dashboard.\n\n${onboardingHelpLine()}`,
    { ctaUrl: actionLink, ctaLabel: "Set password & sign in" }
  );
  if (!result.sent) {
    console.warn("landing_payfirst email not sent:", result.reason);
    await admin.from("stripe_events").delete().eq("id", rowId);
  }
  return { ...result, actionLink };
}

/** Send set-password email at most once per Checkout Session unless force=true (Resend button). */
export async function sendLandingSetPasswordEmailOnce(admin, sessionId, email, name, { force = false } = {}) {
  if (!email || !sessionId) return { sent: false, skipped: true };
  const dedupeId = `landing_pw_${String(sessionId).slice(0, 200)}`;
  if (!force) {
    const { error: insErr } = await admin.from("stripe_events").insert({
      id: dedupeId,
      type: "landing_password_email",
    });
    if (insErr) {
      if (insErr.code === "23505" || /duplicate|unique/i.test(insErr.message || "")) {
        return { sent: false, skipped: true };
      }
      console.warn("landing_pw dedupe insert:", insErr.message);
    }
  }
  return sendLandingSetPasswordEmail(admin, email, name, { force });
}

/**
 * Provision account + write plan/subscription onto profile from a paid Checkout Session.
 * Safe to call from webhook OR browser return (claim) — idempotent.
 */
export async function fulfillLandingCheckoutSession(admin, stripe, session) {
  if (!session || session.mode !== "subscription") {
    return { error: "Not a subscription checkout" };
  }
  if (session.metadata?.source !== "landing_payfirst") {
    return { error: "Not a landing checkout" };
  }
  if (session.status !== "complete" && session.payment_status !== "paid") {
    return { error: "Payment not complete yet" };
  }

  const planId = session.metadata?.plan_id || null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  const provisioned = await provisionLandingPayfirstClient(admin, session);
  let profileId = provisioned.profileId || null;
  if (!profileId) {
    return { error: "Could not create or find account for this email", email: provisioned.email };
  }

  try {
    const { linkPendingConsent } = await import("./accessLog.js");
    await linkPendingConsent(admin, {
      userId: profileId,
      email: provisioned.email || session.metadata?.email,
    });
  } catch (e) {
    console.warn("linkPendingConsent:", e.message);
  }

  if (customerId) {
    await admin.from("profiles").update({ stripeCustomerId: customerId }).eq("id", profileId);
  }

  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ["default_payment_method"],
    });
    try {
      await stripe.subscriptions.update(subId, {
        metadata: {
          ...(sub.metadata || {}),
          supabase_user_id: profileId,
          plan_id: planId || "",
          source: "landing_payfirst",
          email: provisioned.email || session.metadata?.email || "",
        },
      });
    } catch (e) {
      console.warn("landing fulfill sub metadata:", e.message);
    }

    const fields = subscriptionFieldsFromStripe(sub, planId);
    fields.stripeCustomerId = customerId || undefined;
    if (sub.status === "active" || sub.status === "trialing") {
      fields.paymentFailedAt = null;
      fields.paymentGraceEndsAt = null;
    }
    // Card last4
    try {
      const pmId =
        typeof sub.default_payment_method === "string"
          ? sub.default_payment_method
          : sub.default_payment_method?.id;
      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        if (pm.card) {
          fields.cardBrand = pm.card.brand || null;
          fields.cardLast4 = pm.card.last4 || null;
        }
      }
    } catch {
      /* optional */
    }
    const { error } = await updateProfileSubscriptionFields(admin, profileId, fields);
    if (error) console.error("landing fulfill profile billing:", error.message);
  }

  const { data: prof } = await admin
    .from("profiles")
    .select("id,email,name,plan,subscriptionStatus")
    .eq("id", profileId)
    .maybeSingle();

  return {
    ok: true,
    profileId,
    created: !!provisioned.created,
    email: prof?.email || provisioned.email,
    name: prof?.name || null,
    plan: prof?.plan || planId,
    subscriptionStatus: prof?.subscriptionStatus || null,
  };
}

/**
 * If a client logged in/signed up without plan, attach an active Stripe subscription for their email.
 */
export async function linkStripeSubscriptionByEmail(admin, stripe, profileId, email) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!profileId || !emailNorm) return { linked: false };

  const { data: prof } = await admin
    .from("profiles")
    .select("id,plan,subscriptionStatus,stripeCustomerId,stripeSubscriptionId")
    .eq("id", profileId)
    .maybeSingle();
  if (!prof) return { linked: false };
  if (prof.plan && ["active", "trialing", "past_due"].includes(prof.subscriptionStatus)) {
    return { linked: false, already: true, plan: prof.plan };
  }

  // Prefer existing customer id on profile.
  let customerId = prof.stripeCustomerId || null;
  if (!customerId) {
    const customers = await stripe.customers.list({ email: emailNorm, limit: 5 });
    const withSub = customers.data || [];
    customerId = withSub[0]?.id || null;
  }
  if (!customerId) return { linked: false };

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.default_payment_method"],
  });
  const active =
    (subs.data || []).find((s) => ["active", "trialing", "past_due"].includes(s.status)) || null;
  if (!active) return { linked: false };

  const planId =
    active.metadata?.plan_id || planFromPriceId(active.items?.data?.[0]?.price?.id) || null;
  const fields = subscriptionFieldsFromStripe(active, planId);
  fields.stripeCustomerId = customerId;
  try {
    await stripe.subscriptions.update(active.id, {
      metadata: {
        ...(active.metadata || {}),
        supabase_user_id: profileId,
        plan_id: planId || "",
        email: emailNorm,
      },
    });
  } catch {
    /* optional */
  }
  const { error } = await updateProfileSubscriptionFields(admin, profileId, fields);
  if (error) {
    console.error("linkStripeSubscriptionByEmail:", error.message);
    return { linked: false, error: error.message };
  }
  return { linked: true, plan: planId || fields.plan, subscriptionStatus: active.status };
}
