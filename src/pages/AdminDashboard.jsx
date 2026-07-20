// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { T, FONT_B, SHADOW } from "../lib/theme";
import { api } from "../lib/api";
import { PLANS, livePlanEntries } from "../lib/constants";
import { todayFull, uid } from "../lib/helpers";
import { Confirm } from "../components/atoms";
import Shell from "../components/Shell";
import AccountSettings from "../components/AccountSettings";
import { useWindowSize, useToast } from "../hooks";

// Load only when staff uses View-as — keeps /admin chunk smaller.
const ClientDashboard = lazy(() => import("./ClientDashboard"));
import {
  AdminContext,
  filterVisibleStaffNotifs,
  NotificationsPage,
  StaffMessagesInbox,
  AddListingModal,
  UpdateListingModal,
  ClientFormModal,
  NapConfirmModal,
  LogEditModal,
  SuspendModal,
  AssignModal,
  TeamModal,
  GmbModal,
  AnalyticsModal,
  IntegrationsModal,
  PermissionsModal,
  Overview,
  Clients,
  ClientDetail,
  AllListings,
  GmbAdmin,
  Team,
  Activity,
  Finance,
  AuditTrail,
  Trash,
  Settings,
} from "../components/admin";

export default function AdminDashboard({ user, data, reload, onLogout, onUserUpdate }) {
  const [page, setPage] = useState("overview");
  const [selClient, setSelClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, Toasts] = useToast();
  const w = useWindowSize();
  const isMobile = w < 820;
  const { users, listings, gmb, analytics, activity, settings } = data;
  const allClients = users.filter((u) => u.role === "client");
  const staff = users.filter((u) => u.role !== "client");
  const isAdmin = user.role === "super_admin";
  const isStaffMgr = user.role === "super_admin" || user.role === "manager";
  const isAgent = user.role === "agent";
  const clients = isAgent ? allClients.filter((c) => c.assignedAgentId === user.id) : allClients;
  const labelForClientId = (id) => {
    if (!id) return "Unknown client";
    const pool = [...users, ...(data.trashedUsers || [])];
    const c = pool.find((u) => String(u.id) === String(id));
    if (!c) return "Unknown client";
    return String(c.businessName || c.name || c.email || "Unknown client").trim() || "Unknown client";
  };
  const canImpersonate = isAdmin || (user.role === "manager" && user.canImpersonate);
  const [viewAs, setViewAs] = useState(null);
  const acfg = settings?.config || {};
  const livePlans = livePlanEntries(acfg);
  const revenue = clients.reduce((s, c) => s + (PLANS[c.plan]?.price || 0), 0);
  const flat = Object.values(listings).flat();
  const totalLive = flat.filter((l) => l.status === "live").length;
  const totalPending = flat.filter((l) => l.status === "pending").length;
  const totalFlagged = flat.filter((l) => l.status === "flagged" || l.status === "rejected").length;
  const actionNeeded = flat.filter((l) => l.actionNeeded).length;

  const addActivity = async (clientId, type, desc) => {
    await api.addActivity({ id: uid(), clientId, type, desc, date: todayFull(), by: user.name });
  };
  const audit = async (action, { targetType, targetId, targetName, detail } = {}) => {
    await api.logAudit({ actor: user, action, targetType, targetId, targetName, detail });
  };
  const notifyManagersIfAgent = async (action, listing) => {
    if (user.role !== "agent") return;
    const clientName = clients.find((c) => c.id === listing.clientId)?.businessName || "a client";
    await api.addActivity({ id: uid(), clientId: listing.clientId, type: "edit_blocked_internal", desc: `Manager review: ${user.name} ${action} "${listing.directory}" for ${clientName}`, date: todayFull(), by: "System" });
    api.notifyClient({
      clientId: listing.clientId,
      type: "agent_edit",
      title: `Agent ${action} a listing`,
      body: `${user.name} ${action} "${listing.directory}" for ${clientName}. Review in the admin dashboard.`,
      meta: { directory: listing.directory, action },
    });
    if (typeof window !== "undefined") window.__pendingManagerAlerts = (window.__pendingManagerAlerts || 0) + 1;
  };
  const R = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast(msg);
      await reload();
    } catch (e) {
      console.error(e);
      toast(e.message || "Save failed", "info");
    }
  };

  const [notifBadge, setNotifBadge] = useState(0);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  const [teamView, setTeamView] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const rows = await api.listMyNotifications();
      if (cancelled) return;
      const n = filterVisibleStaffNotifs(rows, user.role).filter((x) => !x.read).length;
      setNotifBadge((prev) => (prev === n ? prev : n));
    };
    pull();
    const t = setInterval(pull, 45000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user.id, user.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gbp = params.get("gbp");
    const clientId = params.get("gbpClient");
    if (!gbp || !clientId) return;
    const msg = params.get("gbpMsg") || "";
    window.history.replaceState({}, "", window.location.pathname + (window.location.hash || ""));
    const c = clients.find((x) => x.id === clientId) || { id: clientId, businessName: "Client" };
    setSelClient(clientId);
    setPage("clientDetail");
    if (gbp === "error") {
      toast(msg || "Google connect failed", "info");
      setModal({ type: "integrations", client: c, pickLocation: false });
    } else if (gbp === "pick") {
      toast("Google connected — pick a location");
      setModal({ type: "integrations", client: c, pickLocation: true });
    }
  }, [clients.length]);

  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (pageRef.current === "messages") return;
      const [cr, sr] = await Promise.all([
        isAdmin ? Promise.resolve({ unreadTotal: 0 }) : api.listChatThreads(),
        api.listStaffThreads(),
      ]);
      if (cancelled) return;
      const cu = cr.error ? 0 : cr.unreadTotal || 0;
      const su = sr.error ? 0 : sr.unreadTotal || 0;
      setChatUnreadTotal(cu + su);
    };
    pull();
    const t = setInterval(pull, 25000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user.id]);

  const nav = [
    { id: "overview", icon: "📊", label: "Overview", roles: ["super_admin", "manager", "agent"] },
    { id: "notifications", icon: "🔔", label: "Notifications", roles: ["super_admin", "manager", "agent"] },
    { id: "messages", icon: "💬", label: "Messages", roles: ["super_admin", "manager", "agent"] },
    { id: "clients", icon: "👥", label: "Clients", roles: ["super_admin", "manager", "agent"], match: ["clientDetail"] },
    { id: "listings", icon: "📋", label: "All Listings", roles: ["super_admin", "manager", "agent"] },
    { id: "gmb", icon: "📍", label: "GMB", roles: ["super_admin", "manager"] },
    { id: "team", icon: "👥", label: "Team", roles: ["super_admin", "manager"] },
    { id: "activity", icon: "📜", label: "Activity Log", roles: ["super_admin", "manager"] },
    { id: "finance", icon: "💰", label: "Finance", roles: ["super_admin"] },
    { id: "audit", icon: "🛡️", label: "Audit Trail", roles: ["super_admin"] },
    { id: "trash", icon: "🗑️", label: "Trash", roles: ["super_admin"] },
    { id: "settings", icon: "🛠️", label: "Control Panel", roles: ["super_admin"] },
  ].filter((n) => n.roles.includes(user.role));

  const roleBadge = (
    <div style={{ marginTop: 14, padding: "9px 13px", background: T.surface2, borderRadius: 12 }}>
      <div style={{ fontSize: 10, color: T.faint, fontWeight: 800, letterSpacing: ".5px" }}>SIGNED IN AS</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.brand, marginTop: 2 }}>
        {user.role === "super_admin" ? "Super Admin" : user.role === "manager" ? "Manager" : "Agent"}
      </div>
    </div>
  );

  const adminCtx = {
    user, data, reload, onLogout, onUserUpdate,
    page, setPage, selClient, setSelClient, modal, setModal, confirm, setConfirm,
    toast, isMobile, users, listings, gmb, analytics, activity, settings,
    allClients, staff, isAdmin, isStaffMgr, isAgent, clients, labelForClientId,
    canImpersonate, viewAs, setViewAs, acfg, livePlans, revenue, flat,
    totalLive, totalPending, totalFlagged, actionNeeded,
    addActivity, audit, notifyManagersIfAgent, R,
    notifBadge, setNotifBadge, chatUnreadTotal, setChatUnreadTotal,
    teamView, setTeamView,
  };

  if (viewAs) {
    const c = allClients.find((x) => x.id === viewAs);
    if (!c) {
      setViewAs(null);
      return null;
    }
    return (
      <>
        <div style={{ position: "sticky", top: 0, zIndex: 1000, background: `linear-gradient(90deg,${T.amber},#E8890B)`, color: "#fff", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, boxShadow: SHADOW }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>👁️ Viewing {c.businessName || c.name}'s account (read-only). Changes are disabled.</div>
          <button onClick={() => setViewAs(null)} style={{ background: "rgba(255,255,255,.25)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 8, fontWeight: 800, cursor: "pointer", fontFamily: FONT_B, fontSize: 12.5 }}>Exit view</button>
        </div>
        <div>
          <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: T.sub, fontFamily: FONT_B }}>Loading client view…</div>}>
            <ClientDashboard user={c} data={data} reload={reload} onLogout={() => setViewAs(null)} impersonating />
          </Suspense>
        </div>
      </>
    );
  }

  return (
    <AdminContext.Provider value={adminCtx}>
      <Shell user={user} nav={nav} page={page} setPage={setPage} onLogout={onLogout} planBadge={roleBadge} brandTag="ADMIN" badgeCounts={{ notifications: notifBadge, messages: chatUnreadTotal }} settingsPageId="account">
        {page === "overview" && <Overview />}
        {page === "notifications" && (
          <NotificationsPage user={user} isAdmin={isAdmin} isMobile={isMobile} toast={toast} setNotifBadge={setNotifBadge} setSelClient={setSelClient} setPage={setPage} />
        )}
        {page === "messages" && (
          <StaffMessagesInbox user={user} clients={clients} selClient={selClient} setSelClient={setSelClient} setChatUnreadTotal={setChatUnreadTotal} toast={toast} isMobile={isMobile} isAdmin={isAdmin} />
        )}
        {page === "clients" && <Clients />}
        {page === "clientDetail" && <ClientDetail />}
        {page === "listings" && <AllListings />}
        {page === "gmb" && <GmbAdmin />}
        {page === "team" && <Team />}
        {page === "activity" && <Activity />}
        {page === "finance" && <Finance />}
        {page === "audit" && <AuditTrail />}
        {page === "trash" && <Trash />}
        {page === "account" && (
          <AccountSettings user={user} toast={toast} reload={reload} onUserUpdate={onUserUpdate} isMobile={isMobile} title="My Account" sub="Update your name, photo, and password" />
        )}
        {page === "settings" && <Settings />}
      </Shell>
      {modal?.type === "clientForm" && <ClientFormModal client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "team" && <TeamModal onClose={() => setModal(null)} />}
      {modal?.type === "permissions" && <PermissionsModal member={modal.member} onClose={() => setModal(null)} />}
      {modal?.type === "assign" && <AssignModal agent={modal.agent} onClose={() => setModal(null)} />}
      {modal?.type === "suspend" && <SuspendModal client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "napConfirm" && <NapConfirmModal client={modal.client} newScore={modal.newScore} onClose={() => setModal(null)} />}
      {modal?.type === "logEdit" && <LogEditModal client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "addListing" && <AddListingModal clientId={modal.clientId} onClose={() => setModal(null)} />}
      {modal?.type === "updateListing" && <UpdateListingModal listing={modal.listing} clientId={modal.clientId} onClose={() => setModal(null)} />}
      {modal?.type === "gmb" && <GmbModal client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "analytics" && <AnalyticsModal client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === "integrations" && <IntegrationsModal client={modal.client} pickLocation={!!modal.pickLocation} onClose={() => setModal(null)} />}
      <Confirm data={confirm} onClose={() => setConfirm(null)} />
      <Toasts />
    </AdminContext.Provider>
  );
}
