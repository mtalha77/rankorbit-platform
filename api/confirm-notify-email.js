/**
 * Confirm alternate notification email via link token.
 * GET  ?t=TOKEN → redirect (legacy links)
 * POST { t }    → JSON { ok, role, notifyEmail } for SPA
 */
import { getAdmin } from "../server/billing.js";
import { appBaseUrl } from "../server/emailTemplate.js";

function readQuery(req) {
  try {
    const u = new URL(req.url || "", "http://localhost");
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return {};
  }
}

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

function redirect(res, path) {
  const loc = `${appBaseUrl()}${path}`;
  res.statusCode = 302;
  res.setHeader("Location", loc);
  res.end();
}

async function confirmToken(admin, t) {
  const token = String(t || "").trim();
  if (!token) return { ok: false, error: "missing" };

  const { data: row, error } = await admin
    .from("profiles")
    .select("id,role,notifyEmailPending,notifyEmailToken,notifyEmailTokenExpiresAt")
    .eq("notifyEmailToken", token)
    .maybeSingle();

  if (error) return { ok: false, error: "error", detail: error.message };
  if (!row) return { ok: false, error: "invalid" };

  const exp = row.notifyEmailTokenExpiresAt ? new Date(row.notifyEmailTokenExpiresAt).getTime() : 0;
  const pending = String(row.notifyEmailPending || "").trim().toLowerCase();
  if (!pending || !exp || exp < Date.now()) {
    await admin
      .from("profiles")
      .update({
        notifyEmailPending: null,
        notifyEmailToken: null,
        notifyEmailTokenExpiresAt: null,
      })
      .eq("id", row.id);
    return { ok: false, error: "expired" };
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
    console.error("confirm-notify-email:", upErr.message);
    return { ok: false, error: "error", detail: upErr.message };
  }

  return { ok: true, role: row.role, notifyEmail: pending };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  if (req.method === "POST") {
    const body = await readJson(req);
    const result = await confirmToken(admin, body.t);
    if (!result.ok) return res.status(400).json(result);
    return res.status(200).json(result);
  }

  const q = readQuery(req);
  const result = await confirmToken(admin, q.t);
  if (!result.ok) {
    return redirect(res, `/login?notifyEmail=${encodeURIComponent(result.error || "invalid")}`);
  }
  const staff = result.role && result.role !== "client";
  const dest = staff
    ? `/admin?notifyEmail=confirmed&addr=${encodeURIComponent(result.notifyEmail)}`
    : `/dashboard?notifyEmail=confirmed&addr=${encodeURIComponent(result.notifyEmail)}`;
  return redirect(res, dest);
}
