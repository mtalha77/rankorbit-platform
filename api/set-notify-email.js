/**
 * Set / clear alternate notification email.
 * - email: send confirmation link to that address (does not activate until confirmed)
 * - clear: true → remove verified + pending notify email (emails go back to login)
 *
 * Body: { token, email? } or { token, clear: true }
 */
import { randomBytes } from "crypto";
import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";
import { sendNotifyEmails } from "../server/assign.js";
import { appBaseUrl } from "../server/emailTemplate.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAnyUser(admin, token) {
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (!staff.error) return { profile: staff.profile, portal: "admin" };
  const client = await requireClient(admin, token);
  if (client.error) return { error: client.error, status: client.status };
  return { profile: client.profile, portal: "dashboard" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireAnyUser(admin, body.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const profile = auth.profile;
  const loginEmail = String(profile.email || "").trim().toLowerCase();

  if (body.clear) {
    const { error } = await admin
      .from("profiles")
      .update({
        notifyEmail: null,
        notifyEmailPending: null,
        notifyEmailToken: null,
        notifyEmailTokenExpiresAt: null,
      })
      .eq("id", profile.id);
    if (error) {
      const missing = /notifyEmail/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Run supabase/notify-email.sql in the Supabase SQL editor first."
          : error.message,
      });
    }
    return res.status(200).json({
      ok: true,
      cleared: true,
      notifyEmail: null,
      notifyEmailPending: null,
    });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (email === loginEmail) {
    return res.status(400).json({
      error: "That’s your login email. Leave the field empty to keep receiving notifications there, or use a different address.",
    });
  }

  const alreadyActive = String(profile.notifyEmail || "").trim().toLowerCase();
  if (alreadyActive && alreadyActive === email) {
    // Clear any stale pending for the same address.
    await admin
      .from("profiles")
      .update({
        notifyEmailPending: null,
        notifyEmailToken: null,
        notifyEmailTokenExpiresAt: null,
      })
      .eq("id", profile.id);
    return res.status(200).json({
      ok: true,
      already: true,
      notifyEmail: alreadyActive,
      pending: null,
    });
  }

  const confirmToken = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("profiles")
    .update({
      notifyEmailPending: email,
      notifyEmailToken: confirmToken,
      notifyEmailTokenExpiresAt: expiresAt,
      // Keep existing verified notifyEmail until the new one is confirmed.
    })
    .eq("id", profile.id);
  if (error) {
    const missing = /notifyEmail/i.test(error.message || "");
    return res.status(500).json({
      error: missing
        ? "Run supabase/notify-email.sql in the Supabase SQL editor first."
        : error.message,
    });
  }

  // Prefer the browser origin for local dev (localhost); else APP_URL / production.
  let base = appBaseUrl();
  try {
    const origin = String(body.appOrigin || "").replace(/\/$/, "");
    if (origin) {
      const u = new URL(origin);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") base = origin;
      else if (base) {
        const app = new URL(base);
        if (u.origin === app.origin) base = origin;
      }
    }
  } catch { /* keep base */ }

  const confirmUrl = `${base}/confirm-notify-email?t=${encodeURIComponent(confirmToken)}`;
  const mail = await sendNotifyEmails(
    [email],
    "Confirm your notification email — NAP Orbit",
    "Confirm this address to receive NAP Orbit notification emails here instead of your login email. This does not change how you sign in.\n\nYou can also confirm from Settings → Confirm now while signed in.",
    { ctaUrl: confirmUrl, ctaLabel: "Confirm notification email" }
  );
  if (!mail.sent) {
    return res.status(502).json({
      error:
        mail.reason === "no_resend_key"
          ? "Email service is not configured (RESEND_API_KEY)."
          : `Could not send confirmation email: ${mail.reason || "unknown"}`,
      pending: email,
    });
  }

  return res.status(200).json({
    ok: true,
    pending: email,
    notifyEmail: profile.notifyEmail || null,
    expiresAt,
    // Local/dev: same-origin confirm page (email may still point at production APP_URL).
    confirmPath: `/confirm-notify-email?t=${encodeURIComponent(confirmToken)}`,
  });
}
