import type { FabricObject } from "fabric";
import "./layer-props";
import { SNAP_ANGLE_STEP, SNAP_ANGLE_THRESHOLD } from "./snap";

/**
 * Finger-sized handles + rotation snapping. None of this is serialised, so it
 * must be re-applied after loading a draft or an undo/redo restore.
 */
export function applyTouchControls(obj: FabricObject): void {
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
  obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
}
