import type { ProductConfig } from "@/config/products";

/**
 * The row under a wrap-around print area (mug): which part of the canvas ends
 * up by the handle and which faces the front, with a little mug drawing for
 * each so the layout is easy to picture. Purely visual (never in exports).
 */
export function EdgeLabels({
  labels,
  className = "",
}: {
  labels: NonNullable<ProductConfig["edgeLabels"]>;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-3 items-center text-[10px] font-medium tracking-wide text-zinc-500 uppercase ${className}`}
      data-testid="edge-labels"
    >
      <span className="flex items-center gap-1">
        <MugSide handle="left" />
        {labels.left}
      </span>
      <span className="flex items-center justify-center gap-1">
        <MugFront />
        Front
      </span>
      <span className="flex items-center justify-end gap-1">
        {labels.right}
        <MugSide handle="right" />
      </span>
    </div>
  );
}

/** Mug seen from the side, handle pointing to `handle`. */
function MugSide({ handle }: { handle: "left" | "right" }) {
  return (
    <svg
      width={22}
      height={18}
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-zinc-400"
      style={handle === "right" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M8 6.5H5.5A2.5 2.5 0 0 0 3 9v2.5A2.5 2.5 0 0 0 5.5 14H8" />
      <rect x="8" y="3" width="13" height="15" rx="1.5" />
    </svg>
  );
}

/** Mug seen from the front (handle hidden behind): the design faces you. */
function MugFront() {
  return (
    <svg
      width={16}
      height={18}
      viewBox="0 0 16 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden
      className="text-brand-600 shrink-0"
    >
      <rect x="1.5" y="3" width="13" height="15" rx="1.5" />
      <rect
        x="4.5"
        y="7"
        width="7"
        height="7"
        rx="1"
        fill="currentColor"
        fillOpacity={0.25}
        stroke="none"
      />
    </svg>
  );
}
