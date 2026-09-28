import "server-only";

export type * from "./types";

/**
 * 300 DPI print file renderer (task 07). Pure async function: callers (the
 * render-print-file job) pass the design and a `resolveAsset` that loads the
 * ORIGINAL uploads from storage, then store the PNG themselves.
 */
export { renderPrintFile } from "./render";
