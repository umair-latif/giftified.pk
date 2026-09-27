import type { Canvas, FabricObject, Textbox } from "fabric";

/**
 * Editor API for the text styling sheet. UI code calls these through
 * `useFabricCanvas().applyTextStyle` / `.setText`; never touch Fabric directly.
 */
export interface TextStyle {
  text: string;
  fontFamily: string;
  /** Hex colour. */
  fill: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  /** Outline colour, or null for no outline. */
  stroke: string | null;
  /** Outline thickness in mm (scene units). */
  strokeWidthMm: number;
}

export function isTextbox(obj: FabricObject | undefined): obj is Textbox {
  return (
    !!obj &&
    (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text")
  );
}

export function getTextStyle(obj: FabricObject | undefined): TextStyle | null {
  if (!isTextbox(obj)) return null;
  return {
    text: obj.text,
    fontFamily: obj.fontFamily,
    fill: typeof obj.fill === "string" ? obj.fill : "#000000",
    fontWeight:
      obj.fontWeight === "bold" || Number(obj.fontWeight) >= 600
        ? "bold"
        : "normal",
    fontStyle: obj.fontStyle === "italic" ? "italic" : "normal",
    textAlign:
      obj.textAlign === "left" || obj.textAlign === "right"
        ? obj.textAlign
        : "center",
    stroke:
      typeof obj.stroke === "string" && obj.strokeWidth > 0 ? obj.stroke : null,
    strokeWidthMm: obj.stroke ? obj.strokeWidth : 0,
  };
}

/** Applies a partial style to the selected text and records one undo step. */
export function applyTextStyle(
  canvas: Canvas,
  style: Partial<TextStyle>,
): void {
  const target = canvas.getActiveObject();
  if (!isTextbox(target)) return;
  const { stroke, strokeWidthMm, ...rest } = style;
  target.set(rest);
  if (stroke !== undefined || strokeWidthMm !== undefined) {
    const width = strokeWidthMm ?? target.strokeWidth;
    const colour = stroke === undefined ? target.stroke : stroke;
    target.set({
      stroke: colour && width > 0 ? colour : null,
      strokeWidth: colour ? width : 0,
      paintFirst: "stroke", // outline sits behind the fill, like print shops expect
      strokeLineJoin: "round",
    });
  }
  target.initDimensions();
  target.setCoords();
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target });
}
