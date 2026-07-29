/**
 * Set password after landing pay-first Resend link (?lpw=token).
 * Does not use Supabase Auth invite/recovery emails.
 * Body: { token, password }
 */
import { getAdmin, readJson } from "../server/billing.js";

function passwordIssues(pw) {
  const issues = [];
  if (!pw || pw.length !== 8) issues.push("exactly 8 characters");
  if (!/[A-Z]/.test(pw)) issues.push("an uppercase letter");
  if (!/[a-z]/.test(pw)) issues.push("a lowercase letter");
  if (!/[0-9]/.test(pw)) issues.push("a number");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("a symbol");
  return issues;
}

function parseLandingPwRow(type) {
  // type: landing_password:<userId>:<expiresAtMs>
  const m = String(type || "").match(/^landing_password:([^:]+):(\d+)$/);
  if (!m) return null;
  return { userId: m[1], expiresAt: Number(m[2]) };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");
  if (!token || token.length < 32) {
    return res.status(400).json({ error: "Invalid or expired link" });
  }
  const issues = passwordIssues(password);
  if (issues.length) {
    return res.status(400).json({ error: `Password needs ${issues.join(", ")}` });
  }

  const rowId = `lpw_${token}`;
  const { data: row, error: loadErr } = await admin
    .from("stripe_events")
    .select("id,type")
    .eq("id", rowId)
    .maybeSingle();
  if (loadErr) return res.status(500).json({ error: loadErr.message });
  if (!row) return res.status(400).json({ error: "Invalid or expired link" });

  const parsed = parseLandingPwRow(row.type);
  if (!parsed?.userId || !parsed.expiresAt) {
    return res.status(400).json({ error: "Invalid or expired link" });
  }
  if (Date.now() > parsed.expiresAt) {
    await admin.from("stripe_events").delete().eq("id", rowId);
    return res.status(400).json({
      error: "This link has expired. Use Forgot password on the sign-in page.",
    });
  }

  const { error: pwErr } = await admin.auth.admin.updateUserById(parsed.userId, {
    password,
    email_confirm: true,
  });
  if (pwErr) {
    console.error("complete-landing-password:", pwErr.message);
    return res.status(500).json({ error: pwErr.message || "Could not update password" });
  }

  await admin.from("stripe_events").delete().eq("id", rowId);
  return res.status(200).json({ ok: true });
}
