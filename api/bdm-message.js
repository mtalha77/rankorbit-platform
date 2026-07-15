import chatSend from "./chat-send.js";
import { readJson } from "../server/billing.js";

/**
 * Thin wrapper: old one-shot BDM message → chat-send thread API.
 * Accepts { token, message } and maps message → body.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = await readJson(req);
  req.body = {
    token: body.token,
    body: body.message ?? body.body,
    clientId: body.clientId,
  };
  return chatSend(req, res);
}
