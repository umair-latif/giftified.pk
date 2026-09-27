import { Textbox, type Canvas } from "fabric";
import type { PrintArea } from "@/config/products";
import { applyTouchControls } from "./controls";

export interface AddTextOptions {
  text?: string;
  fill?: string;
  /** Font family. Must also be registered in the server print renderer. */
  fontFamily?: string;
}

export function addText(canvas: Canvas, area: PrintArea, opts: AddTextOptions = {}): Textbox {
  const box = new Textbox(opts.text ?? "Your text", {
    left: area.widthMm / 2,
    top: area.heightMm / 2,
    originX: "center",
    originY: "center",
    width: area.widthMm * 0.6,
    fontSize: area.heightMm * 0.2,
    fontFamily: opts.fontFamily ?? "Arial, Helvetica, sans-serif",
    fontWeight: "bold",
    fill: opts.fill ?? "#111827",
    textAlign: "center",
  });
  applyTouchControls(box);
  // Textbox only reflows on width change; keep proportional scaling.
  box.setControlsVisibility({ mr: false, ml: false });
  canvas.add(box);
  canvas.setActiveObject(box);
  canvas.requestRenderAll();
  return box;
}
