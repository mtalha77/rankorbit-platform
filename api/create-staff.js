// Vercel serverless: invite a staff (manager/agent) login account.
// Creates Auth user via generateLink (no Supabase Auth mailer) and sends
// the invite email ourselves through Resend — avoids Auth "email rate limit".
// Clients never use this path (they sign up + confirm).
//
// Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//      NOTIFY_FROM_EMAIL, APP_URL (optional)

import { createClient } from "@supabase/supabase-js";
import { notifySuperAdmins, sendNotifyEmails } from "../server/assign.js";

const cleanUrl = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);
const cleanKey = (s) => (s ? String(s).replace(/[^A-Za-z0-9._\-]/g, "") : s);
const URL = cleanUrl(process.env.VITE_SUPABASE_URL);
const SERVICE_KEY = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
  });
}

function appBase() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  return raw || "https://nap.rankorbit.com";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured (missing service role key)" });

  const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { token, name, email, role } = await readJson(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let callerId = null;
  try {
    const cleanTok = String(token).replace(/[^A-Za-z0-9._-]/g, "");
    const parts = cleanTok.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Malformed token (not a JWT)" });
    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);
    callerId = payload.sub;
    if (!callerId) return res.status(401).json({ error: "Token has no user id" });
    if (payload.exp && Date.now() / 1000 > payload.exp) return res.status(401).json({ error: "Session expired, log out and back in" });
  } catch (e) {
    return res.status(401).json({ error: "Could not read token: " + (e.message || "invalid") });
  }

  const { data: caller, error: profErr2 } = await admin.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (profErr2) return res.status(500).json({ error: "Profile lookup failed: " + profErr2.message });
  if (!caller) return res.status(401).json({ error: "No profile found for your account (id " + callerId + "). Make sure your admin profile row exists." });
  const callerRole = caller.role;
  if (callerRole !== "super_admin" && callerRole !== "manager") {
    return res.status(403).json({ error: "Only super admins and managers can invite staff (your role: " + (callerRole || "none") + ")" });
  }

  if (!name || !email || !role) return res.status(400).json({ error: "Missing name, email, or role" });
  if (!["super_admin", "manager", "agent"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (callerRole === "manager" && role !== "agent") return res.status(403).json({ error: "Managers can only invite agents" });

  const emailNorm = String(email).trim().toLowerCase();

  // generateLink creates/updates the Auth user and returns action_link — does NOT send email.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: emailNorm,
    options: {
      data: { name, role },
      redirectTo: `${appBase()}/admin`,
    },
  });
  if (linkErr) {
    const msg = linkErr.message || "Could not create invite";
    if (/rate limit|email rate/i.test(msg)) {
      return res.status(429).json({
        error: "Invite temporarily limited. Wait a minute and try again, or use a different email.",
      });
    }
    return res.status(400).json({ error: msg });
  }

  const newId = linkData?.user?.id;
  const actionLink = linkData?.properties?.action_link;
  if (!newId) return res.status(400).json({ error: "Invite created but no user id returned" });
  if (!actionLink) return res.status(500).json({ error: "Invite link missing from Auth response" });

  const { error: profErr } = await admin.from("profiles").upsert({
    id: newId,
    email: emailNorm,
    name,
    role,
    avatar: (name[0] || "?").toUpperCase(),
    status: "active",
    createdAt: new Date().toISOString(),
    staffPassword: null,
    createdByRole: callerRole === "super_admin" ? "Super Admin" : "Manager",
  }, { onConflict: "id" });
  if (profErr) return res.status(400).json({ error: "User created but profile failed: " + profErr.message });

  const emailResult = await sendNotifyEmails(
    [emailNorm],
    "You're invited to NAP Orbit (staff)",
    "You've been invited to join the NAP Orbit staff team. Click below to accept and set your password.",
    { ctaUrl: actionLink, ctaLabel: "Accept invitation" }
  );
  if (!emailResult.sent) {
    const reason = emailResult.reason || "email_failed";
    if (reason === "no_resend_key") {
      return res.status(500).json({
        error: "Staff account created, but RESEND_API_KEY is missing — invite email was not sent.",
        id: newId,
        invited: false,
      });
    }
    return res.status(502).json({
      error: `Staff account created, but invite email failed: ${reason}`,
      id: newId,
      invited: false,
    });
  }

  const roleLabel = role === "super_admin" ? "Super Admin" : role === "manager" ? "Manager" : "Agent";
  const { data: callerProfile } = await admin.from("profiles").select("name,email").eq("id", callerId).maybeSingle();
  const byWhom = callerProfile?.name || callerProfile?.email || "Staff";
  try {
    await notifySuperAdmins(admin, {
      type: "staff_created",
      title: `New ${roleLabel.toLowerCase()} invited`,
      body: `${name} (${emailNorm}) was invited as ${roleLabel} by ${byWhom}.`,
      meta: { staffId: newId, role, email: emailNorm, name, createdBy: callerId },
      excludeUserId: null,
    });
  } catch (e) {
    console.warn("create-staff notify:", e.message);
  }

  return res.status(200).json({ ok: true, id: newId, email: emailNorm, role, invited: true });
}
