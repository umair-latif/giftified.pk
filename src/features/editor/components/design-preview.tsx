"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductConfig } from "@/config/products";
import { loadDraft } from "../draft";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; src: string; layers: number }
  | { kind: "error" };

/**
 * Flat preview of the autosaved design. The 3D mug/garment preview replaces
 * this image in Milestone 2; the data flow (draft → render) stays the same.
 */
export function DesignPreview({ product }: { product: ProductConfig }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const { widthMm, heightMm } = product.printArea;
  const base = product.baseColors[0]?.hex ?? "#ffffff";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const draft = loadDraft(product.id);
      const layers =
        (draft?.fabric.objects as unknown[] | undefined)?.length ?? 0;
      if (!draft || layers === 0) return { kind: "empty" } as const;
      const { renderDesignToDataUrl } = await import("../engine");
      const width =
        Math.min(window.innerWidth, 448) *
        Math.min(window.devicePixelRatio || 1, 3);
      return {
        kind: "ready",
        src: await renderDesignToDataUrl(draft, width),
        layers,
      } as const;
    };
    run()
      .then((s) => !cancelled && setState(s))
      .catch((err: unknown) => {
        console.error("[preview] render failed", err);
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  return (
    <div className="flex flex-col gap-3">
      <div
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
              className="font-medium text-indigo-600 underline"
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
      </dl>
      <p className="text-[11px] text-zinc-400">
        A 3D preview of your mug arrives next. Ordering with Cash on Delivery
        comes after that.
      </p>
    </div>
  );
}
