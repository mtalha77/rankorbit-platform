/**
 * Dashboard page id ↔ URL path helpers.
 * Keep /dashboard and /admin as home entry points (existing redirects stay valid).
 */

const CLIENT_PAGES = new Set([
  "home",
  "notifications",
  "messages",
  "listings",
  "analytics",
  "gmb",
  "billing",
  "call",
  "settings",
  "legal",
  "help",
]);

const ADMIN_PAGES = new Set([
  "overview",
  "notifications",
  "meetings",
  "messages",
  "broadcast",
  "clients",
  "clientDetail",
  "listings",
  "gmb",
  "team",
  "activity",
  "audit",
  "finance",
  "trash",
  "account",
  "settings",
]);

/** /dashboard → home, /dashboard/billing → billing */
export function clientPageFromPath(pathname = "") {
  const parts = String(pathname || "").split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return "home";
  const seg = parts[1] || "home";
  return CLIENT_PAGES.has(seg) ? seg : "home";
}

/** home → /dashboard, billing → /dashboard/billing */
export function clientPathForPage(page) {
  const p = CLIENT_PAGES.has(page) ? page : "home";
  return p === "home" ? "/dashboard" : `/dashboard/${p}`;
}

/**
 * /admin → overview
 * /admin/clients → clients
 * /admin/clients/:id → clientDetail + clientId
 */
export function adminLocationFromPath(pathname = "") {
  const parts = String(pathname || "").split("/").filter(Boolean);
  if (parts[0] !== "admin") return { page: "overview", clientId: null };

  if (parts[1] === "clients" && parts[2]) {
    return { page: "clientDetail", clientId: parts[2] };
  }

  const seg = parts[1] || "overview";
  if (seg === "clients") return { page: "clients", clientId: null };
  if (ADMIN_PAGES.has(seg) && seg !== "clientDetail") {
    return { page: seg, clientId: null };
  }
  return { page: "overview", clientId: null };
}

export function adminPathForPage(page, clientId = null) {
  if (page === "clientDetail" && clientId) return `/admin/clients/${clientId}`;
  if (page === "clients" || page === "clientDetail") return "/admin/clients";
  if (page === "overview" || !ADMIN_PAGES.has(page)) return "/admin";
  if (page === "audit") return "/admin/activity";
  return `/admin/${page}`;
}
