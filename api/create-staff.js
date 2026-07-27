// Vercel serverless: invite a staff (manager/agent) login account.
// Creates Auth user via generateLink (no Supabase Auth mailer) and sends
// the invite email ourselves through Resend — avoids Auth "email rate limit".
// Clients never use this path (they sign up + confirm).
//
// Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//      NOTIFY_FROM_EMAIL, APP_URL (optional)

import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifySuperAdmins, sendNotifyEmails } from "../server/assign.js";
import { isBdmRole, isAgentRole, staffRoleLabel } from "../server/roles.js";
import { appBaseUrl } from "../server/emailTemplate.js";

function appBase() {
  return appBaseUrl();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured (missing service role key)" });

  const { token, name, email, role } = await readJson(req);
  const auth = await requireStaff(admin, token, { roles: ["super_admin", "manager"] });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const caller = auth.profile;
  const callerId = caller.id;
  const callerRole = caller.role;

  if (!name || !email || !role) return res.status(400).json({ error: "Missing name, email, or role" });
  if (!["super_admin", "manager", "bdm", "agent"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (callerRole === "manager" && !isBdmRole(role) && !isAgentRole(role)) {
    return res.status(403).json({ error: "Managers can only invite BDMs and Agents" });
  }

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

  const roleLabel = staffRoleLabel(role);
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
