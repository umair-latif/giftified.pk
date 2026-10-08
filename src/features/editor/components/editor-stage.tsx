import { EdgeLabels } from "./edge-labels";
import type { Ref } from "react";
import Image from "next/image";
import type { ProductConfig } from "@/config/products";
import type { GuideState } from "../engine/guides";
import type { EditorStatus } from "../hooks/use-fabric-canvas";
import { TSHIRT_EDITOR_GUIDE } from "../mockup/garment-guide";
import { isDarkHex } from "../colour-utils";

interface Props {
  product: ProductConfig;
  hostRef: Ref<HTMLDivElement>;
  status: EditorStatus;
  guides: GuideState;
  busy?: boolean;
  /** Garment colour (a product `baseColors` id). */
  colourId?: string;
}

/**
 * Reserves the print area's exact aspect ratio before Fabric loads (no layout
 * shift) and draws screen-only guides as CSS so they never reach exports:
 * the safe zone, and the two centre lines, which light up when an object's
 * centre snaps onto them.
 */
export function EditorStage({
  product,
  hostRef,
  status,
  guides,
  busy = false,
  colourId,
}: Props) {
  const { widthMm, heightMm, safeMarginMm } = product.printArea;
  const colour =
    product.baseColors.find((c) => c.id === colourId) ?? product.baseColors[0];
  const base = colour?.hex ?? "#ffffff";
  const dark = isDarkHex(base);
  const garment = product.id === "tshirt" ? TSHIRT_EDITOR_GUIDE : null;
  const insetX = `${(safeMarginMm / widthMm) * 100}%`;
  const insetY = `${(safeMarginMm / heightMm) * 100}%`;
  const line = (active: boolean) =>
    active
      ? "border-pink-500 border-solid opacity-100"
      : "border-zinc-400/60 border-dashed";

  return (
    // Desktop: fill the column, but never taller than the window (tall print
    // areas such as shirts) — then the stage narrows and stays centred.
    <div
      className="relative w-full lg:mx-auto lg:max-w-[calc((100dvh-13rem)*var(--stage-ar))]"
      style={{
        ["--stage-ar" as string]: String(
          garment ? garment.widthPx / garment.heightPx : widthMm / heightMm,
        ),
      }}
    >
      <div
        className={
          garment ? "relative w-full overflow-hidden rounded-xl bg-white" : ""
        }
        style={
          garment
            ? { aspectRatio: `${garment.widthPx} / ${garment.heightPx}` }
            : undefined
        }
      >
        {garment && (
          <Image
            src={(colourId && garment.srcByColour[colourId]) || garment.src}
            width={garment.widthPx}
            height={garment.heightPx}
            alt=""
            aria-hidden
            draggable={false}
            unoptimized
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            data-testid="garment-guide"
          />
        )}
        <div
          className={`${garment ? "absolute" : "relative w-full"} overflow-hidden rounded-md shadow-sm ring-1 ring-zinc-300`}
          style={{
            aspectRatio: `${widthMm} / ${heightMm}`,
            backgroundColor: garment
              ? dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.35)"
              : base,
            ...(garment
              ? {
                  left: garment.printLeft,
                  top: garment.printTop,
                  width: garment.printWidth,
                }
              : {}),
          }}
        >
          {/* Guides sit under the Fabric canvas so handles stay on top. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              data-testid="guide-vertical"
              data-active={guides.vertical}
              className={`absolute inset-y-0 left-1/2 -translate-x-1/2 border-l ${line(guides.vertical)}`}
            />
            <div
              data-testid="guide-horizontal"
              data-active={guides.horizontal}
              className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-t ${line(guides.horizontal)}`}
            />
            <div
              className="absolute rounded-sm border border-dashed border-sky-400/70"
              style={{
                left: insetX,
                right: insetX,
                top: insetY,
                bottom: insetY,
              }}
            />
          </div>
          <div
            ref={hostRef}
            className="absolute inset-0 touch-none"
            data-testid="canvas-host"
          />
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-medium text-zinc-600">
              Adding photo…
            </div>
          )}
          {status === "loading" && (
            <div className="absolute inset-0 grid place-items-center text-xs text-zinc-400">
              Loading editor…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 grid place-items-center bg-white/90 p-4 text-center text-xs text-red-600">
              The editor couldn’t load. Check your connection and refresh.
            </div>
          )}
        </div>
      </div>
      {product.edgeLabels && (
        <EdgeLabels labels={product.edgeLabels} className="mt-1" />
      )}
    </div>
  );
}
