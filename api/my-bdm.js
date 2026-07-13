import { getAdmin, readJson, requireClient } from "../server/billing.js";

/** Returns the client's assigned BDM (name/email) for the Book a Call UI. */
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const body = req.method === "POST" ? await readJson(req) : {};
  // GET: token from Authorization header; POST: token in JSON body.
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token =
    body.token ||
    (header.startsWith("Bearer ") ? header.slice(7) : null);

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const agentId = auth.profile.assignedAgentId;
  if (!agentId) return res.status(200).json({ agent: null });

  const { data: agent, error } = await admin
    .from("profiles")
    .select("id,name,email")
    .eq("id", agentId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    agent: agent ? { id: agent.id, name: agent.name, email: agent.email } : null,
  });
}
