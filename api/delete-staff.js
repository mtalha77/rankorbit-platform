// Permanently delete a staff account (super_admin only).
// Removes auth user → profile cascade → staff_messages cascade.
import { createClient } from "@supabase/supabase-js";

const cleanUrl = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);
const cleanKey = (s) => (s ? String(s).replace(/[^A-Za-z0-9._\-]/g, "") : s);
const URL = cleanUrl(process.env.VITE_SUPABASE_URL);
const SERVICE_KEY = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const STAFF = new Set(["super_admin", "manager", "bdm", "agent"]);

function readJson(req) {
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  const admin = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { token, staffId } = await readJson(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  if (!staffId) return res.status(400).json({ error: "staffId required" });

  let callerId = null;
  try {
    const cleanTok = String(token).replace(/[^A-Za-z0-9._-]/g, "");
    const parts = cleanTok.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Malformed token" });
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
    callerId = payload.sub;
    if (!callerId) return res.status(401).json({ error: "Token has no user id" });
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return res.status(401).json({ error: "Session expired" });
    }
  } catch (e) {
    return res.status(401).json({ error: "Could not read token: " + (e.message || "invalid") });
  }

  if (String(staffId) === String(callerId)) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const { data: caller, error: cErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (cErr) return res.status(500).json({ error: cErr.message });
  if (!caller || caller.role !== "super_admin") {
    return res.status(403).json({ error: "Only super admins can delete team members" });
  }

  const { data: target, error: tErr } = await admin
    .from("profiles")
    .select("id,role,name,email")
    .eq("id", staffId)
    .maybeSingle();
  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!target) return res.status(404).json({ error: "Team member not found" });
  if (!STAFF.has(target.role)) {
    return res.status(400).json({ error: "Only staff accounts can be removed this way" });
  }

  // Hard delete auth user — profiles + staff_messages cascade.
  const { error: delErr } = await admin.auth.admin.deleteUser(staffId);
  if (delErr) return res.status(500).json({ error: delErr.message || "Could not delete account" });

  return res.status(200).json({ ok: true, name: target.name || target.email || null });
}
