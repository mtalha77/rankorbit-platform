// ─── HELP FAQs (Help button) ─────────────────────────────────────────────────
import { useState } from "react";
import { T, FONT_D, FONT_B } from "../lib/theme";
import { Modal, Btn } from "../components/atoms";

const FAQS = [
  {
    q: "What is my Visibility Score?",
    a: "It's a 0–100 snapshot of your online health. It blends how many directories you're on, how consistent your business info is (NAP), and how many listings are live. It rises as we get more listings approved and keep your details matching everywhere.",
  },
  {
    q: "Why does Edits Blocked show 0?",
    a: "That number counts unauthorized changes our team caught and reverted, when they choose to share the note with you. If nothing has been shared yet, it stays at 0 — it doesn't mean you're unprotected.",
  },
  {
    q: "What's the difference between Live and Pending listings?",
    a: "Live means the directory listing is published and findable. Pending means we've submitted it (or it's waiting on the directory) and it isn't live yet. Amber \"action needed\" flags are the only times we need something from you.",
  },
  {
    q: "What is NAP Score?",
    a: "NAP means Name, Address, and Phone. Your NAP Score shows how consistently that info matches across directories. Higher consistency helps search engines and AI tools trust your business.",
  },
  {
    q: "How do I manage billing or cancel?",
    a: "Open Plan & Billing to see your plan, next renewal, and invoices. You can update your card or cancel anytime; if you cancel, you keep access until the end of your current period.",
  },
  {
    q: "How do I talk to my account manager?",
    a: "Use Book a Call to pick a 30-minute slot, or Messages to reach the team. We're here for strategy questions or anything unclear in your dashboard.",
  },
  {
    q: "When does Google Business / analytics data update?",
    a: "When your profile is connected, stats sync from Google on a regular cadence. If you see \"manual data,\" your manager is updating those numbers for you until a full sync is available.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.line}` }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 2px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: FONT_B,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{item.q}</span>
        <span style={{ fontSize: 18, color: T.faint, flexShrink: 0, lineHeight: 1 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, padding: "0 2px 14px", maxWidth: 520 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function HelpFaqs({ onClose, goTo }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <Modal open onClose={onClose} title="Help & FAQs" width={560}>
      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, marginBottom: 8 }}>
        Quick answers about your dashboard. Still stuck? Book a call with your manager.
      </div>
      <div style={{ marginBottom: 18 }}>
        {FAQS.map((item, idx) => (
          <FaqItem
            key={item.q}
            item={item}
            open={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 4,
        }}
      >
        <div style={{ fontFamily: FONT_D, fontSize: 13, fontWeight: 700, color: T.faint }}>Need a human?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => goTo("messages")}>
            Messages
          </Btn>
          <Btn size="sm" onClick={() => goTo("call")}>
            Book a Call
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
