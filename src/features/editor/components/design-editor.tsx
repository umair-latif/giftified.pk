"use client";

import type { ProductConfig } from "@/config/products";
import { AppHeader } from "@/components/ui/app-header";
import { RedoIcon, UndoIcon } from "@/components/ui/icons";
import { StepBar } from "@/components/ui/step-bar";
import {
  useFabricCanvas,
  type SelectionInfo,
} from "../hooks/use-fabric-canvas";
import { EditorStage } from "./editor-stage";
import { EditorToolbar } from "./editor-toolbar";

const fmt = (n: number) => n.toFixed(0);

export function DesignEditor({ product }: { product: ProductConfig }) {
  const ed = useFabricCanvas(product);
  const { widthMm, heightMm } = product.printArea;
  const ready = ed.status === "ready";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-24">
      <AppHeader
        title={product.name}
        backHref="/"
        backLabel="Back to products"
        next={{ label: "Next", href: `/design/${product.id}/preview` }}
        actions={
          <>
            <IconButton
              label="Undo"
              onClick={ed.undo}
              disabled={!ready || !ed.canUndo}
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              label="Redo"
              onClick={ed.redo}
              disabled={!ready || !ed.canRedo}
            >
              <RedoIcon />
            </IconButton>
          </>
        }
      />
      <StepBar current="Design" />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4">
        <p className="text-xs text-zinc-500">
          {product.subtitle} · print area {widthMm} × {heightMm} mm
        </p>
        <EditorStage
          product={product}
          hostRef={ed.hostRef}
          status={ed.status}
          guides={ed.guides}
        />

        <p
          className="min-h-5 text-xs text-zinc-500"
          data-testid="editor-status"
          aria-live="polite"
        >
          {ed.selection
            ? describe(ed.selection)
            : `${ed.layerCount} ${ed.layerCount === 1 ? "layer" : "layers"} · tap Text to start`}
        </p>

        {ed.selection && (
          <div className="flex gap-2">
            <Chip onClick={ed.centre}>Centre</Chip>
            <Chip onClick={ed.straighten} disabled={isStraight(ed.selection)}>
              Straighten
            </Chip>
          </div>
        )}

        <p className="text-[11px] text-zinc-400">
          Drag to move — it snaps to the centre lines · two fingers to resize
          and rotate (snaps level at 0°) · double-tap text to edit
        </p>
      </main>

      <EditorToolbar
        ready={ready}
        hasSelection={ed.selection !== null}
        onAddText={ed.addText}
        onDelete={ed.deleteSelected}
      />
    </div>
  );
}

function describe(s: SelectionInfo): string {
  const angle = Math.round(s.angle) % 360;
  return `${s.kind} · centre ${fmt(s.centerXMm)}, ${fmt(s.centerYMm)} mm · ${fmt(s.widthMm)} × ${fmt(s.heightMm)} mm · ${angle}°`;
}

function isStraight(s: SelectionInfo): boolean {
  return Math.abs(s.angle) < 0.01 || Math.abs(s.angle - 360) < 0.01;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-10 shrink-0 place-items-center rounded-full text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300"
    >
      {children}
    </button>
  );
}

function Chip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 active:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-300"
    >
      {children}
    </button>
  );
}
