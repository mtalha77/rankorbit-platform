/**
 * Password reset: check that an account exists, then send the recovery email.
 * Body: { email, returnOrigin? }
 * Returns { ok:true, exists:true } or { ok:false, exists:false } or { error }.
 */
import { getAdmin, readJson, returnBase } from "../server/billing.js";

const cleanUrl = (s) => (s ? String(s).replace(/[^\x21-\x7E]/g, "").trim() : s);
const cleanKey = (s) => (s ? String(s).replace(/[^A-Za-z0-9._\-]/g, "") : s);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = await readJson(req);
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { data: profile, error: qErr } = await admin
    .from("profiles")
    .select("id,email")
    .ilike("email", email)
    .maybeSingle();

  if (qErr) return res.status(500).json({ error: "Could not check account" });
  if (!profile) {
    return res.status(200).json({ ok: false, exists: false });
  }

  const supabaseUrl = cleanUrl(process.env.VITE_SUPABASE_URL);
  const anonKey = cleanKey(process.env.VITE_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const base = returnBase(req, body?.returnOrigin);
  const redirectTo = `${base}/reset-password`;
  const sendTo = String(profile.email || email).trim();

  const r = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: sendTo, redirect_to: redirectTo }),
  });

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    const msg = j.error_description || j.msg || j.error || "Could not send reset email";
    if (/rate limit|too many/i.test(String(msg)) || r.status === 429) {
      return res.status(429).json({
        error:
          "Too many reset emails sent. Please wait a few minutes, then try again — or check your inbox for the earlier link.",
      });
    }
    return res.status(500).json({ error: typeof msg === "string" ? msg : "Could not send reset email" });
  }

  return res.status(200).json({ ok: true, exists: true });
}
