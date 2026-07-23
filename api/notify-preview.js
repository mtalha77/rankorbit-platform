/** Staff-only: return branded notify HTML preview (same shell as Resend). Does not send. */
import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { buildNotifyEmail } from "../server/emailTemplate.js";

function appBaseUrl() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  return raw || "https://nap.rankorbit.com";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const payload = await readJson(req);
  const { token, title, body } = payload || {};
  const staff = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "bdm", "agent"],
  });
  if (staff.error) return res.status(staff.status || 401).json({ error: staff.error });
  const profile = staff.profile;
  const allowed =
    profile.role === "super_admin" || profile.perms?.broadcastClients === true;
  if (!allowed) return res.status(403).json({ error: "Broadcast permission required" });

  const subject = (title && String(title).trim()) || "NAP Orbit update";
  const textBody = (body && String(body).trim()) || "";
  const { html, text } = buildNotifyEmail({
    subject,
    body: textBody,
    ctaUrl: `${appBaseUrl()}/dashboard`,
    ctaLabel: "Open dashboard",
  });
  return res.status(200).json({ ok: true, html, text });
}
