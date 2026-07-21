/** Staff role helpers. `agent` is a legacy alias for `bdm`. */

export const STAFF_ROLES = ["super_admin", "manager", "bdm", "agent"];

export function isBdmRole(role) {
  return role === "bdm" || role === "agent";
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function staffRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "manager") return "Manager";
  if (isBdmRole(role)) return "BDM";
  return role || "Staff";
}
