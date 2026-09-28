import "server-only";
import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { fileLinkUrl } from "@/server/files/links";
import { buildVendorProof } from "@/server/pdf";
import { renderPrintFile } from "@/server/print";
import type { PrepareDeps } from "./prepare-order-files";

/** Real dependencies from env: WooCommerce, R2, the renderer and the proof builder. */
export function productionDeps(
  log: (line: string) => void = console.info,
): PrepareDeps {
  return {
    commerce: getCommerce(),
    storage: getStorage(),
    render: renderPrintFile,
    buildProof: buildVendorProof,
    fileLink: (key, name) => fileLinkUrl(key, name),
    log,
  };
}
