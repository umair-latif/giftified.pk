import { EdgeLabels } from "./edge-labels";
import { SamplePhotoTags } from "./sample-photo-tags";
import type { Ref } from "react";
import Image from "next/image";
import type { ProductConfig } from "@/config/products";
import type { GuideState } from "../engine/guides";
import type { SamplePhotoTag } from "../engine";
import type { EditorStatus } from "../hooks/use-fabric-canvas";
import { editorGuideFor } from "../mockup/garment-guide";
import { isDarkHex } from "../colour-utils";

interface Props {
  product: ProductConfig;
  hostRef: Ref<HTMLDivElement>;
  status: EditorStatus;
  guides: GuideState;
  busy?: boolean;
  /** "Sample photo" tags to show (customers only), and what a tap does. */
  sampleTags?: readonly SamplePhotoTag[];
  onPickSample?: (index: number) => void;
  /** Garment colour (a product `baseColors` id). */
  colourId?: string;
}

/**
 * Reserves the print area's exact aspect ratio before Fabric loads (no layout
 * shift) and draws screen-only guides as CSS so they never reach exports:
 * the safe zone, the two centre lines (they light up when something snaps
 * onto them), and lines to other elements' edges while snapped to them.
 */
export function EditorStage({
  product,
  hostRef,
  status,
  guides,
  busy = false,
  sampleTags = [],
  onPickSample,
  colourId,
}: Props) {
  const { widthMm, heightMm, safeMarginMm } = product.printArea;
  const colour =
    product.baseColors.find((c) => c.id === colourId) ?? product.baseColors[0];
  const base = colour?.hex ?? "#ffffff";
  const dark = isDarkHex(base);
  const garment = editorGuideFor(product.id);
  const frame = garment ? garmentFrame(garment) : null;
  const insetX = `${(safeMarginMm / widthMm) * 100}%`;
  const insetY = `${(safeMarginMm / heightMm) * 100}%`;
  const line = (active: boolean) =>
    active
      ? "border-pink-500 border-solid opacity-100"
      : "border-ink/25 border-dashed";

  return (
    // Desktop: fill the column, but never taller than the window (tall print
    // areas such as shirts) — then the stage narrows and stays centred.
    <div
      className="relative w-full lg:mx-auto lg:max-w-[calc((100dvh-13rem)*var(--stage-ar))]"
      style={{
        ["--stage-ar" as string]: String(
          frame ? frame.desktopAspect : widthMm / heightMm,
        ),
      }}
    >
      <div
        className={
          frame
            ? "relative aspect-(--frame-ar) w-full overflow-hidden rounded-xl bg-white lg:aspect-(--frame-ar-lg)"
            : ""
        }
        style={frame?.vars}
      >
        {/* Desktop shows only a window of the photo around the print area
            (`desktopView`), so the canvas is large; phones see the whole photo. */}
        <div
          className={
            frame
              ? "absolute top-(--lt) left-(--ll) h-(--lh) w-(--lw) lg:top-(--dlt) lg:left-(--dll) lg:h-(--dlh) lg:w-(--dlw)"
              : "contents"
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
            className={`${garment ? "absolute" : "relative w-full"} ring-ink/25 overflow-hidden rounded-xl ring-1`}
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
              {/* Lines to other elements' edges/centres or the print area's
                  edge, only while something is snapped to them. */}
              {guides.lines.map((g) => (
                <div
                  key={`${g.axis}${g.at}`}
                  data-testid="guide-line"
                  data-axis={g.axis}
                  className={`absolute ${
                    g.axis === "x"
                      ? "inset-y-0 -translate-x-1/2 border-l"
                      : "inset-x-0 -translate-y-1/2 border-t"
                  } ${line(true)}`}
                  style={
                    g.axis === "x"
                      ? { left: `${(g.at / widthMm) * 100}%` }
                      : { top: `${(g.at / heightMm) * 100}%` }
                  }
                />
              ))}
              <div
                className="absolute rounded-xl border border-dashed border-sky-400/70"
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
            {onPickSample && (
              <SamplePhotoTags
                tags={sampleTags}
                widthMm={widthMm}
                heightMm={heightMm}
                onPick={onPickSample}
              />
            )}
            {busy && (
              <div className="text-ink/70 absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold">
                Adding photo…
              </div>
            )}
            {status === "loading" && (
              <div className="text-ink/60 absolute inset-0 grid place-items-center text-xs">
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
      </div>
      {product.edgeLabels && (
        <EdgeLabels labels={product.edgeLabels} className="mt-1" />
      )}
    </div>
  );
}

/**
 * Frame sizes for a garment photo: phones show the whole photo; desktop shows
 * the guide's `desktopView` window, so the photo layer is scaled up and shifted.
 */
function garmentFrame(g: NonNullable<ReturnType<typeof editorGuideFor>>) {
  const v = g.desktopView;
  const pct = (n: number) => `${n * 100}%`;
  const desktopAspect = (v.width * g.widthPx) / (v.height * g.heightPx);
  return {
    desktopAspect,
    vars: {
      ["--frame-ar" as string]: String(g.widthPx / g.heightPx),
      ["--frame-ar-lg" as string]: String(desktopAspect),
      ["--lw" as string]: "100%",
      ["--lh" as string]: "100%",
      ["--ll" as string]: "0%",
      ["--lt" as string]: "0%",
      ["--dlw" as string]: pct(1 / v.width),
      ["--dlh" as string]: pct(1 / v.height),
      ["--dll" as string]: pct(-v.left / v.width),
      ["--dlt" as string]: pct(-v.top / v.height),
    },
  };
}
