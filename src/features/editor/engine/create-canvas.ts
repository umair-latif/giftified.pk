import { Canvas, Point, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { clampCenterToArea } from "./constraints";

/**
 * Scene units are MILLIMETRES. The Fabric canvas is exactly the print area:
 * scene (0,0)-(widthMm,heightMm). The viewport transform only scales mm to
 * screen pixels, so the saved JSON is resolution-independent and the server
 * renders print files by rendering the same JSON at PRINT_DPI / 25.4 zoom.
 */
export interface DesignCanvas {
  canvas: Canvas;
  area: PrintArea;
  /** Resize to a new CSS width (height follows the print-area aspect ratio). */
  fit(cssWidth: number): void;
  /** Screen pixels per mm at the current size. */
  zoom(): number;
  dispose(): Promise<void>;
}

export function createDesignCanvas(
  el: HTMLCanvasElement,
  area: PrintArea,
  cssWidth: number,
): DesignCanvas {
  const canvas = new Canvas(el, {
    preserveObjectStacking: true,
    // No rubber-band multi-select on phones; it fights with scrolling.
    selection: false,
    allowTouchScrolling: false,
    enableRetinaScaling: true,
    controlsAboveOverlay: true,
    targetFindTolerance: 6,
    backgroundColor: "",
  });

  const keepInside = ({ target }: { target: FabricObject }) => {
    const c = target.getCenterPoint();
    const clamped = clampCenterToArea(c, area);
    if (clamped.x !== c.x || clamped.y !== c.y) {
      target.setPositionByOrigin(new Point(clamped.x, clamped.y), "center", "center");
      target.setCoords();
    }
  };
  canvas.on("object:moving", keepInside);
  canvas.on("object:scaling", keepInside);
  canvas.on("object:rotating", keepInside);
  canvas.on("object:modified", keepInside);

  let currentZoom = 1;
  const fit = (width: number) => {
    if (!(width > 0)) return;
    currentZoom = width / area.widthMm;
    canvas.setDimensions({
      width: Math.round(width),
      height: Math.round(area.heightMm * currentZoom),
    });
    canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, 0, 0]);
    canvas.getObjects().forEach((o) => o.setCoords());
    canvas.requestRenderAll();
  };
  fit(cssWidth);

  return {
    canvas,
    area,
    fit,
    zoom: () => currentZoom,
    dispose: () => canvas.dispose().then(() => undefined),
  };
}
