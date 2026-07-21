// ─── ACCOUNT SETTINGS (name, photo, password, notification email) ────────────
import { useRef, useState, useEffect } from "react";
import { T, FONT_D } from "../lib/theme";
import { api } from "../lib/api";
import { passwordIssues } from "../lib/helpers";
import { Card, Btn, Input, PageHead, SectionTitle } from "./atoms";

export function isAvatarUrl(v) {
  if (!v || typeof v !== "string") return false;
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("data:image/") ||
    v.startsWith("blob:")
  );
}

export function UserAvatar({ user, size = 36, style = {} }) {
  const raw = user?.avatar;
  const url = isAvatarUrl(raw) ? raw : null;
  // Never render a URL/path as the letter — only a short initial
  const letter =
    (!url && raw && String(raw).length <= 2 ? String(raw) : null) ||
    (user?.name || user?.email || "?")[0]?.toUpperCase() ||
    "?";
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: T.surface2,
          ...style,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg,${T.brand},${T.violet})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(11, Math.round(size * 0.36)),
        fontWeight: 800,
        color: "#fff",
        flexShrink: 0,
        ...style,
      }}
    >
      {letter}
    </div>
  );
}

function compressImage(file, maxSide = 512, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Could not process image"));
          else resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image file"));
    };
    img.src = url;
  });
}

/**
 * Shared account settings for client + staff dashboards.
 * @param {{ user: object, toast: function, reload?: function, onUserUpdate?: function, isMobile?: boolean, title?: string, sub?: string }} props
 */
export default function AccountSettings({
  user,
  toast,
  reload,
  onUserUpdate,
  isMobile = false,
  title = "Settings",
  sub = "Update your name, photo, and password",
}) {
  const fileRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [notifyDraft, setNotifyDraft] = useState(user?.notifyEmail || user?.notifyEmailPending || "");
  const [savingNotify, setSavingNotify] = useState(false);
  const [showPw, setShowPw] = useState({ next: false, confirm: false });

  useEffect(() => {
    // Prefer verified address once confirmed; pending only while waiting.
    setNotifyDraft((user?.notifyEmail || user?.notifyEmailPending || "").trim());
  }, [user?.notifyEmail, user?.notifyEmailPending]);

  const displayUser = preview ? { ...user, avatar: preview } : user;
  const verifiedNotify = (user?.notifyEmail || "").trim();
  // Hide pending banner once verified is set (stale pending in memory).
  const pendingNotify = verifiedNotify ? "" : (user?.notifyEmailPending || "").trim();
  const draftNorm = notifyDraft.trim().toLowerCase();
  const alreadyActiveDraft = !!(verifiedNotify && draftNorm === verifiedNotify.toLowerCase());

  const applyLocal = (fields) => {
    if (typeof onUserUpdate === "function") onUserUpdate(fields);
  };

  const saveProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast?.("Name is required", "info");
      return;
    }
    setSavingProfile(true);
    try {
      const fields = { name: trimmed };
      // Keep letter avatar in sync when no photo URL is set
      if (!isAvatarUrl(user?.avatar)) {
        fields.avatar = trimmed[0].toUpperCase();
      }
      await api.patchProfile(user.id, fields);
      applyLocal(fields);
      await reload?.();
      toast?.("Profile updated");
    } catch (e) {
      toast?.(e?.message || "Could not save profile", "info");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      toast?.("Use a JPG, PNG, or WebP image", "info");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast?.("Image must be under 8 MB", "info");
      return;
    }
    setUploading(true);
    let localUrl = null;
    try {
      // Instant preview from the picked file (avoids letter/URL flash)
      localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      const blob = await compressImage(file);
      const r = await api.uploadAvatar(blob, user.id);
      if (r.error) {
        if (localUrl) URL.revokeObjectURL(localUrl);
        setPreview(null);
        toast?.(r.error, "info");
        return;
      }
      applyLocal({ avatar: r.url });
      if (localUrl) URL.revokeObjectURL(localUrl);
      setPreview(r.url);
      await reload?.();
      toast?.("Profile photo updated");
    } catch (err) {
      if (localUrl) URL.revokeObjectURL(localUrl);
      setPreview(null);
      toast?.(err?.message || "Upload failed", "info");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    const letter = (name.trim() || user?.name || user?.email || "?")[0].toUpperCase();
    setUploading(true);
    try {
      await api.patchProfile(user.id, { avatar: letter });
      applyLocal({ avatar: letter });
      setPreview(null);
      await reload?.();
      toast?.("Photo removed");
    } catch (e) {
      toast?.(e?.message || "Could not remove photo", "info");
    } finally {
      setUploading(false);
    }
  };

  const sendNotifyConfirm = async () => {
    const email = notifyDraft.trim().toLowerCase();
    if (!email) {
      toast?.("Enter an email, or clear to use your login email", "info");
      return;
    }
    if (verifiedNotify && email === verifiedNotify.toLowerCase()) {
      toast?.("This notification email is already confirmed and active.", "info");
      return;
    }
    setSavingNotify(true);
    try {
      const r = await api.setNotifyEmail({ email });
      if (r.error) {
        toast?.(r.error, "info");
        return;
      }
      if (r.already) {
        applyLocal({
          notifyEmail: r.notifyEmail || email,
          notifyEmailPending: null,
        });
        setNotifyDraft(r.notifyEmail || email);
        await reload?.();
        toast?.("This notification email is already confirmed and active.");
        return;
      }
      applyLocal({
        notifyEmailPending: r.pending || email,
        notifyEmail: user?.notifyEmail || null,
      });
      await reload?.();
      toast?.(`Confirmation sent to ${r.pending || email}. Then tap Confirm now below.`);
    } finally {
      setSavingNotify(false);
    }
  };

  const confirmNotifyNow = async () => {
    setSavingNotify(true);
    try {
      const r = await api.confirmMyNotifyEmail();
      if (r.error) {
        toast?.(r.error, "info");
        return;
      }
      const email = String(r.notifyEmail || "").trim().toLowerCase();
      setNotifyDraft(email);
      applyLocal({
        notifyEmail: email || null,
        notifyEmailPending: null,
      });
      const fresh = await api.currentUser();
      if (fresh) {
        applyLocal({
          notifyEmail: fresh.notifyEmail || email || null,
          notifyEmailPending: fresh.notifyEmailPending || null,
        });
        if (fresh.notifyEmail) setNotifyDraft(fresh.notifyEmail);
      }
      await reload?.();
      toast?.(`Notification email confirmed: ${email || "saved"}`);
    } finally {
      setSavingNotify(false);
    }
  };

  const clearNotifyEmail = async () => {
    setSavingNotify(true);
    try {
      const r = await api.setNotifyEmail({ clear: true });
      if (r.error) {
        toast?.(r.error, "info");
        return;
      }
      setNotifyDraft("");
      applyLocal({
        notifyEmail: null,
        notifyEmailPending: null,
      });
      await reload?.();
      toast?.("Notification emails will go to your login email again");
    } finally {
      setSavingNotify(false);
    }
  };

  const savePassword = async () => {
    const issues = passwordIssues(pw.next);
    if (issues.length) {
      toast?.("Password needs " + issues.join(", ") + ".", "info");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast?.("Passwords do not match", "info");
      return;
    }
    setSavingPw(true);
    try {
      const r = await api.updatePassword(pw.next);
      if (r.error) {
        toast?.(r.error, "info");
        return;
      }
      setPw({ next: "", confirm: "" });
      toast?.("Password updated");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <PageHead isMobile={isMobile} title={title} sub={sub} />

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle sub="Shown across the app for your teammates and clients">Profile</SectionTitle>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <UserAvatar user={displayUser} size={72} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: FONT_D, fontSize: 18, fontWeight: 800 }}>{name.trim() || user?.name || "Your name"}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Btn size="sm" variant="soft" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Uploading…" : isAvatarUrl(displayUser?.avatar) ? "Change photo" : "Upload photo"}
              </Btn>
              {isAvatarUrl(displayUser?.avatar) && (
                <Btn size="sm" variant="ghost" disabled={uploading} onClick={removePhoto}>
                  Remove
                </Btn>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onPickPhoto} />
            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>JPG, PNG or WebP · max 8 MB</div>
          </div>
        </div>
        <Input label="Full name" value={name} onChange={setName} placeholder="Your name" />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <Btn onClick={saveProfile} disabled={savingProfile || !name.trim()}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle sub="Optional — does not change how you sign in">Notification email</SectionTitle>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.5, marginBottom: 14 }}>
          Login stays on <b style={{ color: T.ink }}>{user?.email || "your account email"}</b>.
          Add another address (e.g. Gmail) to receive app notification emails only there after you confirm the link.
          Leave empty to keep notifications on your login email.
        </div>
        <Input
          label="Notification email"
          value={notifyDraft}
          onChange={setNotifyDraft}
          placeholder="notifications@gmail.com"
          validate="email"
        />
        {verifiedNotify && (
          <div style={{ fontSize: 12, color: T.green, fontWeight: 700, marginBottom: 8 }}>
            Active: {verifiedNotify}
            {alreadyActiveDraft ? " — already confirmed" : ""}
          </div>
        )}
        {pendingNotify && (
          <div style={{ fontSize: 12, color: T.amber, fontWeight: 700, marginBottom: 10, lineHeight: 1.45 }}>
            Pending: {pendingNotify}. Open the email link, or tap <b>Confirm now</b> below (works while signed in).
          </div>
        )}
        {!verifiedNotify && !pendingNotify && (
          <div style={{ fontSize: 12, color: T.faint, marginBottom: 8 }}>
            Currently using login email for notifications.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {(verifiedNotify || pendingNotify) && (
            <Btn variant="ghost" onClick={clearNotifyEmail} disabled={savingNotify}>
              Use login email
            </Btn>
          )}
          {pendingNotify && (
            <Btn variant="green" onClick={confirmNotifyNow} disabled={savingNotify}>
              {savingNotify ? "Confirming…" : "Confirm now"}
            </Btn>
          )}
          {!alreadyActiveDraft && (
            <Btn onClick={sendNotifyConfirm} disabled={savingNotify || !notifyDraft.trim()}>
              {savingNotify ? "Sending…" : "Send confirmation"}
            </Btn>
          )}
          {alreadyActiveDraft && (
            <Btn variant="soft" disabled>
              Already confirmed
            </Btn>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Must be exactly 8 characters with upper, lower, number, and symbol">Password</SectionTitle>
        <PasswordField
          label="New password"
          value={pw.next}
          onChange={(v) => setPw((p) => ({ ...p, next: v }))}
          show={showPw.next}
          onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))}
        />
        <PasswordField
          label="Confirm new password"
          value={pw.confirm}
          onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
          show={showPw.confirm}
          onToggle={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <Btn onClick={savePassword} disabled={savingPw || !pw.next || !pw.confirm}>
            {savingPw ? "Updating…" : "Update password"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function EyeIcon({ open, color = T.sub }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ fontSize: 11.5, color: T.sub, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: ".4px" }}>
          {label.toUpperCase()}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.slice(0, 8))}
          placeholder="••••••••"
          maxLength={8}
          autoComplete="new-password"
          style={{
            width: "100%",
            padding: "11px 44px 11px 15px",
            background: T.surface,
            border: `1.5px solid ${T.line}`,
            borderRadius: 11,
            color: T.ink,
            fontSize: 13.5,
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          title={show ? "Hide password" : "Show password"}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 32,
            height: 32,
            border: "none",
            background: "transparent",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}
