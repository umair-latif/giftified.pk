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
export {
  straightenSelected,
  centreSelected,
  deleteSelected,
  duplicateSelected,
} from "./actions";
export { renderDesignToDataUrl } from "./render";
export { relayoutText } from "./fonts";
export { textLayouts, type TextLayout } from "./text-layout";
export {
  addImage,
  applyCrop,
  getCrop,
  isAssetImage,
  objectDpi,
  type ImageAssetMeta,
} from "./image";
export { type NormRect } from "./crop";
export { applyTextStyle, getTextStyle, type TextStyle } from "./text-style";
export {
  toDesignDocument,
  type DesignDocument,
  DESIGN_SCHEMA_VERSION,
} from "./serialize";
