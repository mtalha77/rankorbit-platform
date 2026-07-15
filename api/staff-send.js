import { getAdmin, readJson, requireStaff } from "../server/billing.js";
import { notifyUser, notifySuperAdmins } from "../server/assign.js";
import { randomUUID } from "crypto";

function uid(prefix = "sm") {
  try {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Send a staff DM (super_admin ↔ staff member).
 * Body: { token, staffId?, body }
 * Super admin: pass staffId. Staff: own thread.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getAdmin();
  if (!admin) return res.status(500).json({ error: "Server not configured" });

  const { token, staffId, body } = await readJson(req);
  const text = String(body || "").trim();
  if (!text) return res.status(400).json({ error: "Message is required" });
  if (text.length > 4000) return res.status(400).json({ error: "Message is too long" });

  const auth = await requireStaff(admin, token, {
    roles: ["super_admin", "manager", "agent"],
  });
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const me = auth.profile;
  const isSuper = me.role === "super_admin";
  const targetStaffId = isSuper && staffId ? staffId : me.id;

  if (isSuper && staffId) {
    const { data: staff } = await admin
      .from("profiles")
      .select("id,role")
      .eq("id", targetStaffId)
      .maybeSingle();
    if (!staff || !["manager", "agent", "super_admin"].includes(staff.role)) {
      return res.status(404).json({ error: "Staff member not found" });
    }
  }

  try {
    const msg = {
      id: uid("sm"),
      staffId: targetStaffId,
      senderId: me.id,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    const { error } = await admin.from("staff_messages").insert(msg);
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message || "");
      return res.status(500).json({
        error: missing
          ? "Staff chat table missing. Run supabase/staff-messages.sql in the Supabase SQL editor."
          : error.message,
      });
    }

    const preview = text.length > 140 ? `${text.slice(0, 140)}…` : text;

    if (isSuper) {
      // Admin → staff member
      await notifyUser(admin, {
        userId: targetStaffId,
        type: "staff_message",
        title: `Message from ${me.name || "Admin"}`,
        body: preview,
        meta: { staffId: targetStaffId, from: "admin" },
      });
    } else {
      // Staff → super admins (thread = this staff member)
      await notifySuperAdmins(admin, {
        type: "staff_message",
        title: `Message from ${me.name || me.email || "staff"}`,
        body: preview,
        meta: { staffId: targetStaffId, from: "staff", staffName: me.name || me.email || null },
      });
    }

    return res.status(200).json({ ok: true, message: msg, staffId: targetStaffId });
  } catch (e) {
    console.error("staff-send:", e.message);
    return res.status(500).json({ error: e.message || "Could not send message" });
  }
}
