/**
 * Fabric-backed editor engine. Import ONLY via dynamic `import()` from client
 * code, so Fabric stays out of the initial page bundle.
 */
export { createDesignCanvas, type DesignCanvas } from "./create-canvas";
export { applyTouchControls } from "./controls";
export { addText, type AddTextOptions } from "./text";
export { attachTwoFingerGestures } from "./gestures";
export { toDesignDocument, type DesignDocument, DESIGN_SCHEMA_VERSION } from "./serialize";
