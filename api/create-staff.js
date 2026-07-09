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

const URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid session: " + (userErr?.message || "log out and back in") });
  }

  const { data: caller } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  const callerRole = caller?.role;
  if (callerRole !== "super_admin" && callerRole !== "manager") {
    return res.status(403).json({ error: "Only super admins and managers can create staff" });
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
