import "./CssIoButton.css";

/**
 * Animated CTA button (Uiverse-style expand icon on hover).
 * Props: children (label), onClick, className, style, variant ("brand" | "light")
 */
export default function CssIoButton({ children = "Get started", onClick, className = "", style, variant = "brand" }) {
  return (
    <button
      type="button"
      className={`cssbuttons-io-button${variant === "light" ? " cssbuttons-io-button--light" : ""} ${className}`.trim()}
      onClick={onClick}
      style={style}
    >
      {children}
      <div className="icon" aria-hidden="true">
        <svg
          height="24"
          width="24"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </div>
    </button>
  );
}
