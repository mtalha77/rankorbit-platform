/**
 * Google Business Profile OAuth + Performance sync helpers.
 * Tokens live in google_connections and are only touched via service role.
 */

import crypto from "crypto";
import { appUrl } from "./billing.js";

const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const ACCT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const PERF_API = "https://businessprofileperformance.googleapis.com/v1";

const GOOGLE_DIR = "Google Business Profile";

export function googleConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.GOOGLE_REDIRECT_URI || appUrl())
  );
}

export function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${appUrl()}/api/google-gbp-callback`
  ).replace(/\/$/, "");
}

function stateSecret() {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "rankorbit-gbp-state"
  );
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** Short-lived signed state: staffId + clientId + exp */
export function signOAuthState({ staffId, clientId, returnOrigin }) {
  const exp = Math.floor(Date.now() / 1000) + 15 * 60;
  const payload = JSON.stringify({
    s: staffId,
    c: clientId,
    e: exp,
    o: returnOrigin || "",
  });
  const body = b64url(payload);
  const sig = crypto.createHmac("sha256", stateSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyOAuthState(state) {
  if (!state || typeof state !== "string" || !state.includes(".")) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", stateSecret()).update(body).digest());
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(body).toString("utf8"));
    if (!data?.s || !data?.c || !data?.e) return null;
    if (Date.now() / 1000 > data.e) return null;
    return { staffId: data.s, clientId: data.c, returnOrigin: data.o || "" };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GBP_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
}

async function tokenRequest(body) {
  const r = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j.error_description || j.error || "Token exchange failed");
  }
  return j;
}

export async function exchangeCodeForTokens(code) {
  return tokenRequest({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken(refreshToken) {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
}

/** Ensure connection row has a valid access token; refresh if needed. */
export async function ensureAccessToken(admin, conn) {
  const skewMs = 60_000;
  if (
    conn.accessToken &&
    conn.accessExpiresAt &&
    new Date(conn.accessExpiresAt).getTime() - Date.now() > skewMs
  ) {
    return conn.accessToken;
  }
  if (!conn.refreshToken) throw new Error("Missing refresh token — reconnect Google");
  const tok = await refreshAccessToken(conn.refreshToken);
  const expiresAt = new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString();
  const patch = {
    accessToken: tok.access_token,
    accessExpiresAt: expiresAt,
    updatedAt: new Date().toISOString(),
  };
  if (tok.refresh_token) patch.refreshToken = tok.refresh_token;
  await admin.from("google_connections").update(patch).eq("clientId", conn.clientId);
  return tok.access_token;
}

async function gfetch(url, accessToken) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.error?.message || j.error_description || j.error || `Google API ${r.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return j;
}

/** Normalize to locations/{id} for Performance API. */
export function toLocationResource(name) {
  if (!name) return null;
  const s = String(name);
  const m = s.match(/locations\/[^/]+/);
  return m ? m[0] : s.startsWith("locations/") ? s : `locations/${s}`;
}

export async function listGbpLocations(accessToken) {
  const accounts = await gfetch(`${ACCT_API}/accounts`, accessToken);
  const list = accounts.accounts || [];
  const out = [];
  for (const acct of list) {
    const accountName = acct.name; // accounts/123
    let pageToken = "";
    do {
      const q = new URLSearchParams({
        readMask: "name,title,storefrontAddress,phoneNumbers,websiteUri,metadata",
        pageSize: "100",
      });
      if (pageToken) q.set("pageToken", pageToken);
      const locRes = await gfetch(
        `${INFO_API}/${accountName}/locations?${q}`,
        accessToken
      );
      for (const loc of locRes.locations || []) {
        const addr = loc.storefrontAddress || {};
        const lines = addr.addressLines || [];
        out.push({
          accountName,
          locationName: toLocationResource(loc.name),
          title: loc.title || "",
          address: [lines[0], addr.locality, addr.administrativeArea, addr.postalCode]
            .filter(Boolean)
            .join(", "),
          phone: loc.phoneNumbers?.primaryPhone || "",
        });
      }
      pageToken = locRes.nextPageToken || "";
    } while (pageToken);
  }
  return out;
}

export async function fetchLocationNap(accessToken, locationName) {
  const name = toLocationResource(locationName);
  const q = new URLSearchParams({
    readMask: "name,title,storefrontAddress,phoneNumbers,websiteUri,metadata",
  });
  const loc = await gfetch(`${INFO_API}/${name}?${q}`, accessToken);
  const addr = loc.storefrontAddress || {};
  const lines = addr.addressLines || [];
  return {
    name: loc.title || "",
    address: lines[0] || "",
    city: addr.locality || "",
    state: addr.administrativeArea || "",
    zip: addr.postalCode || "",
    phone: loc.phoneNumbers?.primaryPhone || "",
    website: loc.websiteUri || "",
    mapsUri: loc.metadata?.mapsUri || "",
  };
}

function ymd(d) {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function sumSeries(series) {
  let total = 0;
  for (const pt of series?.datedValues || []) {
    total += Number(pt.value || 0);
  }
  return total;
}

function monthBuckets(series) {
  const map = {};
  for (const pt of series?.datedValues || []) {
    const d = pt.date;
    if (!d) continue;
    const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
    map[key] = (map[key] || 0) + Number(pt.value || 0);
  }
  return map;
}

/** Pull last ~90 days of views / calls / directions + monthly trend. */
export async function fetchPerformanceMetrics(accessToken, locationName) {
  const loc = toLocationResource(locationName);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 90);
  const metrics = [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    "CALL_CLICKS",
    "BUSINESS_DIRECTION_REQUESTS",
  ];
  const q = new URLSearchParams();
  for (const m of metrics) q.append("dailyMetrics", m);
  const s = ymd(start);
  const e = ymd(end);
  q.set("dailyRange.start_date.year", String(s.year));
  q.set("dailyRange.start_date.month", String(s.month));
  q.set("dailyRange.start_date.day", String(s.day));
  q.set("dailyRange.end_date.year", String(e.year));
  q.set("dailyRange.end_date.month", String(e.month));
  q.set("dailyRange.end_date.day", String(e.day));

  const data = await gfetch(
    `${PERF_API}/${loc}:fetchMultiDailyMetricsTimeSeries?${q}`,
    accessToken
  );

  const byMetric = {};
  for (const block of data.multiDailyMetricTimeSeries || []) {
    for (const row of block.dailyMetricTimeSeries || []) {
      if (row.dailyMetric) byMetric[row.dailyMetric] = row.timeSeries;
    }
  }

  const views =
    sumSeries(byMetric.BUSINESS_IMPRESSIONS_DESKTOP_MAPS) +
    sumSeries(byMetric.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH) +
    sumSeries(byMetric.BUSINESS_IMPRESSIONS_MOBILE_MAPS) +
    sumSeries(byMetric.BUSINESS_IMPRESSIONS_MOBILE_SEARCH);
  const calls = sumSeries(byMetric.CALL_CLICKS);
  const directions = sumSeries(byMetric.BUSINESS_DIRECTION_REQUESTS);

  const vM = monthBuckets(byMetric.BUSINESS_IMPRESSIONS_DESKTOP_MAPS);
  const vM2 = monthBuckets(byMetric.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH);
  const vM3 = monthBuckets(byMetric.BUSINESS_IMPRESSIONS_MOBILE_MAPS);
  const vM4 = monthBuckets(byMetric.BUSINESS_IMPRESSIONS_MOBILE_SEARCH);
  const cM = monthBuckets(byMetric.CALL_CLICKS);
  const dM = monthBuckets(byMetric.BUSINESS_DIRECTION_REQUESTS);
  const keys = new Set([
    ...Object.keys(vM),
    ...Object.keys(vM2),
    ...Object.keys(vM3),
    ...Object.keys(vM4),
    ...Object.keys(cM),
    ...Object.keys(dM),
  ]);
  const trend = [...keys]
    .sort()
    .slice(-6)
    .map((k) => {
      const [y, mo] = k.split("-");
      const label = new Date(Date.UTC(+y, +mo - 1, 1)).toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      });
      return {
        m: label,
        v: (vM[k] || 0) + (vM2[k] || 0) + (vM3[k] || 0) + (vM4[k] || 0),
        c: cM[k] || 0,
        d: dM[k] || 0,
      };
    });

  return { views, calls, directions, trend };
}

// ── NAP compare ──────────────────────────────────────────────

function digits(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function normText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldScore(a, b) {
  const x = normText(a);
  const y = normText(b);
  if (!x || !y) return null;
  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) return 90;
  // token overlap
  const tx = new Set(x.split(" "));
  const ty = new Set(y.split(" "));
  let hit = 0;
  for (const t of tx) if (ty.has(t)) hit++;
  const denom = Math.max(tx.size, ty.size) || 1;
  return Math.round((hit / denom) * 100);
}

/**
 * Compare GBP NAP to profile. Returns { score 0-100, napMatch }.
 * napMatch: match ≥90, fixed ≥70, else mismatch.
 */
export function compareNap(profile, gbp) {
  const nameS = fieldScore(profile.businessName || profile.name, gbp.name);
  const phoneS =
    digits(profile.phone) && digits(gbp.phone)
      ? digits(profile.phone) === digits(gbp.phone)
        ? 100
        : 0
      : null;
  const addrLine = [profile.address, profile.city, profile.state, profile.zip]
    .filter(Boolean)
    .join(" ");
  const gbpAddr = [gbp.address, gbp.city, gbp.state, gbp.zip].filter(Boolean).join(" ");
  const addrS = fieldScore(addrLine, gbpAddr);

  const parts = [nameS, phoneS, addrS].filter((v) => v != null);
  const score = parts.length
    ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
    : 0;
  let napMatch = "mismatch";
  if (score >= 90) napMatch = "match";
  else if (score >= 70) napMatch = "fixed";
  return { score, napMatch };
}

function napMatchToScore(m) {
  if (m === "match") return 100;
  if (m === "fixed") return 80;
  if (m === "mismatch") return 40;
  return null;
}

/** Recompute profile napScore from live listings' napMatch. */
export async function recomputeNapScore(admin, clientId) {
  const { data: listings } = await admin
    .from("listings")
    .select("status,napMatch,deletedAt")
    .eq("clientId", clientId);
  const live = (listings || []).filter(
    (l) => !l.deletedAt && l.status === "live" && l.napMatch && l.napMatch !== "–"
  );
  if (!live.length) return null;
  const scores = live
    .map((l) => napMatchToScore(l.napMatch))
    .filter((s) => s != null);
  if (!scores.length) return null;
  const napScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  await admin.from("profiles").update({ napScore }).eq("id", clientId);
  return napScore;
}

export async function upsertGoogleListingNap(admin, clientId, { napMatch, liveLink }) {
  const { data: existing } = await admin
    .from("listings")
    .select("*")
    .eq("clientId", clientId)
    .is("deletedAt", null);
  const google = (existing || []).find(
    (l) =>
      String(l.directory || "").toLowerCase().includes("google") &&
      String(l.directory || "").toLowerCase().includes("business")
  );
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (google) {
    await admin
      .from("listings")
      .update({
        napMatch,
        status: google.status === "pending" ? "live" : google.status,
        liveLink: liveLink || google.liveLink || "",
        liveDate:
          google.liveDate && google.liveDate !== "–" ? google.liveDate : today,
      })
      .eq("id", google.id);
  } else {
    const id = `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await admin.from("listings").insert({
      id,
      clientId,
      directory: GOOGLE_DIR,
      status: "live",
      submitted: today,
      liveDate: today,
      napMatch,
      liveLink: liveLink || "",
      da: 99,
      notes: "Synced from Google Business Profile",
    });
  }
}

/**
 * Full sync for one client connection: metrics → gmb, NAP → listing + napScore.
 */
export async function syncClientGbp(admin, clientId) {
  const { data: conn, error } = await admin
    .from("google_connections")
    .select("*")
    .eq("clientId", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!conn?.refreshToken) throw new Error("Google not connected");
  if (!conn.locationName) throw new Error("No GBP location selected");

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (!profile) throw new Error("Client not found");

  try {
    const access = await ensureAccessToken(admin, conn);
    const metrics = await fetchPerformanceMetrics(access, conn.locationName);
    const gbpNap = await fetchLocationNap(access, conn.locationName);
    const { napMatch, score } = compareNap(profile, gbpNap);

    const { data: prevGmb } = await admin
      .from("gmb")
      .select("data")
      .eq("clientId", clientId)
      .maybeSingle();
    const prev = prevGmb?.data || {};

    const gmbPayload = {
      ...prev,
      views: metrics.views,
      calls: metrics.calls,
      directions: metrics.directions,
      trend: metrics.trend?.length ? metrics.trend : prev.trend || [],
      source: "google",
      syncedAt: new Date().toISOString(),
      locationTitle: conn.locationTitle || gbpNap.name,
    };

    await admin.from("gmb").upsert({ clientId, data: gmbPayload });
    await upsertGoogleListingNap(admin, clientId, {
      napMatch,
      liveLink: gbpNap.mapsUri || "",
    });
    const napScore = await recomputeNapScore(admin, clientId);

    if (gbpNap.name || conn.locationName) {
      await admin
        .from("profiles")
        .update({
          gbpId: conn.locationName,
          ...(gbpNap.name ? {} : {}),
        })
        .eq("id", clientId);
    }

    const syncedAt = new Date().toISOString();
    await admin
      .from("google_connections")
      .update({
        syncedAt,
        status: "connected",
        lastError: null,
        locationTitle: conn.locationTitle || gbpNap.name || null,
        updatedAt: syncedAt,
      })
      .eq("clientId", clientId);

    return {
      ok: true,
      metrics: {
        views: metrics.views,
        calls: metrics.calls,
        directions: metrics.directions,
      },
      napMatch,
      napFieldScore: score,
      napScore,
      syncedAt,
    };
  } catch (e) {
    const msg = e.message || String(e);
    await admin
      .from("google_connections")
      .update({
        status: "error",
        lastError: msg.slice(0, 500),
        updatedAt: new Date().toISOString(),
      })
      .eq("clientId", clientId);
    throw e;
  }
}

/** Staff may manage GBP for client: mgr/sa, or assigned agent with gmb perm. */
export async function assertCanManageGbp(admin, staff, clientId) {
  const { data: client, error } = await admin
    .from("profiles")
    .select("id,role,assignedAgentId,businessName,name,plan")
    .eq("id", clientId)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  if (!client || client.role !== "client") {
    return { error: "Client not found", status: 404 };
  }
  if (staff.role === "super_admin" || staff.role === "manager") {
    return { client };
  }
  if (staff.role === "agent") {
    if (client.assignedAgentId !== staff.id) {
      return { error: "Client not assigned to you", status: 403 };
    }
    const perms = staff.perms || {};
    if (perms.gmb === false) {
      return { error: "GMB permission required", status: 403 };
    }
    return { client };
  }
  return { error: "Staff access required", status: 403 };
}

/** Safe connection meta for UI (no tokens). Presence of a row means OAuth completed. */
export function connectionPublicMeta(row) {
  if (!row) return null;
  return {
    connected: true,
    hasLocation: !!row.locationName,
    accountName: row.accountName || null,
    locationName: row.locationName || null,
    locationTitle: row.locationTitle || null,
    syncedAt: row.syncedAt || null,
    status: row.status || null,
    lastError: row.lastError || null,
  };
}
