import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { T } from "../../lib/theme";
import { api } from "../../lib/api";
import { US_CA_STATES } from "../../lib/constants";
import { Card, Btn, Input, Select, SectionTitle } from "../atoms";

function formFromUser(user) {
  return {
    businessName: user?.businessName || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zip: user?.zip || "",
    category: user?.category || "",
    website: user?.website || "",
    gbpId: user?.gbpId || "",
  };
}

function hasBizFields(user) {
  return !!(user?.businessName || user?.phone || user?.address || user?.city || user?.state || user?.zip);
}

export function ProfileGate({ user, onSaved, toast, isMobile }) {
  const [f, setF] = useState(() => formFromUser(user));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [detailsAccurate, setDetailsAccurate] = useState(false);
  const [loading, setLoading] = useState(() => !hasBizFields(user));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // Always hydrate from DB — context user can mount empty before loadAll finishes.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Instant paint from whatever context already has.
      if (!dirtyRef.current && hasBizFields(user)) {
        setF(formFromUser(user));
        setLoading(false);
      }
      try {
        const prof = await api.getProfile(user.id);
        if (cancelled || dirtyRef.current) return;
        if (prof) {
          setF(formFromUser({ ...user, ...prof }));
        } else if (hasBizFields(user)) {
          setF(formFromUser(user));
        }
      } catch {
        if (!cancelled && !dirtyRef.current && hasBizFields(user)) setF(formFromUser(user));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // When parent user gains signup fields later, fill empty inputs (don't clobber edits).
  useEffect(() => {
    if (dirty || !user?.id) return;
    setF((prev) => {
      const next = formFromUser(user);
      const out = { ...prev };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (!String(prev[k] || "").trim() && String(next[k] || "").trim()) {
          out[k] = next[k];
          changed = true;
        }
      }
      return changed ? out : prev;
    });
  }, [
    dirty,
    user?.id,
    user?.businessName,
    user?.phone,
    user?.address,
    user?.city,
    user?.state,
    user?.zip,
    user?.category,
    user?.website,
    user?.gbpId,
  ]);

  const set = (k, v) => {
    setDirty(true);
    setF((x) => ({ ...x, [k]: v }));
  };
  const cityOk = /^[A-Za-z\s]+$/.test(String(f.city || "").trim());
  const zipDigits = String(f.zip || "").replace(/\D/g, "");
  const zipOk = zipDigits.length >= 5;
  const ok =
    f.businessName &&
    f.phone.replace(/\D/g, "").length >= 10 &&
    f.address &&
    f.city &&
    cityOk &&
    f.state &&
    zipOk &&
    f.category &&
    acceptedTerms &&
    detailsAccurate;
  const save = async () => {
    if (!ok) {
      setTried(true);
      return;
    }
    setSaving(true);
    try {
      await api.patchProfile(user.id, { ...f, zip: zipDigits });
      setDirty(false);
      // Persist ToS acceptance (timestamp + IP) for dispute evidence.
      api.recordConsent({ source: "profile_gate" }).catch(() => {});
      // Fire-and-forget: SA + managers — details filled, payment still pending (once).
      api.notifyProfileComplete().catch(() => {});
      await onSaved();
      toast("Business profile saved");
    } catch (e) {
      toast("Could not save: " + (e.message || "unknown error"), "info");
    }
    setSaving(false);
  };
  const req = (k) => (tried && !f[k] ? `Required` : "");
  return (
    <Card style={{ marginBottom: 20, background: `linear-gradient(135deg,${T.brandSoft},#fff)`, maxWidth: 640 }}>
      <SectionTitle sub="Add the exact details of your business — name, phone, address, and category must match what customers and directories should see. Takes one minute, then choose your plan.">
        First, complete your business profile
      </SectionTitle>
      <div
        style={{
          marginBottom: 14,
          padding: "12px 14px",
          background: T.amberSoft || "#FFF7E8",
          border: `1.5px solid ${T.amber || "#E8A317"}`,
          borderRadius: 12,
          fontSize: 12.5,
          color: T.ink,
          lineHeight: 1.55,
          fontWeight: 600,
        }}
      >
        Please enter the <b>exact details of your business</b>. This information is published to directories and Google — incorrect NAP (name, address, phone) can hurt your listings and local search.
      </div>
      {loading && (
        <div style={{ fontSize: 12.5, color: T.sub, fontWeight: 600, marginBottom: 12 }}>Loading your signup details…</div>
      )}
      <Input
        label="Business Name"
        value={f.businessName}
        onChange={(v) => set("businessName", v)}
        placeholder="Mike's Plumbing"
        error={req("businessName")}
        required
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Input
          label="Phone"
          value={f.phone}
          onChange={(v) => set("phone", v)}
          placeholder="(555) 200-0000"
          validate="usphone"
          error={tried && f.phone.replace(/\D/g, "").length < 10 ? "Valid US/Canada number required" : ""}
          required
        />
        <Input
          label="Category"
          value={f.category}
          onChange={(v) => set("category", v)}
          placeholder="e.g. Plumbing, Dental, Roofing"
          error={req("category")}
          required
        />
      </div>
      <Input
        label="Street Address"
        value={f.address}
        onChange={(v) => set("address", v)}
        placeholder="123 Main St"
        error={req("address")}
        required
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        <Input
          label="City"
          value={f.city}
          onChange={(v) => set("city", v)}
          placeholder="Austin"
          validate="alpha"
          error={
            tried && !f.city
              ? "Required"
              : tried && f.city && !cityOk
                ? "Letters only (no numbers or symbols)"
                : ""
          }
          required
        />
        <Select
          label="State / Province"
          value={f.state}
          onChange={(v) => set("state", v)}
          options={[{ value: "", label: "Select…" }, ...US_CA_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }))]}
        />
        <Input
          label="ZIP Code"
          value={f.zip}
          onChange={(v) => set("zip", v)}
          placeholder="78701"
          validate="digits"
          maxLength={10}
          error={
            tried && !zipDigits
              ? "Required"
              : tried && zipDigits && !zipOk
                ? "Enter at least 5 digits"
                : ""
          }
          required
        />
      </div>
      {tried && !f.state && (
        <div style={{ fontSize: 11, color: T.red, marginTop: -8, marginBottom: 10, fontWeight: 600 }}>
          State / Province is required
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Input
          label="Website (optional)"
          value={f.website}
          onChange={(v) => set("website", v)}
          placeholder="mikesplumbing.com"
        />
        <Input
          label="Google Business Profile link (optional)"
          value={f.gbpId}
          onChange={(v) => set("gbpId", v)}
          placeholder="Paste your GMB link"
        />
      </div>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          margin: "8px 0 10px",
          cursor: "pointer",
          padding: "12px 14px",
          background: T.surface,
          border: `1.5px solid ${tried && !acceptedTerms ? T.red : T.line}`,
          borderRadius: 12,
        }}
      >
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 2, accentColor: T.brand, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, fontWeight: 600 }}>
          I agree to the{" "}
          <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: T.brand, fontWeight: 800 }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T.brand, fontWeight: 800 }}>
            Privacy Policy
          </Link>
          . If I want NAP Orbit to manage my Google Business Profile (GMB Pro), I will grant Manager access on that profile so we can publish posts, update details, and sync performance data on my behalf.
        </span>
      </label>
      {tried && !acceptedTerms && (
        <div style={{ fontSize: 11, color: T.red, marginTop: -4, marginBottom: 10, fontWeight: 600 }}>
          Please accept Terms & Policies to continue.
        </div>
      )}

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          margin: "0 0 14px",
          cursor: "pointer",
          padding: "12px 14px",
          background: T.surface,
          border: `1.5px solid ${tried && !detailsAccurate ? T.red : T.line}`,
          borderRadius: 12,
        }}
      >
        <input
          type="checkbox"
          checked={detailsAccurate}
          onChange={(e) => setDetailsAccurate(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 2, accentColor: T.brand, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, fontWeight: 600 }}>
          I understand that all details I entered above are exact and correct.
        </span>
      </label>
      {tried && !detailsAccurate && (
        <div style={{ fontSize: 11, color: T.red, marginTop: -8, marginBottom: 10, fontWeight: 600 }}>
          Please confirm your details are exact and correct.
        </div>
      )}

      <Btn style={{ marginTop: 6 }} onClick={save} disabled={saving || loading}>
        {saving ? "Saving…" : "Save & continue to plans →"}
      </Btn>
      {tried && !ok && (
        <div style={{ fontSize: 11.5, color: T.red, marginTop: 8, fontWeight: 600 }}>
          Please fill all required fields and check both boxes to continue.
        </div>
      )}
    </Card>
  );
}
