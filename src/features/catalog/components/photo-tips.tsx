import type { ProductConfig } from "@/config/products";
import { DEFAULT_DPI_THRESHOLDS } from "@/lib/dpi";
import { mmToPx } from "@/lib/units";

/** Pixels a photo needs to fill the whole print area at the "good" DPI, rounded up to 100. */
export function fullPrintPx(cfg: Pick<ProductConfig, "printArea">): number {
  return (
    Math.ceil(
      mmToPx(cfg.printArea.widthMm, DEFAULT_DPI_THRESHOLDS.warnBelow) / 100,
    ) * 100
  );
}

/**
 * Three photo tips: on the product page and again where the shopper adds a
 * photo in the studio. The pixel width comes from the print config.
 */
export function PhotoTips({
  cfg,
  className = "",
}: {
  cfg: Pick<ProductConfig, "id" | "printArea">;
  className?: string;
}) {
  const px = fullPrintPx(cfg).toLocaleString("en-US");
  return (
    <aside
      aria-label="Photo tips"
      className={`bg-soft border-ink rounded-2xl border-2 p-3 text-sm ${className}`}
      data-testid="photo-tips"
    >
      <p className="type-eyebrow text-deep">Photo tips</p>
      <ul className="text-ink mt-1 list-disc space-y-0.5 pl-5">
        <li>Use the original photo, not a WhatsApp or Instagram copy</li>
        <li>
          {cfg.id === "mug" ? "For a full mug wrap" : "For the full print"},
          about {px} px wide or more
        </li>
        <li>Keep faces and text inside the dashed line</li>
      </ul>
    </aside>
  );
}
