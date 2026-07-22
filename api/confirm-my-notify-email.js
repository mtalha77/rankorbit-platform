/**
 * Disabled: notification email must be confirmed via the inbox link only
 * (/api/confirm-notify-email?t=…). In-app bypass was removed.
 * Body: { token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  return res.status(403).json({
    error: "Confirm the link sent to your notification email inbox. In-app confirm is disabled.",
  });
}
