// Vercel serverless function: invite a staff (manager/agent) login account.
// Uses Supabase inviteUserByEmail (service-role) so ONLY staff get the Auth
// "invite" email. Clients must sign up themselves (signUp → confirm email only).
//
// Env vars required (Vercel → Settings → Environment Variables):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   APP_URL (optional — invite redirect)
//
// SECURITY: caller must be authenticated super_admin or manager.
// Managers may only invite agents; super_admins may invite any staff role.

import { createClient } from "@supabase/supabase-js";
import { notifySuperAdmins } from "../server/assign.js";

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

  // Invite email only for staff — role is stored in user_metadata so the
  // auth-send-email-hook can allow this invite and block client invites.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: `${appBase()}/admin`,
  });
  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  const newId = invited.user?.id;
  if (!newId) return res.status(400).json({ error: "Invite created but no user id returned" });

  const { error: profErr } = await admin.from("profiles").upsert({
    id: newId,
    email,
    name,
    role,
    avatar: (name[0] || "?").toUpperCase(),
    status: "active",
    createdAt: new Date().toISOString(),
    staffPassword: null,
    createdByRole: callerRole === "super_admin" ? "Super Admin" : "Manager",
  }, { onConflict: "id" });
  if (profErr) return res.status(400).json({ error: "Invite sent but profile failed: " + profErr.message });

  const roleLabel = role === "super_admin" ? "Super Admin" : role === "manager" ? "Manager" : "Agent";
  const { data: callerProfile } = await admin.from("profiles").select("name,email").eq("id", callerId).maybeSingle();
  const byWhom = callerProfile?.name || callerProfile?.email || "Staff";
  try {
    await notifySuperAdmins(admin, {
      type: "staff_created",
      title: `New ${roleLabel.toLowerCase()} invited`,
      body: `${name} (${email}) was invited as ${roleLabel} by ${byWhom}.`,
      meta: { staffId: newId, role, email, name, createdBy: callerId },
      excludeUserId: null,
    });
  } catch (e) {
    console.warn("create-staff notify:", e.message);
  }

  return res.status(200).json({ ok: true, id: newId, email, role, invited: true });
}
