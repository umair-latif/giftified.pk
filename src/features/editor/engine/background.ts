import { Rect, type FabricObject, type StaticCanvas } from "fabric";
import type { PrintArea } from "@/config/products";
import "./layer-props";

/**
 * Background colour (editor tool "Background colour"). It is an ordinary Fabric rect that
 * covers the whole print area (plus a little bleed) and always sits at the bottom, marked with
 * `role: "background"` (a saved layer prop). Being a real object means it is
 * saved, undone, previewed and printed like any other layer — the print
 * renderer drops canvas `background` fields on purpose (print files are
 * artwork only), so a canvas backgroundColor would never reach the PNG.
 * It is locked: never selectable, never hit by taps.
 *
 * Later backgrounds (gradients, patterns, textures) can reuse the same role
 * with a different fill.
 */
export const BACKGROUND_ROLE = "background";

/**
 * Bleed past each edge (mm). The print area is rarely a whole number of
 * pixels at 300 DPI, so a rect of exactly that size leaves a faint,
 * half-covered last row/column; the canvas clips the extra.
 */
export const BACKGROUND_BLEED_MM = 1;

type WithRole = FabricObject & { role?: string };

export function isBackground(obj: FabricObject): boolean {
  return (obj as WithRole).role === BACKGROUND_ROLE;
}

export function findBackground(canvas: StaticCanvas): FabricObject | null {
  return canvas.getObjects().find(isBackground) ?? null;
}

/** The background fill (`#rrggbb`), or null when there is none. */
export function backgroundColour(canvas: StaticCanvas): string | null {
  const bg = findBackground(canvas);
  return bg && typeof bg.fill === "string" ? bg.fill : null;
}

/** Not saved by Fabric's toObject: re-applied after every load/undo. */
export function lockBackground(obj: FabricObject): void {
  obj.set({
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    hoverCursor: "default",
  });
}

/**
 * Sets (or with `null` removes) the background colour. One canvas event per
 * call (added / modified / removed), so each pick is one undo step.
 */
export function setBackgroundColour(
  canvas: StaticCanvas,
  area: PrintArea,
  colour: string | null,
): void {
  const existing = findBackground(canvas);
  if (colour === null) {
    if (existing) canvas.remove(existing);
  } else if (existing) {
    if (existing.fill === colour) return;
    existing.set({ fill: colour });
    canvas.fire("object:modified", { target: existing });
  } else {
    const rect = new Rect({
      left: -BACKGROUND_BLEED_MM,
      top: -BACKGROUND_BLEED_MM,
      originX: "left",
      originY: "top",
      width: area.widthMm + 2 * BACKGROUND_BLEED_MM,
      height: area.heightMm + 2 * BACKGROUND_BLEED_MM,
      fill: colour,
      strokeWidth: 0,
    });
    (rect as WithRole).role = BACKGROUND_ROLE;
    lockBackground(rect);
    // insertAt fires object:added with the rect already at the bottom.
    canvas.insertAt(0, rect);
  }
  canvas.requestRenderAll();
}
