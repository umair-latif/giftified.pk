import { ActiveSelection, type Canvas, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { isBackground } from "./background";
import {
  AxisSnapper,
  SNAP_DISTANCE_PX,
  SNAP_RELEASE_PX,
  boxLines,
  haptic,
  type Box,
} from "./snap";

/** A guide line to draw while snapped, in scene units (mm). */
export interface GuideLine {
  /** "x": a vertical line at x = at; "y": a horizontal line at y = at. */
  axis: "x" | "y";
  at: number;
}

export interface GuideState {
  /** Snapped to the print area's vertical centre line. */
  vertical: boolean;
  /** Snapped to the print area's horizontal centre line. */
  horizontal: boolean;
  /** Other lines snapped to: another element's edge or centre, or the print area's edge. */
  lines: readonly GuideLine[];
}

export const NO_GUIDES: GuideState = {
  vertical: false,
  horizontal: false,
  lines: [],
};

/** Axis-aligned bounds of an object in scene units (rotation included). */
export function sceneBox(obj: FabricObject): Box {
  const pts = obj.getCoords();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

/** The other design elements a moving object can line up with. */
function others(canvas: Canvas, target: FabricObject): FabricObject[] {
  const moving = new Set<FabricObject>([target]);
  if (target instanceof ActiveSelection)
    target.getObjects().forEach((o) => moving.add(o));
  return canvas
    .getObjects()
    .filter((o) => o.visible && !isBackground(o) && !moving.has(o));
}

const sameGuides = (a: GuideState, b: GuideState) =>
  a.vertical === b.vertical &&
  a.horizontal === b.horizontal &&
  a.lines.length === b.lines.length &&
  a.lines.every(
    (l, i) => l.axis === b.lines[i]?.axis && l.at === b.lines[i]?.at,
  );

/**
 * While dragging, snaps the object's edges or centre to the print area's
 * centre lines and edges and to the edges and centres of the other elements —
 * so two photos can sit exactly side by side without overlapping — and
 * reports the active lines so the UI can draw them. A weak magnet that lets
 * go on any small move away (`AxisSnapper`).
 */
export function attachSnapping(
  canvas: Canvas,
  area: PrintArea,
  zoom: () => number,
  onGuides: (g: GuideState) => void,
): () => void {
  let last = NO_GUIDES;
  let snapX: AxisSnapper | null = null;
  let snapY: AxisSnapper | null = null;

  const emit = (next: GuideState) => {
    if (sameGuides(next, last)) return;
    // A tick on Android when something new locks into place.
    if (next.vertical || next.horizontal || next.lines.length) {
      const was = new Set(last.lines.map((l) => `${l.axis}${l.at}`));
      if (
        (next.vertical && !last.vertical) ||
        (next.horizontal && !last.horizontal) ||
        next.lines.some((l) => !was.has(`${l.axis}${l.at}`))
      )
        haptic();
    }
    last = next;
    onGuides(next);
  };

  const onMoving = ({ target }: { target: FabricObject }) => {
    // Thresholds are screen pixels, converted to mm at the current zoom.
    const z = zoom();
    snapX ??= new AxisSnapper(SNAP_DISTANCE_PX / z, SNAP_RELEASE_PX / z);
    snapY ??= new AxisSnapper(SNAP_DISTANCE_PX / z, SNAP_RELEASE_PX / z);

    // Fabric doesn't refresh the cached corners while dragging: do it, or the
    // box would be one frame behind the finger.
    target.setCoords();
    const box = sceneBox(target);
    const boxes = others(canvas, target).map(sceneBox);
    const xTargets = [0, area.widthMm / 2, area.widthMm];
    const yTargets = [0, area.heightMm / 2, area.heightMm];
    for (const b of boxes) {
      xTargets.push(...boxLines(b, "x"));
      yTargets.push(...boxLines(b, "y"));
    }

    const x = snapX.step(boxLines(box, "x"), xTargets);
    const y = snapY.step(boxLines(box, "y"), yTargets);
    if (x || y) {
      target.set({
        left: (target.left ?? 0) + (x?.delta ?? 0),
        top: (target.top ?? 0) + (y?.delta ?? 0),
      });
      target.setCoords();
    }

    const midX = area.widthMm / 2;
    const midY = area.heightMm / 2;
    const lines: GuideLine[] = [];
    if (x && x.at !== midX) lines.push({ axis: "x", at: x.at });
    if (y && y.at !== midY) lines.push({ axis: "y", at: y.at });
    emit({
      vertical: x?.at === midX,
      horizontal: y?.at === midY,
      lines,
    });
  };

  // Each drag starts fresh.
  const reset = () => {
    snapX = null;
    snapY = null;
    emit(NO_GUIDES);
  };

  const offs = [
    canvas.on("object:moving", onMoving),
    canvas.on("mouse:down", reset),
    canvas.on("mouse:up", reset),
    canvas.on("selection:cleared", reset),
  ];
  return () => offs.forEach((off) => off());
}
