/**
 * Public VAPID key for browser subscribe (safe to expose).
 * Avoids relying only on VITE_ bake-at-build — works after env add + redeploy of functions.
 */
import { vapidConfigured, vapidPublicKey } from "../server/push.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!vapidConfigured()) {
    return res.status(200).json({ configured: false, publicKey: null });
  }
  return res.status(200).json({ configured: true, publicKey: vapidPublicKey() });
}
