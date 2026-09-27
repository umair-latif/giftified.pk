import { Point, type Canvas, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { clampCenterToArea } from "./constraints";
import { applyTouchControls } from "./controls";

function commit(canvas: Canvas, target: FabricObject) {
  target.setCoords();
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target });
}

/** Rotate the selected object back to 0°, keeping its centre where it is. */
export function straightenSelected(canvas: Canvas): void {
  const target = canvas.getActiveObject();
  if (!target || target.angle === 0) return;
  const c = target.getCenterPoint();
  target.rotate(0);
  target.setPositionByOrigin(c, "center", "center");
  commit(canvas, target);
}

/** Move the selected object to the horizontal middle of the print area. */
export function centreSelected(
  canvas: Canvas,
  area: PrintArea,
  axis: "x" | "y" | "both" = "x",
): void {
  const target = canvas.getActiveObject();
  if (!target) return;
  const c = target.getCenterPoint();
  const x = axis === "y" ? c.x : area.widthMm / 2;
  const y = axis === "x" ? c.y : area.heightMm / 2;
  target.setPositionByOrigin(new Point(x, y), "center", "center");
  commit(canvas, target);
}

export function deleteSelected(canvas: Canvas): void {
  const active = canvas.getActiveObject();
  if (!active) return;
  canvas.remove(active);
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

/** Duplicate the selected object 5 mm down-right and select the copy. */
export async function duplicateSelected(
  canvas: Canvas,
  area: PrintArea,
): Promise<void> {
  const source = canvas.getActiveObject();
  if (!source) return;
  const copy = await source.clone();
  const c = source.getCenterPoint();
  const at = clampCenterToArea({ x: c.x + 5, y: c.y + 5 }, area);
  copy.setPositionByOrigin(new Point(at.x, at.y), "center", "center");
  applyTouchControls(copy);
  canvas.add(copy);
  canvas.setActiveObject(copy);
  copy.setCoords();
  canvas.requestRenderAll();
}
