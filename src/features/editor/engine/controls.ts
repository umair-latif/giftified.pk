import { Control, controlsUtils, Point } from "fabric";
import type { FabricObject } from "fabric";
import "./layer-props";
import { isBackground, lockBackground } from "./background";
import { SNAP_ANGLE_STEP, SNAP_ANGLE_THRESHOLD } from "./snap";

/** An element whose shorter side is below this many screen px gets a move handle. */
export const SMALL_ELEMENT_PX = 84;
const MOVE_HANDLE_PX = 40;
const MOVE_HANDLE_GAP = 30;

/** Shorter on-screen side of an object, in CSS px (mm size x canvas zoom). */
export function screenMinSide(
  obj: Pick<FabricObject, "canvas" | "getScaledWidth" | "getScaledHeight">,
): number {
  const zoom = obj.canvas?.getZoom() ?? 1;
  return Math.min(obj.getScaledWidth(), obj.getScaledHeight()) * zoom;
}

/**
 * A small element is mostly corner handles, so a finger that grabs it resizes
 * it instead of moving it. This extra handle, a pill with a four-arrows icon
 * placed just outside the element (below it; to its right when there is no
 * room below), drags the element without touching a corner. It only exists
 * while the element is small on screen and is never serialised.
 */
const moveControl = new Control({
  x: 0,
  y: 0.5,
  actionName: "drag",
  cursorStyle: "move",
  sizeX: MOVE_HANDLE_PX,
  sizeY: MOVE_HANDLE_PX,
  touchSizeX: 56,
  touchSizeY: 56,
  actionHandler: controlsUtils.dragHandler,
  getVisibility: (obj) => screenMinSide(obj) < SMALL_ELEMENT_PX,
  positionHandler: (dim, finalMatrix, obj) => {
    const centre = new Point(0, 0).transform(finalMatrix);
    const half = new Point(0, (dim.y / 2) * 1).transform(finalMatrix);
    // Unit vector from the centre towards the object's bottom edge.
    const down = new Point(half.x - centre.x, half.y - centre.y);
    const len = Math.hypot(down.x, down.y) || 1;
    const below = new Point(
      half.x + (down.x / len) * MOVE_HANDLE_GAP,
      half.y + (down.y / len) * MOVE_HANDLE_GAP,
    );
    const room = (obj.canvas?.getHeight() ?? Infinity) - below.y;
    if (room >= MOVE_HANDLE_PX / 2) return below;
    const rightEdge = new Point((dim.x / 2) * 1, 0).transform(finalMatrix);
    const right = new Point(rightEdge.x - centre.x, rightEdge.y - centre.y);
    const rlen = Math.hypot(right.x, right.y) || 1;
    return new Point(
      rightEdge.x + (right.x / rlen) * MOVE_HANDLE_GAP,
      rightEdge.y + (right.y / rlen) * MOVE_HANDLE_GAP,
    );
  },
  render: (ctx, left, top) => {
    const r = MOVE_HANDLE_PX / 2;
    ctx.save();
    ctx.translate(left, top);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#4f46e5";
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Four arrows (move).
    const a = 11;
    const h = 4;
    ctx.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      ctx.moveTo(0, 0);
      ctx.lineTo(dx * a, dy * a);
      ctx.moveTo(dx * (a - h) + dy * h, dy * (a - h) + dx * h);
      ctx.lineTo(dx * a, dy * a);
      ctx.lineTo(dx * (a - h) - dy * h, dy * (a - h) - dx * h);
    }
    ctx.stroke();
    ctx.restore();
  },
});

/**
 * Finger-sized handles + rotation snapping. None of this is serialised, so it
 * must be re-applied after loading a draft or an undo/redo restore.
 */
export function applyTouchControls(obj: FabricObject): void {
  // The background colour layer is never touched (lock isn't serialised).
  if (isBackground(obj)) return lockBackground(obj);
  obj.set({
    transparentCorners: false,
    cornerStyle: "circle",
    cornerSize: 14,
    touchCornerSize: 40,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#4f46e5",
    borderColor: "#4f46e5",
    borderScaleFactor: 2,
    // Rotation handle locks to 0/90/180/270° when within 5°.
    snapAngle: SNAP_ANGLE_STEP,
    snapThreshold: SNAP_ANGLE_THRESHOLD,
  });
  // Side handles are too fiddly on a 360px screen; corners + rotate only.
  // Own copy so the shared prototype controls stay untouched.
  obj.controls = { ...obj.controls, move: moveControl };
  obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
}
