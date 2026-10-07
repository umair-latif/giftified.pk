"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GalleryArrows } from "@/components/ui/image-gallery";
import { useSwipe } from "@/components/ui/use-swipe";
import type { ProductConfig } from "@/config/products";
import {
  printQualityReport,
  type PrintQualityReport,
} from "@/lib/print-quality";
import { resolveAssetRefs } from "../assets/resolve";
import { loadDraft } from "../draft";
import { MOCKUP_SPECS, specsForColour } from "../mockup/specs";
import { loadFaces, whenFacesLoaded } from "../fonts/load-fonts";
import { designFontFaces, migrateDesignFonts } from "../fonts/migrate";

/**
 * The preview is a gallery of photographed mockups: one entry per spec in
 * `MOCKUP_SPECS` (mockup/specs.ts), so more angles or products only need a new
 * spec. The flat design is not part of it — it is on the Design screen.
 */

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; src: string; layers: number; quality: PrintQualityReport }
  | { kind: "error" };

/**
 * Flat preview of the autosaved design. The 3D mug/garment preview replaces
 * this image in Milestone 2; the data flow (draft → render) stays the same.
 */
export interface PreviewResult {
  /** Rendered design (PNG data URL at display size). */
  src: string;
  quality: PrintQualityReport;
}

export function DesignPreview({
  product,
  designKey,
  colourId,
  onReady,
  sideAction,
}: {
  product: ProductConfig;
  /** Garment colour to show (a `baseColors` id); the first colour by default. */
  colourId?: string;
  /** Preview a saved cart design instead of the product's draft. */
  designKey?: string;
  /** Called once the design has rendered, or with null when there is nothing to order. */
  onReady?: (result: PreviewResult | null) => void;
  /** Shown under the details on desktop (the add-to-cart button lives here from lg). */
  sideAction?: React.ReactNode;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<string>();
  const strip = useRef<HTMLDivElement>(null);
  const [mockupFailed, setMockupFailed] = useState(false);
  // Mockups belong to the design image they were made from (`of`); a stale
  // set is ignored until the new one arrives.
  const [mockups, setMockups] = useState<{
    of: string;
    byId: Record<string, string>;
  } | null>(null);
  const colour =
    product.baseColors.find((c) => c.id === colourId) ?? product.baseColors[0];
  // Photos of this colour only (mug photos apply to every colour).
  const specs = useMemo(
    () =>
      MOCKUP_SPECS[product.id]
        ? specsForColour(product.id, colour?.id ?? "white")
        : undefined,
    [product.id, colour?.id],
  );
  const { widthMm, heightMm } = product.printArea;
  const base = colour?.hex ?? "#ffffff";

  useEffect(() => {
    let cancelled = false;
    const draft = loadDraft(product.id, designKey);
    // Fonts the design uses (old stacks migrated) — awaited before rendering;
    // if one is late (slow/offline), render now and again once it arrives.
    const faces = draft
      ? designFontFaces(migrateDesignFonts(draft.fabric))
      : [];
    const run = async () => {
      const objects =
        (draft?.fabric.objects as { role?: unknown }[] | undefined) ?? [];
      if (!draft || objects.length === 0) return { kind: "empty" } as const;
      // A background colour is printed but isn't a layer the customer added.
      const layers = objects.filter((o) => o.role !== "background").length;
      const [{ renderDesignToDataUrl }, fontsReady] = await Promise.all([
        import("../engine"),
        loadFaces(faces),
      ]);
      const width =
        Math.min(window.innerWidth, 448) *
        Math.min(window.devicePixelRatio || 1, 3);
      const { fabric } = await resolveAssetRefs(draft.fabric);
      return {
        kind: "ready",
        src: await renderDesignToDataUrl({ ...draft, fabric }, width),
        layers,
        quality: printQualityReport(draft.fabric),
        fontsReady,
      } as const;
    };
    const show = (s: State) => {
      if (cancelled) return;
      setState(s);
      onReady?.(s.kind === "ready" ? { src: s.src, quality: s.quality } : null);
    };
    run()
      .then((s) => {
        show(s);
        if (s.kind === "ready" && !s.fontsReady) {
          void whenFacesLoaded(faces).then(async (ok) => {
            if (ok && !cancelled) show(await run());
          });
        }
      })
      .catch((err: unknown) => {
        console.error("[preview] render failed", err);
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
    // onReady is a callback prop; re-rendering the preview for it is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, designKey]);

  // Wrap the rendered design around the product photo (lazy, client-only).
  const designSrc = state.kind === "ready" ? state.src : null;
  useEffect(() => {
    if (!specs || !designSrc) return;
    let cancelled = false;
    void import("../mockup/compose")
      .then(async ({ composeMockup }) => {
        const urls = await Promise.all(
          specs.map((s) => composeMockup(designSrc, product, s)),
        );
        if (cancelled) return;
        setMockups({
          of: designSrc,
          byId: Object.fromEntries(specs.map((s, i) => [s.id, urls[i]!])),
        });
      })
      .catch((err: unknown) => {
        console.error("[preview] mockup failed", err);
        if (!cancelled) setMockupFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [designSrc, product, specs]);

  const current = mockups && mockups.of === designSrc ? mockups : null;
  // Mockups are the preview. Without a photo for this product (or if composing
  // failed) the flat render is shown instead, so there is always something.
  const useGallery = !!specs?.length && !mockupFailed && state.kind !== "empty";
  const gallery = current
    ? (specs ?? []).flatMap((s) => {
        const src = current.byId[s.id];
        return src ? [{ spec: s, src }] : [];
      })
    : [];
  // Selected by label, so the same view stays chosen when the colour changes.
  const shown = gallery.find((g) => g.spec.label === selected) ?? gallery[0];
  const shownIndex = shown ? gallery.indexOf(shown) : 0;
  // Same behaviour as the product gallery: a scroll-snap strip (native swipe
  // on touch, drag with a mouse); arrows and thumbnails scroll it, and the
  // scroll position decides which view is current.
  const goTo = (i: number) => {
    const el = strip.current;
    const target = gallery[i];
    if (!el || !target) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setSelected(target.spec.label);
  };
  const step = (d: number) => goTo(shownIndex + d);
  const swipe = useSwipe(
    () => step(-1),
    () => step(1),
    "mouse",
  );
  const showFlat = !useGallery || state.kind !== "ready";
  const first = specs?.[0];

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_20rem] lg:items-start lg:justify-center lg:gap-x-8">
      <div className="flex min-w-0 flex-col gap-3">
        {useGallery && state.kind === "ready" && first && (
          <div
            className="flex flex-col gap-2 lg:w-[38rem] lg:flex-row-reverse lg:items-start lg:gap-3"
            role="group"
            aria-label="Preview gallery"
            data-testid="preview-gallery"
          >
            <div className="relative w-full lg:min-w-0 lg:flex-1">
              <div
                ref={strip}
                {...swipe}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const i = Math.round(
                    el.scrollLeft / Math.max(el.clientWidth, 1),
                  );
                  const at = gallery[i];
                  if (at && at.spec.id !== shown?.spec.id)
                    setSelected(at.spec.label);
                }}
                className={`card flex w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain select-none [&::-webkit-scrollbar]:hidden ${gallery.length > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{
                  aspectRatio: `${first.widthPx} / ${first.heightPx}`,
                }}
                data-testid="preview-mockup"
              >
                {gallery.length > 0 ? (
                  gallery.map((g) => (
                    <div
                      key={g.spec.id}
                      className="relative h-full w-full shrink-0 snap-center"
                      aria-hidden={g !== shown}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                      <img
                        src={g.src}
                        alt={`Your ${product.name}, ${g.spec.label.toLowerCase()} view`}
                        draggable={false}
                        className="absolute inset-0 size-full object-contain"
                      />
                    </div>
                  ))
                ) : (
                  <span className="grid w-full place-items-center text-xs text-zinc-400">
                    Rendering preview…
                  </span>
                )}
              </div>
              <GalleryArrows
                index={shownIndex}
                count={gallery.length}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                testId="preview"
              />
            </div>
            {gallery.length > 1 && (
              <ul
                className="flex gap-2 overflow-x-auto pt-0.5 pr-1 pb-1.5 pl-0.5 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
                aria-label="Views"
              >
                {gallery.map((g) => (
                  <li key={g.spec.id} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => goTo(gallery.indexOf(g))}
                      aria-label={g.spec.label}
                      aria-current={g.spec.id === shown?.spec.id}
                      data-testid={`preview-thumb-${g.spec.id}`}
                      className={`focus-visible:ring-brand-600/60 block h-16 overflow-hidden rounded-xl border-2 bg-white transition duration-150 focus-visible:ring-2 focus-visible:outline-none lg:h-auto lg:w-full ${
                        g.spec.id === shown?.spec.id
                          ? "border-brand-600 ring-brand-600 translate-x-0.5 translate-y-0.5 ring-2"
                          : "border-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-px"
                      }`}
                      style={{
                        aspectRatio: `${g.spec.widthPx} / ${g.spec.heightPx}`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                      <img src={g.src} alt="" className="size-full" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div
          hidden={!showFlat}
          className="relative grid w-full place-items-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-zinc-300"
          style={{
            aspectRatio: `${widthMm} / ${heightMm}`,
            backgroundColor: base,
          }}
          data-testid="preview-frame"
        >
          {state.kind === "ready" && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise
            <img
              src={state.src}
              alt={`Your ${product.name} design`}
              className="absolute inset-0 size-full"
            />
          )}
          {state.kind === "loading" && (
            <span className="text-xs text-zinc-400">Rendering preview…</span>
          )}
          {state.kind === "error" && (
            <span className="p-4 text-center text-xs text-red-600">
              Couldn’t render the preview. Go back and try again.
            </span>
          )}
          {state.kind === "empty" && (
            <span className="p-4 text-center text-xs text-zinc-500">
              Nothing designed yet.{" "}
              <Link
                href={`/design/${product.id}`}
                className="text-brand-600 font-medium underline"
              >
                Go back and add some text
              </Link>
            </span>
          )}
        </div>
        {product.edgeLabels && showFlat && (
          <div className="-mt-2 flex justify-between text-[10px] tracking-wide text-zinc-400 uppercase">
            <span>← {product.edgeLabels.left}</span>
            <span>Front</span>
            <span>{product.edgeLabels.right} →</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 lg:sticky lg:top-24">
        <dl className="card grid grid-cols-2 gap-y-1 p-3 text-xs">
          <dt className="text-zinc-500">Product</dt>
          <dd className="text-right text-zinc-900">{product.subtitle}</dd>
          <dt className="text-zinc-500">Print size</dt>
          <dd className="text-right text-zinc-900">
            {widthMm} × {heightMm} mm · {product.printDpi} DPI
          </dd>
          <dt className="text-zinc-500">Layers</dt>
          <dd className="text-right text-zinc-900" data-testid="preview-layers">
            {state.kind === "ready" ? state.layers : 0}
          </dd>
          {state.kind === "ready" && state.quality.worstDpi !== null && (
            <>
              <dt className="text-zinc-500">Photo quality</dt>
              <dd
                className={`text-right ${QUALITY[state.quality.status].className}`}
                data-testid="preview-quality"
              >
                {QUALITY[state.quality.status].label} ·{" "}
                {Math.round(state.quality.worstDpi)} DPI
              </dd>
            </>
          )}
        </dl>
        {sideAction && <div className="hidden lg:block">{sideAction}</div>}
      </div>
    </div>
  );
}

const QUALITY = {
  ok: { label: "Sharp", className: "text-emerald-700" },
  warn: { label: "May look soft", className: "text-amber-900" },
  block: {
    label: "Too blurry — go back and make it smaller",
    className: "text-red-700",
  },
} as const;
