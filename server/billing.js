// Shared helpers for Vercel serverless billing routes.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const cleanUrl = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);
const cleanKey = (s) => (s ? String(s).replace(/[^A-Za-z0-9._\-]/g, "") : s);

export const PLAN_IDS = ["essentials", "growth", "gmb"];

export function appUrl() {
  const raw = process.env.APP_URL || process.env.VERCEL_URL || "";
  if (!raw) return "http://localhost:5173";
  if (raw.startsWith("http")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function priceIdForPlan(planId) {
  const map = {
    essentials: process.env.STRIPE_PRICE_ESSENTIALS,
    growth: process.env.STRIPE_PRICE_GROWTH,
    gmb: process.env.STRIPE_PRICE_GMB,
  };
  return map[planId] || null;
}

export function planFromPriceId(priceId) {
  if (!priceId) return null;
  const entries = [
    ["essentials", process.env.STRIPE_PRICE_ESSENTIALS],
    ["growth", process.env.STRIPE_PRICE_GROWTH],
    ["gmb", process.env.STRIPE_PRICE_GMB],
  ];
  for (const [plan, pid] of entries) {
    if (pid && pid === priceId) return plan;
  }
  return null;
}

export function stripeConfigured() {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_ESSENTIALS &&
    process.env.STRIPE_PRICE_GROWTH &&
    process.env.STRIPE_PRICE_GMB
  );
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function getAdmin() {
  const url = cleanUrl(process.env.VITE_SUPABASE_URL);
  const key = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Decode JWT payload (no network). Returns { sub, exp } or null. */
export function decodeJwt(token) {
  try {
    const cleanTok = String(token).replace(/[^A-Za-z0-9._-]/g, "");
    const parts = cleanTok.split(".");
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Verify client JWT and load profile. */
export async function requireClient(admin, token) {
  if (!token) return { error: "Not authenticated", status: 401 };
  const payload = decodeJwt(token);
  if (!payload?.sub) return { error: "Session expired or invalid", status: 401 };
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", payload.sub)
    .maybeSingle();
  if (error) return { error: "Profile lookup failed: " + error.message, status: 500 };
  if (!profile) return { error: "No profile found", status: 401 };
  if (profile.status === "suspended") return { error: "Account suspended", status: 403 };
  if (["super_admin", "manager", "agent"].includes(profile.role)) {
    return { error: "Staff accounts cannot purchase plans here", status: 403 };
  }
  return { profile };
}

export async function ensureStripeCustomer(stripe, admin, profile) {
  if (profile.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(profile.stripeCustomerId);
      return profile.stripeCustomerId;
    } catch {
      // fall through and create a new customer
    }
  }
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.businessName || profile.name || undefined,
    metadata: { supabase_user_id: profile.id },
  });
  await admin
    .from("profiles")
    .update({ stripeCustomerId: customer.id })
    .eq("id", profile.id);
  return customer.id;
}

export function subscriptionFieldsFromStripe(sub, planId) {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id || null;
  const plan = planId || planFromPriceId(priceId);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  return {
    plan: plan || null,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    subscriptionStatus: sub.status || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    currentPeriodEnd: periodEnd,
    status: sub.status === "active" || sub.status === "trialing" ? "active" : undefined,
  };
}

export async function upsertInvoice(admin, invoice, clientId) {
  if (!invoice?.id || !clientId) return;
  const row = {
    id: invoice.id,
    clientId,
    amountCents: invoice.amount_paid ?? invoice.amount_due ?? 0,
    currency: invoice.currency || "usd",
    status: invoice.status || null,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    invoicePdf: invoice.invoice_pdf || null,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString(),
  };
  await admin.from("invoices").upsert(row, { onConflict: "id" });
}

export function nextMonthFirstIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}
