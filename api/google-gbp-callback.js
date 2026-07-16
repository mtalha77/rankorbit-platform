import { getAdmin, appUrl } from "../server/billing.js";
import {
  exchangeCodeForTokens,
  googleConfigured,
  verifyOAuthState,
} from "../server/googleGbp.js";

/**
 * GET ?code=&state= — OAuth callback; store tokens; redirect to admin pick-location.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  const q = req.query || {};
  const err = q.error;
  const code = q.code;
  const state = q.state;

  const parsed = verifyOAuthState(state);
  const base = (parsed?.returnOrigin || appUrl()).replace(/\/$/, "");
  const fail = (msg) => {
    const u = new URL(base);
    u.searchParams.set("gbp", "error");
    u.searchParams.set("gbpMsg", msg.slice(0, 200));
    if (parsed?.clientId) u.searchParams.set("gbpClient", parsed.clientId);
    res.writeHead(302, { Location: u.toString() });
    return res.end();
  };

  if (err) return fail(String(q.error_description || err));
  if (!googleConfigured()) return fail("Google OAuth not configured on server");
  if (!code || !parsed) return fail("Invalid or expired OAuth state");

  const admin = getAdmin();
  if (!admin) return fail("Server not configured");

  try {
    const tok = await exchangeCodeForTokens(code);
    if (!tok.refresh_token && !tok.access_token) {
      return fail("No tokens returned — try Connect again with consent");
    }

    const { data: existing } = await admin
      .from("google_connections")
      .select("refreshToken")
      .eq("clientId", parsed.clientId)
      .maybeSingle();

    const expiresAt = new Date(
      Date.now() + (tok.expires_in || 3600) * 1000
    ).toISOString();
    const now = new Date().toISOString();
    const refreshToken = tok.refresh_token || existing?.refreshToken || null;
    if (!refreshToken) {
      return fail("Google did not return a refresh token. Revoke app access and reconnect.");
    }
    const row = {
      clientId: parsed.clientId,
      accessToken: tok.access_token || null,
      accessExpiresAt: expiresAt,
      refreshToken,
      status: "pending",
      lastError: null,
      connectedBy: parsed.staffId,
      updatedAt: now,
    };
    if (!existing) row.createdAt = now;

    const { error: upErr } = await admin.from("google_connections").upsert(row);
    if (upErr) return fail(upErr.message);

    const u = new URL(base);
    u.searchParams.set("gbp", "pick");
    u.searchParams.set("gbpClient", parsed.clientId);
    res.writeHead(302, { Location: u.toString() });
    return res.end();
  } catch (e) {
    return fail(e.message || "OAuth failed");
  }
}
