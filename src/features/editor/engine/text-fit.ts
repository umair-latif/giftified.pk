import type { Canvas, FabricObject, Textbox } from "fabric";
import { isTextbox } from "./text-style";

/**
 * Auto-width text: a new text box is exactly as wide as its text and grows as
 * you type, wrapping only at the print-area edge (or where you press Enter).
 * The `autoWidth` flag is saved with the object, so text made before this
 * existed — and every template's fixed-width text — keeps its saved width.
 */
type AutoWidth = { autoWidth?: boolean };

export const isAutoWidth = (obj: FabricObject | undefined): boolean =>
  !!obj && (obj as AutoWidth).autoWidth === true;

/** A little air beside the widest line, so a hair's difference in font metrics (editor vs print) never wraps a word. */
const PAD_EM = 0.04;
const MIN_EM = 0.6;

/** Width of the print area in mm (the canvas is exactly the print area). */
export const printAreaWidthMm = (canvas: Canvas): number =>
  canvas.getWidth() / (canvas.getZoom() || 1);

/**
 * Sets the box width to the widest line of its text, at most `maxWidthMm`
 * (scene millimetres, i.e. after any scaling).
 */
export function fitTextWidth(tb: Textbox, maxWidthMm: number): void {
  const maxLocal = maxWidthMm / (tb.scaleX || 1);
  // Lay the text out as wide as allowed, then shrink to its widest line.
  tb.set({ width: maxLocal });
  tb.initDimensions();
  let widest = 0;
  for (let i = 0; i < tb.textLines.length; i++)
    widest = Math.max(widest, tb.getLineWidth(i));
  const fit = Math.max(tb.fontSize * MIN_EM, widest + tb.fontSize * PAD_EM);
  tb.set({ width: Math.min(maxLocal, fit) });
  tb.initDimensions();
  tb.setCoords();
  tb.dirty = true;
}

/**
 * The horizontal anchor Fabric keeps fixed while typing (its
 * `updateFromTextArea`): the text alignment, or the reading start for
 * justified text.
 */
function typingAnchorX(tb: Textbox): "left" | "center" | "right" {
  if (tb.textAlign === "justify")
    return tb.direction === "rtl" ? "right" : "left";
  const a = tb.textAlign.replace("justify-", "");
  return a === "center" || a === "right" ? a : "left";
}

/**
 * Keeps auto-width text hugging what is typed (Fabric fires `text:changed` on
 * every keystroke).
 *
 * Fabric lays the new text out at the box's OLD width first, so a box that
 * hugs its text briefly wraps onto an extra line, and Fabric pins the box's
 * top edge while it grows. Re-fitting the width then drops the extra line
 * again; without re-pinning the same top edge the box would slide down by
 * half a line on every keystroke (off the canvas within a few letters).
 */
export function attachTextAutoWidth(canvas: Canvas): () => void {
  return canvas.on("text:changed", ({ target }) => {
    if (!isTextbox(target) || !isAutoWidth(target)) return;
    const anchorX = typingAnchorX(target);
    const anchor = target.getPositionByOrigin(anchorX, "top");
    fitTextWidth(target, printAreaWidthMm(canvas));
    target.setPositionByOrigin(anchor, anchorX, "top");
    target.setCoords();
    // Keep the hidden textarea (and so the phone keyboard's caret) on the text.
    const editing = target as Textbox & { updateTextareaPosition?: () => void };
    if (editing.hiddenTextarea) editing.updateTextareaPosition?.();
    canvas.requestRenderAll();
  });
}
