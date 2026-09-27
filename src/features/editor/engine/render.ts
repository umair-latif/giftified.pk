import { StaticCanvas } from "fabric";
import type { DesignDocument } from "./serialize";

/**
 * Renders a saved design to a PNG data URL at `widthPx` (height follows the
 * print area). Browser-only preview helper; production print files are
 * rendered server-side from the same document.
 */
export async function renderDesignToDataUrl(
  doc: DesignDocument,
  widthPx: number,
): Promise<string> {
  const { widthMm, heightMm } = doc.printArea;
  const zoom = widthPx / widthMm;
  const el = document.createElement("canvas");
  const canvas = new StaticCanvas(el, {
    width: Math.round(widthPx),
    height: Math.round(heightMm * zoom),
    enableRetinaScaling: false,
    renderOnAddRemove: false,
  });
  try {
    await canvas.loadFromJSON(doc.fabric);
    canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
    canvas.renderAll();
    return canvas.toDataURL({ format: "png", multiplier: 1 });
  } finally {
    await canvas.dispose();
  }
}
