import "./CtaFillButton.css";

/**
 * Left-to-right fill hover CTA button.
 * Props: children, onClick, className, style
 */
export default function CtaFillButton({ children, onClick, className = "", style }) {
  return (
    <button
      type="button"
      className={`cta-fill-btn ${className}`.trim()}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
