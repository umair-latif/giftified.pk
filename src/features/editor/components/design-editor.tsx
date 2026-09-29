"use client";

import { useRef, useState } from "react";
import type { ProductConfig } from "@/config/products";
import type { CartItem } from "@/types/cart";
import { AppHeader } from "@/components/ui/app-header";
import { RedoIcon, UndoIcon } from "@/components/ui/icons";
import { StepBar } from "@/components/ui/step-bar";
import {
  useFabricCanvas,
  type CropTarget,
  type SelectionInfo,
} from "../hooks/use-fabric-canvas";
import { CropSheet } from "./crop-sheet";
import { SelectionBar } from "./selection-bar";
import { TextSheet } from "./text-sheet";
import { ACCEPTED_IMAGE_TYPES } from "../assets/prepare-image";
import { EditorStage } from "./editor-stage";
import { PrintQualityBadge } from "./print-quality-badge";
import { EditorToolbar } from "./editor-toolbar";

const fmt = (n: number) => n.toFixed(0);

/**
 * @param item when set, edits that cart line's design (changes save to it
 * directly); otherwise the product's draft.
 */
export function DesignEditor({
  product,
  item,
}: {
  product: ProductConfig;
  item?: CartItem;
}) {
  const ed = useFabricCanvas(product, item?.designKey);
  const { widthMm, heightMm } = product.printArea;
  const ready = ed.status === "ready" && !ed.busy;
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const selectionKind = !ed.selection
    ? null
    : ed.selection.text
      ? "text"
      : ed.selection.dpi !== null
        ? "image"
        : "other";
  // Closing the sheet when the selection stops being text (deselect, or a
  // different layer picked) belongs to render, not an effect — it adjusts
  // state in response to a prop-like change rather than syncing an external
  // system. See https://react.dev/learn/you-might-not-need-an-effect
  const [prevSelectionKind, setPrevSelectionKind] = useState(selectionKind);
  if (selectionKind !== prevSelectionKind) {
    setPrevSelectionKind(selectionKind);
    if (selectionKind !== "text") setTextSheetOpen(false);
  }

  return (
    <div
      className={`bg-cream flex min-h-dvh flex-col ${selectionKind ? "pb-36" : "pb-24"}`}
    >
      <AppHeader
        title={item ? "Edit design" : "Design"}
        backHref={item ? "/cart" : `/products/${product.id}`}
        backLabel={item ? "Back to cart" : "Back to product"}
        next={{
          label: "Preview",
          href: `/design/${product.id}/preview${item ? `?item=${encodeURIComponent(item.id)}` : ""}`,
        }}
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

      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4"
        data-testid="editor-main"
        onPointerDown={(e) => {
          // Tapping empty space (not the canvas or a control) deselects.
          if (e.target === e.currentTarget) ed.deselect();
        }}
      >
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{product.name}</span> ·{" "}
          {product.subtitle} · print area {widthMm} × {heightMm} mm
        </p>
        <EditorStage
          product={product}
          hostRef={ed.hostRef}
          status={ed.status}
          guides={ed.guides}
          busy={ed.busy}
        />
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a photo"
          data-testid="image-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow picking the same file again
            if (file) void ed.addImage(file);
          }}
        />

        {ed.notice && (
          <div
            role="alert"
            data-testid="editor-notice"
            className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200"
          >
            <span className="flex-1">{ed.notice}</span>
            <button
              type="button"
              onClick={ed.dismissNotice}
              className="focus-visible:ring-brand-600/20 rounded font-medium underline hover:text-red-900 focus-visible:ring-2 focus-visible:outline-none"
            >
              OK
            </button>
          </div>
        )}

        <p
          className="min-h-5 text-xs text-zinc-500"
          data-testid="editor-status"
          aria-live="polite"
        >
          {ed.selection
            ? describe(ed.selection)
            : `${ed.layerCount} ${ed.layerCount === 1 ? "layer" : "layers"} · add text or a photo`}
        </p>

        {ed.selection?.dpi != null && ed.selection.dpiStatus ? (
          <PrintQualityBadge
            dpi={ed.selection.dpi}
            status={ed.selection.dpiStatus}
          />
        ) : (
          ed.quality.status !== "ok" &&
          ed.quality.worstDpi !== null && (
            <p className="text-xs text-amber-800" data-testid="quality-warning">
              {ed.quality.status === "block"
                ? "One photo is too blurry to print at its current size. Tap it and make it smaller."
                : "One photo may print a little soft. Tap it to see the quality."}
            </p>
          )
        )}

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

      {selectionKind && (
        <SelectionBar
          kind={selectionKind}
          text={ed.selection?.text ?? null}
          onTextStyle={ed.applyTextStyle}
          onCrop={() => setCropTarget(ed.getCropTarget())}
          onCopy={ed.copySelected}
          onDelete={ed.deleteSelected}
          onMore={() => setTextSheetOpen(true)}
        />
      )}
      {textSheetOpen && ed.selection?.text && (
        <TextSheet
          text={ed.selection.text}
          onTextStyle={ed.applyTextStyle}
          onClose={() => setTextSheetOpen(false)}
        />
      )}
      <EditorToolbar
        ready={ready}
        onAddText={ed.addText}
        onAddImage={() => fileInput.current?.click()}
      />
      {cropTarget && (
        <CropSheet
          target={cropTarget}
          onCancel={() => setCropTarget(null)}
          onApply={(rect) => {
            ed.applyCrop(rect);
            setCropTarget(null);
          }}
        />
      )}
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
      className="focus-visible:ring-brand-600/20 grid size-10 shrink-0 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent"
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
      className="focus-visible:ring-brand-600/20 h-8 rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-300 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}
