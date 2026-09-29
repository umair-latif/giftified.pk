import type { FabricObject } from "fabric";
import { isTextbox } from "./text-style";

/**
 * How Fabric laid out a text object: its wrapped lines and their widths (mm).
 * Used by the editor ↔ print font-parity tests (task 16) on BOTH sides —
 * browser (the editor canvas) and server (the print renderer's canvas).
 */
export interface TextLayout {
  text: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  lines: string[];
  lineWidths: number[];
  width: number;
  height: number;
}

export function textLayouts(objects: FabricObject[]): TextLayout[] {
  const out: TextLayout[] = [];
  const visit = (objs: FabricObject[]) => {
    for (const o of objs) {
      if (isTextbox(o)) {
        out.push({
          text: o.text,
          fontFamily: o.fontFamily,
          fontWeight: String(o.fontWeight),
          fontStyle: String(o.fontStyle),
          lines: [...o.textLines],
          lineWidths: o.textLines.map((_, i) => o.getLineWidth(i)),
          width: o.width,
          height: o.height,
        });
      }
      const children = (o as { getObjects?: () => FabricObject[] }).getObjects;
      if (typeof children === "function") visit(children.call(o));
    }
  };
  visit(objects);
  return out;
}
