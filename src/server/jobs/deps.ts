import "server-only";
import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { fileLinkUrl } from "@/server/files/links";
import { buildVendorProof } from "@/server/pdf";
import { renderPrintFile } from "@/server/print";
import type { PrepareDeps } from "./prepare-order-files";
import { retentionDaysFromEnv, type RetentionDeps } from "./retention";

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

/**
 * Real dependencies for the retention job (task 24). Refuses real storage with
 * the mock store: the mock has no orders, so every old design would look
 * abandoned and be deleted.
 */
export function retentionDeps(
  log: (line: string) => void = console.info,
  env: Record<string, string | undefined> = process.env,
): RetentionDeps {
  if (env.STORAGE_ENDPOINT && !env.WC_URL)
    throw new Error(
      "Retention needs WooCommerce (WC_URL) when real storage (STORAGE_ENDPOINT) is set; refusing to run against the mock store.",
    );
  return {
    commerce: getCommerce(),
    storage: getStorage(),
    now: Date.now,
    retentionDays: retentionDaysFromEnv(env),
    log,
  };
}
