import { cache, type Canvas, type FabricObject } from "fabric";
import { onFontLoaded } from "../fonts/load-fonts";
import { isTextbox } from "./text-style";

// Fabric caches glyph widths per family; widths measured with a fallback font
// (before our file arrived) must never be reused.
onFontLoaded(() => cache.clearFontCache());

function eachText(objects: FabricObject[], fn: (o: FabricObject) => void) {
  for (const o of objects) {
    if (isTextbox(o)) fn(o);
    const children = (o as { getObjects?: () => FabricObject[] }).getObjects;
    if (typeof children === "function") eachText(children.call(o), fn);
  }
}

/**
 * Re-measures every text object (line breaks, width, height) after a font
 * face finished loading. Not an edit: no undo step, no `object:modified`.
 */
export function relayoutText(canvas: Canvas): void {
  cache.clearFontCache();
  eachText(canvas.getObjects(), (o) => {
    if (!isTextbox(o)) return;
    o.initDimensions();
    o.setCoords();
    o.dirty = true;
  });
  canvas.requestRenderAll();
}
