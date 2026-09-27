/**
 * Fabric-backed editor engine. Import ONLY via dynamic `import()` from client
 * code, so Fabric stays out of the initial page bundle.
 */
export { createDesignCanvas, type DesignCanvas } from "./create-canvas";
export { applyTouchControls } from "./controls";
export { addText, type AddTextOptions } from "./text";
export { attachTwoFingerGestures } from "./gestures";
export { attachHistory, type CanvasHistory } from "./history";
export { attachCentreSnapping, NO_GUIDES, type GuideState } from "./guides";
export { straightenSelected, centreSelected, deleteSelected } from "./actions";
export { renderDesignToDataUrl } from "./render";
export {
  toDesignDocument,
  type DesignDocument,
  DESIGN_SCHEMA_VERSION,
} from "./serialize";
