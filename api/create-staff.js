// Vercel serverless function: create a staff (manager/agent) login account.
// Uses the Supabase admin API (service-role key) to create an auth user with a
// preset password, then writes their profile row with the chosen role.
//
// Env vars required (Vercel → Settings → Environment Variables):
//   VITE_SUPABASE_URL          (already set for the frontend)
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role secret)
//
// SECURITY: the caller must be an authenticated super_admin or manager. We verify
// this by reading the caller's access token, resolving their profile, and checking
// their role. Managers may only create agents; super_admins may create either.

import { createClient } from "@supabase/supabase-js";

// Sanitize env values: trim whitespace and remove any non-ASCII char (e.g. a stray
// arrow/line-break artifact from copy-paste) that would break HTTP header construction.
const clean = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);
const URL = clean(process.env.VITE_SUPABASE_URL);
const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured (missing service role key)" });

  const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  // Read the whole payload first; the caller's token comes in the body (headers are ASCII-only).
  const { token, name, email, password, role } = await readJson(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  // Verify the caller by decoding the JWT payload directly. We avoid admin.auth.getUser(token)
  // because it puts the token into an HTTP header internally, which throws a ByteString error
  // if the token contains any non-ASCII character. Decoding the middle segment is header-free.
  let callerId = null;
  try {
    const cleanTok = String(token).replace(/[^A-Za-z0-9._-]/g, "");
    const parts = cleanTok.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Malformed token (not a JWT)" });
    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);
    callerId = payload.sub;
    if (!callerId) return res.status(401).json({ error: "Token has no user id" });
    // Expiry check.
    if (payload.exp && Date.now() / 1000 > payload.exp) return res.status(401).json({ error: "Session expired, log out and back in" });
  } catch (e) {
    return res.status(401).json({ error: "Could not read token: " + (e.message || "invalid") });
  }

  // Verify the caller via their profile (the token already proved they hold a valid session
  // for this id). If a profile with a staff role exists, they're authorized.
  const { data: caller, error: profErr2 } = await admin.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (profErr2) return res.status(500).json({ error: "Profile lookup failed: " + profErr2.message });
  if (!caller) return res.status(401).json({ error: "No profile found for your account (id " + callerId + "). Make sure your admin profile row exists." });
  const callerRole = caller.role;
  if (callerRole !== "super_admin" && callerRole !== "manager") {
    return res.status(403).json({ error: "Only super admins and managers can create staff (your role: " + (callerRole || "none") + ")" });
  }

  // Validate the requested new account.
  if (!name || !email || !password || !role) return res.status(400).json({ error: "Missing name, email, password, or role" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (!["super_admin", "manager", "agent"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  // Managers may only create agents. Only super_admins may create super_admins or managers.
  if (callerRole === "manager" && role !== "agent") return res.status(403).json({ error: "Managers can only create agents" });

  // 3) Create the auth user (email pre-confirmed so they can log in immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const newId = created.user.id;

  // 4) Write / upsert the profile with the role and a viewable credential copy.
  // staffPassword is stored so super_admin/manager can re-share the login (Option A).
  const { error: profErr } = await admin.from("profiles").upsert({
    id: newId,
    email,
    name,
    role,
    avatar: (name[0] || "?").toUpperCase(),
    status: "active",
    createdAt: new Date().toISOString(),
    staffPassword: password,
    createdByRole: callerRole === "super_admin" ? "Super Admin" : "Manager",
  }, { onConflict: "id" });
  if (profErr) return res.status(400).json({ error: "Account created but profile failed: " + profErr.message });

  return res.status(200).json({ ok: true, id: newId, email, role });
}
