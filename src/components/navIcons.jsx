/** Sidebar nav icons — stroke/fill use currentColor for active tint. */

function Svg({ children, viewBox = "0 0 24 24", size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Analytics (Lucide chart-bar) */
export function IconAnalytics({ size }) {
  return (
    <Svg size={size} viewBox="0 0 24 24">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" {...stroke} />
      <path d="M7 16h8" {...stroke} />
      <path d="M7 11h12" {...stroke} />
      <path d="M7 6h3" {...stroke} />
    </Svg>
  );
}

const BY_NAME = {
  analytics: IconAnalytics,
};

export function hasNavIcon(name) {
  return !!BY_NAME[name];
}

export function NavIcon({ name, size = 18 }) {
  const Comp = BY_NAME[name];
  if (!Comp) return null;
  return <Comp size={size} />;
}
