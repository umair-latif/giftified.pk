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

type View = "flat" | "left" | "right";
const VIEW_LABELS: Record<View, string> = {
  flat: "Flat design",
  left: "Left side",
  right: "Right side",
};

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
  const [view, setView] = useState<View>("flat");
  // Mockups belong to the design image they were made from (`of`); a stale
  // set is ignored until the new one arrives.
  const [mockups, setMockups] = useState<{
    of: string;
    left: string;
    right: string;
  } | null>(null);
  const spec = MOCKUP_SPECS[product.id];
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
    if (!spec || !designSrc) return;
    let cancelled = false;
    void import("../mockup/compose")
      .then(async ({ composeMockup }) => {
        const [left, right] = await Promise.all([
          composeMockup(designSrc, product, spec, "left"),
          composeMockup(designSrc, product, spec, "right"),
        ]);
        if (!cancelled) setMockups({ of: designSrc, left, right });
      })
      .catch((err: unknown) => {
        console.error("[preview] mockup failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [designSrc, product, spec]);

  const current = mockups && mockups.of === designSrc ? mockups : null;
  const mockupSrc = view === "flat" || !current ? undefined : current[view];
  const showMockup = !!spec && !!mockupSrc;
  const views: View[] = spec && designSrc ? ["flat", "left", "right"] : [];

  return (
    <div className="flex flex-col gap-3">
      {views.length > 0 && (
        <div
          role="tablist"
          aria-label="Preview view"
          className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-zinc-200"
        >
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`h-9 flex-1 rounded-full text-xs font-medium ${
                view === v ? "bg-brand-600 text-white" : "text-zinc-600"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      )}
      {spec && showMockup && (
        <div
          className="relative w-full overflow-hidden rounded-md shadow-sm ring-1 ring-zinc-300"
          style={{ aspectRatio: `${spec.widthPx} / ${spec.heightPx}` }}
          data-testid="preview-mockup"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img
            src={mockupSrc}
            alt={`Your ${product.name}, ${VIEW_LABELS[view].toLowerCase()}`}
            className="absolute inset-0 size-full"
          />
        </div>
      )}
      <div
        hidden={showMockup}
        className="relative grid w-full place-items-center overflow-hidden rounded-md shadow-sm ring-1 ring-zinc-300"
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
      {product.edgeLabels && (
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
  warn: { label: "May look soft", className: "text-amber-700" },
  block: {
    label: "Too blurry — go back and make it smaller",
    className: "text-red-700",
  },
} as const;
