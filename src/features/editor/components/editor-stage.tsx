import type { Ref } from "react";
import type { ProductConfig } from "@/config/products";
import type { EditorStatus } from "../hooks/use-fabric-canvas";

interface Props {
  product: ProductConfig;
  hostRef: Ref<HTMLDivElement>;
  status: EditorStatus;
}

/**
 * Reserves the print area's exact aspect ratio before Fabric loads (no layout
 * shift) and draws screen-only guides as CSS so they never reach exports.
 */
export function EditorStage({ product, hostRef, status }: Props) {
  const { widthMm, heightMm, safeMarginMm } = product.printArea;
  const base = product.baseColors[0]?.hex ?? "#ffffff";
  const insetX = `${(safeMarginMm / widthMm) * 100}%`;
  const insetY = `${(safeMarginMm / heightMm) * 100}%`;

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-md shadow-sm ring-1 ring-zinc-300"
        style={{ aspectRatio: `${widthMm} / ${heightMm}`, backgroundColor: base }}
      >
        <div ref={hostRef} className="absolute inset-0 touch-none" data-testid="canvas-host" />
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-sm border border-dashed border-sky-400/70"
          style={{ left: insetX, right: insetX, top: insetY, bottom: insetY }}
        />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-xs text-zinc-400">
            Loading editor…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-red-600">
            The editor couldn’t load. Check your connection and refresh.
          </div>
        )}
      </div>
      {product.edgeLabels && (
        <div className="mt-1 flex justify-between text-[10px] tracking-wide text-zinc-400 uppercase">
          <span>← {product.edgeLabels.left}</span>
          <span>Front</span>
          <span>{product.edgeLabels.right} →</span>
        </div>
      )}
    </div>
  );
}
