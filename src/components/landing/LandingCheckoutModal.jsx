import { useState } from "react";
import { Link } from "react-router-dom";
import { T, FONT_B } from "../../lib/theme";
import { api } from "../../lib/api";
import { PLANS, planPrice, formatMoney } from "../../lib/constants";
import { US_CA_STATES } from "../../lib/constants";
import { Modal, Btn, Input, Select } from "../atoms";

const empty = {
  name: "",
  email: "",
  businessName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  category: "",
  website: "",
  gbpId: "",
};

export function LandingCheckoutModal({ planId, cfg = {}, isMobile, onClose }) {
  const [f, setF] = useState(empty);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [detailsAccurate, setDetailsAccurate] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [loginHint, setLoginHint] = useState(false);

  const plan = PLANS[planId];
  const price = planPrice(planId, cfg);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const cityOk = /^[A-Za-z\s]+$/.test(String(f.city || "").trim());
  const zipDigits = String(f.zip || "").replace(/\D/g, "");
  const zipOk = zipDigits.length >= 5;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || "").trim());
  const ok =
    String(f.name || "").trim() &&
    emailOk &&
    f.businessName &&
    String(f.phone || "").replace(/\D/g, "").length >= 10 &&
    f.address &&
    f.city &&
    cityOk &&
    f.state &&
    zipOk &&
    f.category &&
    acceptedTerms &&
    detailsAccurate;

  const submit = async () => {
    if (!ok) {
      setTried(true);
      return;
    }
    setSaving(true);
    setErr("");
    setLoginHint(false);
    try {
      const r = await api.landingCheckout({
        planId,
        ...f,
        zip: zipDigits,
        email: String(f.email).trim().toLowerCase(),
        name: String(f.name).trim(),
        acceptedTerms: true,
      });
      if (r.error) {
        setErr(r.error);
        if (r.accountExists) setLoginHint(true);
        return;
      }
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      setErr("Could not start checkout");
    } catch (e) {
      setErr(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const req = (k) => (tried && !String(f[k] || "").trim() ? "Required" : "");

  return (
    <Modal open onClose={onClose} title={`Subscribe · ${plan?.name || "Plan"}`} width={isMobile ? 420 : 560}>
      <div style={{ fontSize: 13, color: T.sub, marginBottom: 14, lineHeight: 1.5, fontWeight: 600 }}>
        ${formatMoney(price)}/mo — enter your details, then continue to secure Stripe checkout. You will set a password by email after payment.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Input label="Your name" value={f.name} onChange={(v) => set("name", v)} placeholder="Jordan Lee" required error={req("name")} />
        <Input
          label="Email"
          value={f.email}
          onChange={(v) => set("email", v)}
          placeholder="you@business.com"
          validate="email"
          required
          error={tried && !emailOk ? "Valid email required" : ""}
        />
      </div>
      <Input
        label="Business Name"
        value={f.businessName}
        onChange={(v) => set("businessName", v)}
        placeholder="Mike's Plumbing"
        required
        error={req("businessName")}
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Input
          label="Phone"
          value={f.phone}
          onChange={(v) => set("phone", v)}
          placeholder="(555) 200-0000"
          validate="usphone"
          required
          error={tried && String(f.phone || "").replace(/\D/g, "").length < 10 ? "Valid US/Canada number required" : ""}
        />
        <Input
          label="Category"
          value={f.category}
          onChange={(v) => set("category", v)}
          placeholder="e.g. Plumbing"
          required
          error={req("category")}
        />
      </div>
      <Input label="Street Address" value={f.address} onChange={(v) => set("address", v)} placeholder="123 Main St" required error={req("address")} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        <Input
          label="City"
          value={f.city}
          onChange={(v) => set("city", v)}
          placeholder="Austin"
          validate="alpha"
          required
          error={tried && !f.city ? "Required" : tried && f.city && !cityOk ? "Letters only" : ""}
        />
        <Select
          label="State / Province"
          value={f.state}
          onChange={(v) => set("state", v)}
          options={[{ value: "", label: "Select…" }, ...US_CA_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }))]}
        />
        <Input
          label="ZIP"
          value={f.zip}
          onChange={(v) => set("zip", v)}
          placeholder="78701"
          validate="digits"
          maxLength={10}
          required
          error={tried && !zipDigits ? "Required" : tried && zipDigits && !zipOk ? "At least 5 digits" : ""}
        />
      </div>
      {tried && !f.state && (
        <div style={{ fontSize: 11, color: T.red, marginTop: -8, marginBottom: 10, fontWeight: 600 }}>State / Province is required</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Input label="Website (optional)" value={f.website} onChange={(v) => set("website", v)} placeholder="mikesplumbing.com" />
        <Input label="GBP link (optional)" value={f.gbpId} onChange={(v) => set("gbpId", v)} placeholder="Paste GMB link" />
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
          .
        </span>
      </label>
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
          I confirm these business details are exact and correct.
        </span>
      </label>

      {err && (
        <div style={{ fontSize: 12.5, color: T.red, fontWeight: 700, marginBottom: 10, lineHeight: 1.45 }}>
          {err}
          {loginHint && (
            <>
              {" "}
              <Link to={`/login?plan=${encodeURIComponent(planId)}`} style={{ color: T.brand, fontWeight: 800 }}>
                Sign in
              </Link>
            </>
          )}
        </div>
      )}
      {tried && !ok && !err && (
        <div style={{ fontSize: 11.5, color: T.red, marginBottom: 10, fontWeight: 600 }}>
          Please fill all required fields and check both boxes.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={saving} style={{ fontFamily: FONT_B }}>
          {saving ? "Starting checkout…" : "Continue to payment →"}
        </Btn>
      </div>
    </Modal>
  );
}
