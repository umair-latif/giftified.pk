import type { FabricObject } from "fabric";

/** Finger-sized handles. Sizes are in screen pixels, independent of zoom. */
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
  });
  // Side handles are too fiddly on a 360px screen; corners + rotate only.
  obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
}
