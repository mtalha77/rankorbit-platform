/**
 * Supabase Auth → Send Email Hook.
 *
 * Replaces built-in Auth mailer when enabled in the dashboard.
 * - Blocks "invite" emails unless user_metadata.role is staff (super_admin|manager|agent)
 * - Sends confirm / recovery / staff-invite / etc. via Resend (branded HTML)
 *
 * Env:
 *   SEND_EMAIL_HOOK_SECRET   (from Supabase Auth Hooks UI, form v1,whsec_...)
 *   RESEND_API_KEY
 *   NOTIFY_FROM_EMAIL
 *   VITE_SUPABASE_URL
 *   APP_URL
 *
 * Setup: Supabase → Authentication → Hooks → Send Email → HTTPS endpoint
 *   https://nap.rankorbit.com/api/auth-send-email-hook
 * Then disable Custom SMTP (hook owns delivery).
 */

import { Webhook } from "standardwebhooks";
import {
  authEmailCopy,
  authVerifyUrl,
  buildNotifyEmail,
} from "../server/emailTemplate.js";

const cleanUrl = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function sendResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL || "NAP Orbit <noreply@nap.rankorbit.com>";
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "Resend failed");
  return j;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const secretRaw = process.env.SEND_EMAIL_HOOK_SECRET || "";
  const secret = secretRaw.replace(/^v1,whsec_/, "").trim();
  if (!secret) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { message: "SEND_EMAIL_HOOK_SECRET not configured" } }));
    return;
  }

  try {
    const payload = await readRaw(req);
    const headers = {
      "webhook-id": req.headers["webhook-id"],
      "webhook-timestamp": req.headers["webhook-timestamp"],
      "webhook-signature": req.headers["webhook-signature"],
    };
    const wh = new Webhook(secret);
    const event = wh.verify(payload, headers);
    const user = event.user || {};
    const emailData = event.email_data || {};
    const action = emailData.email_action_type || "";
    const role = user.user_metadata?.role || user.app_metadata?.role || "";

    const copy = authEmailCopy(action, { role, token: emailData.token });
    // Intentionally skip (e.g. client invite) — return 200 so Auth does not retry.
    if (!copy) {
      console.info("[auth-email-hook] skipped", action, "role=", role || "(none)", "to=", user.email);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({}));
      return;
    }

    const projectUrl = cleanUrl(process.env.VITE_SUPABASE_URL);
    const verifyUrl =
      copy.ctaLabel === null
        ? null
        : authVerifyUrl(emailData, projectUrl);

    const { html, text } = buildNotifyEmail({
      subject: copy.subject,
      body: copy.body,
      ctaUrl: verifyUrl,
      ctaLabel: copy.ctaLabel || "Open NAP Orbit",
    });

    await sendResend({
      to: user.email,
      subject: copy.subject,
      html,
      text,
    });

    console.info("[auth-email-hook] sent", action, "to=", user.email);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({}));
  } catch (e) {
    console.error("[auth-email-hook]", e.message || e);
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          http_code: 401,
          message: e.message || "Hook verification or send failed",
        },
      })
    );
  }
}
