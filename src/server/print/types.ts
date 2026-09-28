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

export interface RenderPrintFileOptions {
  /** Output resolution. Default 300 (`PRINT_DPI`). */
  dpi?: number;
  /**
   * Returns the bytes of the ORIGINAL upload for an asset id (never the
   * preview). Required when the design contains images; the renderer throws a
   * clear error naming the asset if it is missing or fails.
   */
  resolveAsset?: (assetId: string) => Promise<Uint8Array>;
}

export type RenderPrintFile = (
  doc: DesignDocument,
  opts?: RenderPrintFileOptions,
) => Promise<PrintFile>;
