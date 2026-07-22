/** Staff role helpers. BDM = client-facing; Agent = backend ops. */

export const STAFF_ROLES = ["super_admin", "manager", "bdm", "agent"];

export function isBdmRole(role) {
  return role === "bdm";
}

export function isAgentRole(role) {
  return role === "agent";
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function staffRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "manager") return "Manager";
  if (role === "bdm") return "BDM";
  if (role === "agent") return "Agent";
  return role || "Staff";
}
