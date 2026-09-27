import type { DesignDocument } from "@/types/design";

/**
 * SHARED CONTRACT — production print file. Owner: lead developer.
 */
export interface PrintFile {
  /** Transparent sRGB PNG at exactly the print area size. */
  png: Uint8Array;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

export type RenderPrintFile = (
  doc: DesignDocument,
  opts?: { dpi?: number },
) => Promise<PrintFile>;
