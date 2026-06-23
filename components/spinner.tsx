// Active loading indicators (as opposed to the static "ghost" skeletons in
// components/skeleton.tsx). All three are pure presentational components — no
// hooks — so they render in server or client components alike, and the global
// prefers-reduced-motion rule in globals.css freezes their animation.

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
} as const;

type Size = keyof typeof SIZES;

/**
 * Smooth circular spinner: a faint full ring with a brand-coloured arc riding
 * on top. Inherits its colour from `currentColor` for the arc track, so it
 * adapts inside buttons (white) or on the page (brand green).
 */
export function Spinner({
  size = "md",
  className = "",
  label = "Loading",
}: {
  size?: Size;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <svg
        className={`spinner ${SIZES[size]}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* Faint full track */}
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        {/* Bright leading arc (quarter circle) */}
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * The "loading hamburger": three stacked bars that ripple in a wave. Mirrors
 * the menu glyph in the header, so it reads as a familiar, branded busy state.
 * Sizes scale via font-size since the bars are defined in `em`.
 */
export function HamburgerLoader({
  size = "md",
  className = "",
  label = "Loading",
}: {
  size?: Size;
  className?: string;
  label?: string;
}) {
  const fontSize = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <span
      role="status"
      aria-label={label}
      className={`hamburger-loader ${fontSize} ${className}`}
    >
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * Centered busy state with an optional caption — drop into a panel/section that
 * is fetching after first paint (e.g. a client-side refresh) where a full
 * skeleton would be overkill.
 */
export function LoadingState({
  label = "Loading…",
  variant = "spinner",
  className = "",
}: {
  label?: string;
  variant?: "spinner" | "hamburger";
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-brand-600 ${className}`}
    >
      {variant === "hamburger" ? (
        <HamburgerLoader size="lg" />
      ) : (
        <Spinner size="lg" />
      )}
      {label && <p className="text-sm font-medium text-[#9a9084]">{label}</p>}
    </div>
  );
}
