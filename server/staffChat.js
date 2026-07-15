/**
 * Resolve the DB thread key for staff DMs.
 * Every staff role (super_admin, manager, agent) DMs peers the same way:
 * staffId = min(a,b), peerId = max(a,b) — one shared thread both sides.
 */

export const STAFF_ROLES = ["super_admin", "manager", "agent"];

export function staffPairKey(a, b) {
  return a < b ? { staffId: a, peerId: b } : { staffId: b, peerId: a };
}

/** @deprecated use staffPairKey */
export function saPairKey(a, b) {
  return staffPairKey(a, b);
}

/**
 * @param {{ id: string, role: string }} me
 * @param {{ id: string, role: string } | null} peer
 */
export function resolveStaffThreadKey(me, peer) {
  if (!peer) {
    return { staffId: me.id, peerId: null, peer: null };
  }
  return { ...staffPairKey(me.id, peer.id), peer };
}

/**
 * Resolve the chat peer from a UI staffId.
 * @returns {{ peer: object|null, error?: string, status?: number }}
 */
export async function resolveStaffPeer(admin, me, staffId) {
  if (!staffId || staffId === me.id) {
    return { peer: null, error: "Pick a teammate to message", status: 400 };
  }

  const { data: sp } = await admin
    .from("profiles")
    .select("id,name,email,role")
    .eq("id", staffId)
    .maybeSingle();

  if (!sp || !STAFF_ROLES.includes(sp.role)) {
    return { peer: null, error: "Staff member not found", status: 404 };
  }

  return { peer: sp };
}
