import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyUser } from "../server/assign.js";
import { resolveStaffPeer, resolveStaffThreadKey, STAFF_ROLES } from "../server/staffChat.js";
import { randomUUID } from "crypto";

function uid(prefix = "sm") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Send a staff DM to any other teammate.
 * Body: { token, staffId, body }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId, body } = await readJson(req);
  const text = String(body || "").trim();
  if (!text) return res.status(400).json({ error: "Message is required" });
  if (text.length > 4000) return res.status(400).json({ error: "Message is too long" });

  const auth = await requireStaff(admin, token, { roles: STAFF_ROLES });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const resolved = await resolveStaffPeer(admin, me, staffId);
  if (resolved.error) {
    return res.status(resolved.status || 404).json({ error: resolved.error });
  }
  const peer = resolved.peer;

  const { staffId: threadStaffId, peerId: threadPeerId } = resolveStaffThreadKey(me, peer);

  try {
    const msg = {
      id: uid("sm"),
      staffId: threadStaffId,
      peerId: threadPeerId,
      senderId: me.id,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    const { error } = await admin.from("staff_messages").insert(msg);
    if (error) {
      const missing = /does not exist|schema cache|peerId/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing/outdated. Re-run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const preview = text.length > 140 ? `${text.slice(0, 140)}…` : text;
    await notifyUser(admin, {
      userId: peer.id,
      type: "staff_message",
      title: `Message from ${me.name || me.email || "teammate"}`,
      body: preview,
      meta: {
        staffId: me.id,
        threadStaffId,
        threadPeerId,
        from: "staff",
        staffName: me.name || me.email || null,
      },
    });

    return res.status(200).json({
      ok: true,
      message: msg,
      staffId: peer.id,
      threadStaffId,
      threadPeerId,
    });
  } catch (e) {
    console.error("staff-send:", e.message);
    return res.status(500).json({ error: e.message || "Could not send message" });
  }
}
