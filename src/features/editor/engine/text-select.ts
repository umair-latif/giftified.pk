import type { Canvas, FabricObject, TPointerEventInfo } from "fabric";
import { isTextbox } from "./text-style";

/** Two taps within this long and this close count as a double tap. */
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 24;

/**
 * Double tap (phone) or double click (computer) on a text: start editing with
 * ALL of its text selected, so typing replaces it and one backspace clears it.
 * Fabric's own behaviour was a caret on phones (no double-tap detection on
 * touch) and one selected word on computers — fiddly when the customer just
 * wants to type their own words over "Your text".
 *
 * Detected on `mouse:up` (Fabric fires it for touch too) and applied a moment
 * later, after Fabric's own dblclick handler has run its word selection.
 */
export function attachDoubleTapSelectAll(canvas: Canvas): () => void {
  let last: { t: number; x: number; y: number; target: FabricObject } | null =
    null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onUp = (opt: TPointerEventInfo) => {
    const target = opt.target;
    if (!target || !isTextbox(target)) {
      last = null;
      return;
    }
    const p = opt.viewportPoint;
    const now = performance.now();
    const isDouble =
      last !== null &&
      last.target === target &&
      now - last.t <= DOUBLE_TAP_MS &&
      Math.hypot(p.x - last.x, p.y - last.y) <= DOUBLE_TAP_PX;
    if (!isDouble) {
      last = { t: now, x: p.x, y: p.y, target };
      return;
    }
    last = null;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!target.canvas) return; // removed meanwhile
      if (!target.isEditing) target.enterEditing();
      target.selectAll();
      // Keep the hidden textarea (keyboard input) in step with the selection.
      target.hiddenTextarea?.setSelectionRange(0, target.text.length);
      canvas.requestRenderAll();
    }, 40);
  };

  const off = canvas.on("mouse:up", onUp);
  return () => {
    off();
    clearTimeout(timer);
  };
}
