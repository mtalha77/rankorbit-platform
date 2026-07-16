import { getAdmin, readJson, requireStaff, returnBase } from "../server/billing.js";
import {
  assertCanManageGbp,
  buildGoogleAuthUrl,
  googleConfigured,
  signOAuthState,
} from "../server/googleGbp.js";

/**
 * POST { token, clientId, returnOrigin? }
 * → { url } Google OAuth consent URL
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!googleConfigured()) {
    return res.status(503).json({
      error:
        "Google GBP OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.",
    });
  }

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, clientId, returnOrigin } = await readJson(req);
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const auth = await requireStaff(admin, token);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const gate = await assertCanManageGbp(admin, auth.profile, clientId);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });

  const origin = returnBase(req, returnOrigin);
  const state = signOAuthState({
    staffId: auth.profile.id,
    clientId,
    returnOrigin: origin,
  });
  const url = buildGoogleAuthUrl(state);
  return res.status(200).json({ url });
}
