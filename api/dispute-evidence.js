import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { zipStore, toCsv } from "../server/zipStore.js";

function safeName(s) {
  return String(s || "client")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function dedupeById(rows) {
  const map = new Map();
  for (const r of rows || []) {
    if (r?.id) map.set(r.id, r);
  }
  return [...map.values()];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = await readJson(req);
  const auth = await requireStaff(admin, body?.token, { roles: ["super_admin", "manager"] });
  if (auth.error) return res.status(auth.status || 403).json({ error: auth.error });

  const clientId = body.clientId;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const { data: client, error: cErr } = await admin.from("profiles").select("*").eq("id", clientId).maybeSingle();
  if (cErr) return res.status(500).json({ error: cErr.message });
  if (!client || client.role !== "client") return res.status(404).json({ error: "Client not found" });

  const email = (client.email || "").toLowerCase();

  const byUserConsent = await admin
    .from("consent_records")
    .select("*")
    .eq("userId", clientId)
    .order("acceptedAt", { ascending: false });
  const byEmailConsent = email
    ? await admin.from("consent_records").select("*").eq("email", email).order("acceptedAt", { ascending: false })
    : { data: [] };
  const consentRows = dedupeById([...(byUserConsent.data || []), ...(byEmailConsent.data || [])]);

  const byUserAccess = await admin
    .from("access_events")
    .select("*")
    .eq("userId", clientId)
    .order("createdAt", { ascending: false })
    .limit(2000);
  const byEmailAccess = email
    ? await admin
        .from("access_events")
        .select("*")
        .eq("email", email)
        .order("createdAt", { ascending: false })
        .limit(2000)
    : { data: [] };
  const accessRows = dedupeById([...(byUserAccess.data || []), ...(byEmailAccess.data || [])]);

  const invoices = await admin.from("invoices").select("*").eq("clientId", clientId).order("createdAt", { ascending: false });
  const activity = await admin.from("activity").select("*").eq("clientId", clientId).order("createdAt", { ascending: false }).limit(1000);
  const messagesRes = await admin
    .from("messages")
    .select("*")
    .eq("clientId", clientId)
    .order("createdAt", { ascending: true })
    .limit(2000);
  const messages = { data: messagesRes.error ? [] : messagesRes.data || [] };

  const summary = {
    exportedAt: new Date().toISOString(),
    exportedBy: { id: auth.profile.id, email: auth.profile.email, role: auth.profile.role },
    client: {
      id: client.id,
      email: client.email,
      name: client.name,
      businessName: client.businessName,
      plan: client.plan,
      subscriptionStatus: client.subscriptionStatus,
      stripeCustomerId: client.stripeCustomerId,
      stripeSubscriptionId: client.stripeSubscriptionId,
      cancelAtPeriodEnd: client.cancelAtPeriodEnd,
      canceledAt: client.canceledAt,
      currentPeriodStart: client.currentPeriodStart,
      currentPeriodEnd: client.currentPeriodEnd,
      createdAt: client.createdAt,
      status: client.status,
    },
    counts: {
      consent: consentRows.length,
      accessEvents: accessRows.length,
      invoices: (invoices.data || []).length,
      activity: (activity.data || []).length,
      messages: (messages.data || []).length,
    },
  };

  const zip = zipStore([
    { name: "summary.json", data: JSON.stringify(summary, null, 2) },
    { name: "consent.csv", data: toCsv(consentRows) },
    { name: "access_events.csv", data: toCsv(accessRows) },
    { name: "invoices.csv", data: toCsv(invoices.data || []) },
    { name: "activity.csv", data: toCsv(activity.data || []) },
    { name: "messages.csv", data: toCsv(messages.data || []) },
  ]);

  try {
    await admin.from("audit").insert({
      id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      actorId: auth.profile.id,
      actorName: auth.profile.name || auth.profile.email,
      actorRole: auth.profile.role,
      action: "dispute.export",
      targetType: "client",
      targetId: clientId,
      targetName: client.businessName || client.name || client.email,
      detail: `Exported dispute evidence ZIP (${summary.counts.consent} consent, ${summary.counts.accessEvents} access)`,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("dispute-evidence audit:", e.message);
  }

  const fname = `dispute-evidence-${safeName(client.businessName || client.email)}-${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
  res.setHeader("Content-Length", zip.length);
  return res.status(200).end(zip);
}
