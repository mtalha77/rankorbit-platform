// ─── SHELL (nav + layout) ────────────────────────────────────────────────────
import { useState } from "react";
import { T, FONT_B, SHADOW_LG } from "../lib/theme";
import { useWindowSize } from "../hooks";
import { UserAvatar } from "./AccountSettings";
import { NavIcon, hasNavIcon } from "./navIcons";

function SettingsGearIcon({ color = T.sub, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Shell({
  user,
  nav,
  page,
  setPage,
  onLogout,
  planBadge,
  badgeCounts = {},
  children,
  brandTag,
  showLegalLinks = false,
  headerLeft = null,
  headerRight = null,
  /** Page id for account settings (e.g. "settings" or "account"). When set, gear shows on profile card. */
  settingsPageId = null,
  /** Override main content padding (e.g. tighter legal page). */
  contentPadding = null,
}) {
  const w = useWindowSize();
  const isMobile = w < 820;
  const [open, setOpen] = useState(false);
  const go = (id) => {
    setPage(id);
    setOpen(false);
  };
  const openLegal = () => {
    setPage("legal");
    setOpen(false);
  };
  const settingsActive = settingsPageId && page === settingsPageId;

  const sideStyle = {
    width: isMobile ? 272 : 236,
    background: T.surface,
    borderRight: `1px solid ${T.line}`,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    ...(isMobile
      ? {
          position: "fixed",
          top: 0,
          left: open ? 0 : "-290px",
          height: "100vh",
          zIndex: 200,
          transition: "left .28s cubic-bezier(.22,.8,.36,1)",
          boxShadow: open ? SHADOW_LG : "none",
        }
      : {}),
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, color: T.ink, fontFamily: FONT_B, overflow: "hidden" }}>
      <div style={sideStyle}>
        <div style={{ padding: "20px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <img src="/nap-orbit-logo-shell.png" alt="NAP Orbit" width={120} height={22} style={{ height: 22, width: "auto", display: "block" }} />
                {brandTag && (
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: T.red, letterSpacing: ".6px", marginTop: 3 }}>{brandTag}</div>
                )}
              </div>
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: T.surface2, border: "none", color: T.sub, fontSize: 16, cursor: "pointer", width: 30, height: 30, borderRadius: "50%" }}
              >
                ×
              </button>
            )}
          </div>
          {planBadge}
        </div>
        <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 10 }}>
          {nav.map((item) => {
            const active = page === item.id || (item.match && item.match.includes(page));
            return (
              <div
                key={item.id}
                className="navItem"
                role="button"
                tabIndex={0}
                onClick={() => go(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") go(item.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 14px",
                  margin: "2px 10px",
                  cursor: "pointer",
                  color: active ? T.brand : T.sub,
                  background: active ? T.brandSoft : "transparent",
                  borderRadius: 12,
                  fontWeight: active ? 800 : 600,
                  fontSize: 13.5,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: item.iconSize || 18,
                    height: item.iconSize || 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {typeof item.icon === "string" && hasNavIcon(item.icon) ? (
                    <NavIcon name={item.icon} size={item.iconSize || 18} />
                  ) : typeof item.icon === "string" ? (
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                  ) : (
                    item.icon
                  )}
                </span>
                <span>{item.label}</span>
                {badgeCounts[item.id] > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: T.red,
                      color: "#fff",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 7px",
                    }}
                  >
                    {badgeCounts[item.id]}
                  </span>
                )}
                {item.locked && <span style={{ marginLeft: "auto", fontSize: 11, color: T.faint }}>🔒</span>}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${T.line}` }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              padding: settingsPageId ? "4px 6px 4px 4px" : 0,
              borderRadius: 10,
              background: settingsActive ? T.brandSoft : "transparent",
            }}
          >
            <UserAvatar user={user} size={30} />
            <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.businessName || user.name}
              </div>
              <div style={{ fontSize: 10, color: T.faint, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </div>
            </div>
            {settingsPageId && (
              <button
                type="button"
                title="Settings"
                aria-label="Settings"
                onClick={() => go(settingsPageId)}
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: `1px solid ${settingsActive ? T.brand : T.line}`,
                  background: settingsActive ? "#fff" : T.surface2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <SettingsGearIcon color={settingsActive ? T.brand : T.sub} size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "6px 0",
              background: T.surface2,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              color: T.sub,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT_B,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12 }}>↪</span> Sign Out
          </button>
          {showLegalLinks && (
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 11.5, color: T.faint, lineHeight: 1.5 }}>
              <span onClick={openLegal} style={{ cursor: "pointer", textDecoration: "underline", color: T.sub }}>
                Terms
              </span>
              <span style={{ margin: "0 6px", color: T.line }}>·</span>
              <span onClick={openLegal} style={{ cursor: "pointer", textDecoration: "underline", color: T.sub }}>
                Privacy
              </span>
            </div>
          )}
        </div>
      </div>

      {isMobile && open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23,23,50,.35)", zIndex: 199 }} onClick={() => setOpen(false)} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {isMobile && (
          <div
            style={{
              padding: "13px 16px",
              background: T.surface,
              borderBottom: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{ background: T.surface2, border: "none", color: T.ink, fontSize: 17, cursor: "pointer", width: 36, height: 36, borderRadius: 10 }}
              >
                ☰
              </button>
              <img src="/nap-orbit-logo-shell.png" alt="NAP Orbit" width={110} height={20} style={{ height: 20, width: "auto", display: "block" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {headerRight}
              <button
                type="button"
                onClick={onLogout}
                style={{ background: "none", border: "none", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT_B }}
              >
                Sign Out ↪
              </button>
            </div>
          </div>
        )}
        {!isMobile && (headerLeft || headerRight) && (
          <div
            style={{
              padding: headerLeft ? "18px 34px 0" : contentPadding ? "10px 34px 0" : "16px 34px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>{headerLeft}</div>
            {headerRight && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>{headerRight}</div>
            )}
          </div>
        )}
        {isMobile && headerLeft && (
          <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>{headerLeft}</div>
        )}
        <main style={{ flex: 1, overflow: "auto", padding: contentPadding || (isMobile ? "18px 16px 40px" : "30px 34px 50px") }}>{children}</main>
      </div>
    </div>
  );
}
