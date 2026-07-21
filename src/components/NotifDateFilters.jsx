import { useEffect, useRef, useState } from "react";
import { T, FONT_B } from "../lib/theme";
import { fromDateInputValue } from "../lib/helpers";

function formatRange(from, to) {
  if (from && to && from === to) return fromDateInputValue(from);
  if (from && to) return `${fromDateInputValue(from)} – ${fromDateInputValue(to)}`;
  if (from) return `From ${fromDateInputValue(from)}`;
  if (to) return `Until ${fromDateInputValue(to)}`;
  return "";
}

export function NotifDateFilters({ from, to, onFrom, onTo, onClear }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from || "");
  const [draftTo, setDraftTo] = useState(to || "");
  const wrapRef = useRef(null);
  const active = !!(from || to);

  useEffect(() => {
    if (open) {
      setDraftFrom(from || "");
      setDraftTo(to || "");
    }
  }, [open, from, to]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = () => {
    onFrom(draftFrom);
    onTo(draftTo);
    setOpen(false);
  };

  const clear = () => {
    setDraftFrom("");
    setDraftTo("");
    onClear();
    setOpen(false);
  };

  const label = formatRange(from, to);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 10,
          border: `1.5px solid ${active || open ? T.brand : T.line}`,
          background: active || open ? T.brandSoft : T.surface,
          color: active || open ? T.brand : T.sub,
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: FONT_B,
          cursor: "pointer",
          maxWidth: 220,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label || "Filter"}
        </span>
        {active && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            title="Clear filter"
            style={{
              marginLeft: 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(91,91,214,.15)",
              fontSize: 11,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            width: 260,
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(23,23,50,.14)",
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.sub, letterSpacing: ".4px", marginBottom: 10 }}>
            DATE RANGE
          </div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 5 }}>From</label>
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 10,
              border: `1.5px solid ${T.line}`,
              background: T.surface2 || T.surface,
              color: T.ink,
              fontSize: 13,
              fontFamily: FONT_B,
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 5 }}>To</label>
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 10,
              border: `1.5px solid ${T.line}`,
              background: T.surface2 || T.surface,
              color: T.ink,
              fontSize: 13,
              fontFamily: FONT_B,
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={clear}
              style={{
                padding: "7px 12px",
                borderRadius: 9,
                border: `1px solid ${T.line}`,
                background: T.surface,
                color: T.sub,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT_B,
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              style={{
                padding: "7px 14px",
                borderRadius: 9,
                border: "none",
                background: T.brand,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT_B,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
