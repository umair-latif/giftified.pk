"use client";

import { useRef, useState } from "react";
import type { ProductConfig } from "@/config/products";
import { formatCm } from "@/lib/units";
import type { CartItem } from "@/types/cart";
import { AppHeader } from "@/components/ui/app-header";
import { RedoIcon, UndoIcon } from "@/components/ui/icons";
import { StepBar } from "@/components/ui/step-bar";
import {
  useFabricCanvas,
  type CropTarget,
  type SelectionInfo,
} from "../hooks/use-fabric-canvas";
import { SamplePickerSheet } from "@/features/templates/sample-picker-sheet";
import { useTemplateEditor } from "@/features/templates/use-template-editor";
import { CropSheet } from "./crop-sheet";
import { BackgroundSheet } from "./background-sheet";
import { EditorTip } from "./editor-tip";
import { SelectionBar } from "./selection-bar";
import { TextSheet } from "./text-sheet";
import { ACCEPTED_IMAGE_TYPES } from "../assets/prepare-image";
import { EditorStage } from "./editor-stage";
import { ColourPicker, garmentColourLabel } from "./colour-picker";
import { useProductColour } from "../colour";
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
  // A cart line keeps its colour; a new design uses the picked one.
  const [pickedColour, setColourId] = useProductColour(product);
  const colourId = item?.colourId ?? pickedColour;
  const ed = useFabricCanvas(product, item?.designKey, colourId);
  const { widthMm, heightMm } = product.printArea;
  const ready = ed.status === "ready" && !ed.busy;
  const fileInput = useRef<HTMLInputElement>(null);
  // The one file input serves "add photo" and "replace photo".
  const replacing = useRef(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const isDesigner = useTemplateEditor();
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
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
    if (selectionKind !== "image") setSamplesOpen(false);
  }

  return (
    <div
      className={`bg-cream flex min-h-dvh flex-col ${selectionKind ? "pb-48" : "pb-24"} lg:pb-8`}
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
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 lg:grid lg:max-w-[76rem] lg:flex-none lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:px-6 lg:pt-2"
        data-testid="editor-main"
        onPointerDown={(e) => {
          // Tapping empty space (not the canvas or a control) deselects.
          if (e.target === e.currentTarget) ed.deselect();
        }}
      >
        <div className="flex min-w-0 flex-col gap-3 lg:pb-8">
          <p className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">{product.name}</span> ·{" "}
            {product.subtitle} · print area {formatCm(widthMm)} ×{" "}
            {formatCm(heightMm)} cm
          </p>
          <EditorStage
            colourId={colourId}
            product={product}
            hostRef={ed.hostRef}
            status={ed.status}
            guides={ed.guides}
            busy={ed.busy}
          />
          {!item && (
            <ColourPicker
              colours={product.baseColors}
              label={garmentColourLabel(product)}
              value={colourId}
              onChange={setColourId}
            />
          )}
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
              const replace = replacing.current;
              replacing.current = false;
              if (file) void ed.addImage(file, replace);
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
        </div>

        <aside
          aria-label="Editing tools"
          className="contents lg:sticky lg:top-32 lg:mt-7 lg:flex lg:flex-col lg:gap-3"
        >
          <EditorToolbar
            ready={ready}
            onAddText={ed.addText}
            onAddImage={() => {
              replacing.current = false;
              fileInput.current?.click();
            }}
            background={ed.background}
            onBackground={() => {
              ed.deselect();
              setBackgroundOpen(true);
            }}
          />
          {selectionKind && (
            <SelectionBar
              kind={selectionKind}
              text={ed.selection?.text ?? null}
              onTextStyle={ed.applyTextStyle}
              onCrop={() => setCropTarget(ed.getCropTarget())}
              onReplace={() => {
                replacing.current = true;
                fileInput.current?.click();
              }}
              onCentre={ed.centre}
              onStraighten={ed.straighten}
              straight={!!ed.selection && isStraight(ed.selection)}
              onCopy={ed.copySelected}
              onDelete={ed.deleteSelected}
              customerPhoto={
                isDesigner && ed.selection
                  ? {
                      active: !!ed.selection.customerPhoto,
                      onOpen: () => setSamplesOpen(true),
                    }
                  : undefined
              }
              onMore={() => setTextSheetOpen(true)}
            />
          )}
          {ed.placeholders > 0 && (
            <p
              className="bg-mint-100 text-brand-900 rounded-lg px-3 py-2 text-xs"
              data-testid="placeholder-hint"
            >
              This design has {ed.placeholders} sample{" "}
              {ed.placeholders === 1 ? "photo" : "photos"} for your own. Tap it,
              then choose Replace to add yours.
            </p>
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
              <p
                className="text-xs text-amber-900"
                data-testid="quality-warning"
              >
                {ed.quality.status === "block"
                  ? "One photo is too blurry to print at its current size. Tap it and make it smaller."
                  : "One photo may print a little soft. Tap it to see the quality."}
              </p>
            )
          )}

          <EditorTip />
        </aside>
      </main>

      {backgroundOpen && (
        <BackgroundSheet
          value={ed.background}
          onChange={ed.setBackgroundColour}
          onClose={() => setBackgroundOpen(false)}
        />
      )}
      {samplesOpen && ed.selection && (
        <SamplePickerSheet
          current={ed.selection.customerPhoto}
          onPick={(sample) => void ed.applySample(sample)}
          onClear={ed.clearCustomerPhoto}
          onClose={() => setSamplesOpen(false)}
        />
      )}
      {textSheetOpen && ed.selection?.text && (
        <TextSheet
          text={ed.selection.text}
          onTextStyle={ed.applyTextStyle}
          onClose={() => setTextSheetOpen(false)}
        />
      )}
      {cropTarget && (
        <CropSheet
          target={cropTarget}
          onCancel={() => setCropTarget(null)}
          onApply={(rect, shape) => {
            ed.applyCrop(rect, shape);
            setCropTarget(null);
          }}
        />
      )}
    </div>
  );
}

function describe(s: SelectionInfo): string {
  const angle = Math.round(s.angle) % 360;
  return `${s.kind}${s.customerPhoto ? " (customer's photo)" : ""} · centre ${fmt(s.centerXMm)}, ${fmt(s.centerYMm)} mm · ${fmt(s.widthMm)} × ${fmt(s.heightMm)} mm · ${angle}°`;
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
      className="focus-visible:ring-brand-600/20 grid size-11 shrink-0 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent lg:size-12"
    >
      {children}
    </button>
  );
}
