import "server-only";
import type { RenderPrintFile } from "./types";

export type * from "./types";

/** Implemented in the print-renderer task (lead). Until then, callers get a clear error. */
export const renderPrintFile: RenderPrintFile = async () => {
  throw new Error(
    "renderPrintFile is not implemented yet (see docs/tasks/07-print-renderer.md)",
  );
};
