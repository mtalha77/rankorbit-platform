/**
 * Confirm the logged-in user's pending notification email (no email-link required).
 * Body: { token }
 * Use from Settings → "Confirm now" when the inbox link is broken / not deployed.
 */
import { getAdmin, readJson, requireClient, requireStaff } from "../server/billing.js";

async function requireAnyUser(admin, token) {
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (!staff.error) return { profile: staff.profile };
  const client = await requireClient(admin, token);
  if (client.error) return { error: client.error, status: client.status };
  return { profile: client.profile };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireAnyUser(admin, body.token);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const { data: row, error } = await admin
    .from("profiles")
    .select("id,role,notifyEmailPending,notifyEmailToken,notifyEmailTokenExpiresAt")
    .eq("id", auth.profile.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: "Profile not found" });

  const pending = String(row.notifyEmailPending || "").trim().toLowerCase();
  if (!pending || !row.notifyEmailToken) {
    if (auth.profile.notifyEmail) {
      return res.status(200).json({
        ok: true,
        already: true,
        notifyEmail: auth.profile.notifyEmail,
      });
    }
    return res.status(400).json({ error: "No pending notification email to confirm. Send confirmation first." });
  }

  const exp = row.notifyEmailTokenExpiresAt ? new Date(row.notifyEmailTokenExpiresAt).getTime() : 0;
  if (!exp || exp < Date.now()) {
    await admin
      .from("profiles")
      .update({
        notifyEmailPending: null,
        notifyEmailToken: null,
        notifyEmailTokenExpiresAt: null,
      })
      .eq("id", row.id);
    return res.status(400).json({ error: "Confirmation expired. Send a new confirmation email." });
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      notifyEmail: pending,
      notifyEmailPending: null,
      notifyEmailToken: null,
      notifyEmailTokenExpiresAt: null,
    })
    .eq("id", row.id);

  if (upErr) {
    return res.status(500).json({
      error: /notifyEmail/i.test(upErr.message || "")
        ? "Run supabase/notify-email.sql in the Supabase SQL editor first."
        : upErr.message,
    });
  }

  return res.status(200).json({ ok: true, notifyEmail: pending, role: row.role });
}
