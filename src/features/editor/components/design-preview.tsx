"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductConfig } from "@/config/products";
import {
  printQualityReport,
  type PrintQualityReport,
} from "@/lib/print-quality";
import { resolveAssetRefs } from "../assets/resolve";
import { loadDraft } from "../draft";
import { MOCKUP_SPECS } from "../mockup/specs";
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
  onReady,
}: {
  product: ProductConfig;
  /** Preview a saved cart design instead of the product's draft. */
  designKey?: string;
  /** Called once the design has rendered, or with null when there is nothing to order. */
  onReady?: (result: PreviewResult | null) => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<string>();
  const [mockupFailed, setMockupFailed] = useState(false);
  // Mockups belong to the design image they were made from (`of`); a stale
  // set is ignored until the new one arrives.
  const [mockups, setMockups] = useState<{
    of: string;
    byId: Record<string, string>;
  } | null>(null);
  const specs = MOCKUP_SPECS[product.id];
  const { widthMm, heightMm } = product.printArea;
  const base = product.baseColors[0]?.hex ?? "#ffffff";

  useEffect(() => {
    let cancelled = false;
    const draft = loadDraft(product.id, designKey);
    // Fonts the design uses (old stacks migrated) — awaited before rendering;
    // if one is late (slow/offline), render now and again once it arrives.
    const faces = draft
      ? designFontFaces(migrateDesignFonts(draft.fabric))
      : [];
    const run = async () => {
      const layers =
        (draft?.fabric.objects as unknown[] | undefined)?.length ?? 0;
      if (!draft || layers === 0) return { kind: "empty" } as const;
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
  const shown = gallery.find((g) => g.spec.id === selected) ?? gallery[0];
  const showFlat = !useGallery || state.kind !== "ready";
  const first = specs?.[0];

  return (
    <div className="flex flex-col gap-3">
      {useGallery && state.kind === "ready" && first && (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Preview gallery"
          data-testid="preview-gallery"
        >
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200"
            style={{
              aspectRatio: `${(shown?.spec ?? first).widthPx} / ${(shown?.spec ?? first).heightPx}`,
            }}
            data-testid="preview-mockup"
          >
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL
              <img
                src={shown.src}
                alt={`Your ${product.name}, ${shown.spec.label.toLowerCase()} view`}
                className="absolute inset-0 size-full"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-zinc-400">
                Rendering preview…
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Views">
              {gallery.map((g) => (
                <li key={g.spec.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(g.spec.id)}
                    aria-label={g.spec.label}
                    aria-current={g.spec.id === shown?.spec.id}
                    data-testid={`preview-thumb-${g.spec.id}`}
                    className={`focus-visible:ring-brand-600/60 block h-16 overflow-hidden rounded-lg bg-white ring-2 focus-visible:outline-none ${
                      g.spec.id === shown?.spec.id
                        ? "ring-brand-600"
                        : "ring-zinc-200 hover:ring-zinc-300"
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
      <dl className="grid grid-cols-2 gap-y-1 rounded-md bg-white p-3 text-xs ring-1 ring-zinc-200">
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
