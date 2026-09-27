import { Point, type Canvas, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { SNAP_DISTANCE_PX, haptic, snapToTarget } from "./snap";

export interface GuideState {
  /** Object centre is locked to the vertical centre line. */
  vertical: boolean;
  /** Object centre is locked to the horizontal centre line. */
  horizontal: boolean;
}

export const NO_GUIDES: GuideState = { vertical: false, horizontal: false };

/**
 * While dragging, snaps the object's centre to the print area's middle lines
 * and reports which guides are active so the UI can highlight them.
 */
export function attachCentreSnapping(
  canvas: Canvas,
  area: PrintArea,
  zoom: () => number,
  onGuides: (g: GuideState) => void,
): () => void {
  let last = NO_GUIDES;
  const emit = (next: GuideState) => {
    if (next.vertical === last.vertical && next.horizontal === last.horizontal)
      return;
    if (
      (next.vertical && !last.vertical) ||
      (next.horizontal && !last.horizontal)
    )
      haptic();
    last = next;
    onGuides(next);
  };

  const onMoving = ({ target }: { target: FabricObject }) => {
    const threshold = SNAP_DISTANCE_PX / zoom();
    const c = target.getCenterPoint();
    const x = snapToTarget(c.x, area.widthMm / 2, threshold);
    const y = snapToTarget(c.y, area.heightMm / 2, threshold);
    if (x.snapped || y.snapped) {
      target.setPositionByOrigin(
        new Point(x.value, y.value),
        "center",
        "center",
      );
      target.setCoords();
    }
    emit({ vertical: x.snapped, horizontal: y.snapped });
  };
  const clear = () => emit(NO_GUIDES);

  const offs = [
    canvas.on("object:moving", onMoving),
    canvas.on("mouse:up", clear),
    canvas.on("selection:cleared", clear),
  ];
  return () => offs.forEach((off) => off());
}
