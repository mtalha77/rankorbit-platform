import {
  getAdmin,
  stripeConfigured,
  PLAN_IDS,
  readJson,
  requireClient,
  nextMonthFirstIso,
} from "../server/billing.js";
import { autoAssignLeastLoadedAgent } from "../server/assign.js";

/** Activate a plan without Stripe — only when Stripe env is not configured. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (stripeConfigured()) {
    return res.status(403).json({ error: "Demo activation disabled while Stripe is configured" });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, planId } = await readJson(req);
  if (!PLAN_IDS.includes(planId)) return res.status(400).json({ error: "Invalid plan" });

  const auth = await requireClient(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { error } = await admin
    .from("profiles")
    .update({
      plan: planId,
      status: "active",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodEnd: nextMonthFirstIso(),
    })
    .eq("id", auth.profile.id);

  if (error) return res.status(500).json({ error: error.message });

  let assignment = null;
  try {
    assignment = await autoAssignLeastLoadedAgent(admin, auth.profile.id);
  } catch (e) {
    console.warn("auto-assign after demo activate:", e.message);
  }

  return res.status(200).json({
    ok: true,
    plan: planId,
    agent: assignment?.agent
      ? { id: assignment.agent.id, name: assignment.agent.name, email: assignment.agent.email }
      : null,
  });
}
