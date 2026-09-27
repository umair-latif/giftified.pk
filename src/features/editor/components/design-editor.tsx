"use client";

import type { ProductConfig } from "@/config/products";
import { useFabricCanvas } from "../hooks/use-fabric-canvas";
import { EditorStage } from "./editor-stage";
import { EditorToolbar } from "./editor-toolbar";

const fmt = (n: number) => n.toFixed(0);

export function DesignEditor({ product }: { product: ProductConfig }) {
  const { hostRef, status, layerCount, selection, addText, deleteSelected } =
    useFabricCanvas(product);
  const { widthMm, heightMm } = product.printArea;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold text-zinc-900">{product.name}</h1>
        <p className="text-xs text-zinc-500">
          {product.subtitle} · print area {widthMm} × {heightMm} mm
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4">
        <EditorStage product={product} hostRef={hostRef} status={status} />

        <p className="min-h-5 text-xs text-zinc-500" data-testid="editor-status" aria-live="polite">
          {selection
            ? `${selection.kind} · centre ${fmt(selection.centerXMm)}, ${fmt(selection.centerYMm)} mm · ${fmt(selection.widthMm)} × ${fmt(selection.heightMm)} mm`
            : `${layerCount} ${layerCount === 1 ? "layer" : "layers"} · tap Text to start`}
        </p>
        <p className="text-[11px] text-zinc-400">
          Drag to move · two fingers to resize and rotate · double-tap text to edit
        </p>
      </main>

      <EditorToolbar
        ready={status === "ready"}
        hasSelection={selection !== null}
        onAddText={addText}
        onDelete={deleteSelected}
      />
    </div>
  );
}
