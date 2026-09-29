import { StaticCanvas } from "fabric";
import { loadFaces } from "../fonts/load-fonts";
import { designFontFaces, migrateDesignFonts } from "../fonts/migrate";
import type { DesignDocument } from "./serialize";
import "./fonts"; // clears Fabric's glyph-width cache when a font arrives

/**
 * Renders a saved design to a PNG data URL at `widthPx` (height follows the
 * print area). Browser-only preview helper; production print files are
 * rendered server-side from the same document.
 *
 * Old font stacks are migrated and the design's fonts are awaited first
 * (up to a timeout — offline still renders, with a fallback font; callers
 * can re-render once `whenFacesLoaded` resolves).
 */
export async function renderDesignToDataUrl(
  doc: DesignDocument,
  widthPx: number,
): Promise<string> {
  const { widthMm, heightMm } = doc.printArea;
  const zoom = widthPx / widthMm;
  const fabric = migrateDesignFonts(doc.fabric);
  await loadFaces(designFontFaces(fabric));
  const el = document.createElement("canvas");
  const canvas = new StaticCanvas(el, {
    width: Math.round(widthPx),
    height: Math.round(heightMm * zoom),
    enableRetinaScaling: false,
    renderOnAddRemove: false,
  });
  try {
    await canvas.loadFromJSON(fabric);
    canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
    canvas.renderAll();
    return canvas.toDataURL({ format: "png", multiplier: 1 });
  } finally {
    await canvas.dispose();
  }
}
