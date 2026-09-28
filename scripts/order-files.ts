/**
 * pnpm order:files <orderId>
 *
 * Makes the print files for one order right now, without the queue — same code
 * as the background job, using WooCommerce + R2 from .env.local. Lines that
 * already have files are skipped, so it's safe to run again (e.g. after a
 * failed job or when a note says "Run pnpm order:files …").
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const orderId = Number(process.argv[2]);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    console.error("Usage: pnpm order:files <orderId>");
    process.exit(1);
  }
  if (!process.env.WC_URL || !process.env.STORAGE_ENDPOINT) {
    console.error(
      "Set the WC_* and STORAGE_* values in .env.local first (see .env.example).",
    );
    process.exit(1);
  }
  // Imported after the env is loaded: the adapters read it on first use.
  const { productionDeps } = await import("@/server/jobs/deps");
  const { prepareOrderFiles } =
    await import("@/server/jobs/prepare-order-files");
  const result = await prepareOrderFiles(
    orderId,
    productionDeps((l) => console.log("•", l)),
  );
  if (result.status === "skipped") {
    console.log(`Order ${orderId}: ${result.reason}`);
    return;
  }
  for (const r of result.lines)
    console.log(
      r.status === "done"
        ? `✓ line ${r.index + 1}: ${r.printUrl}${r.proofNote ? ` (${r.proofNote})` : ""}`
        : `– line ${r.index + 1}: ${r.reason}`,
    );
  console.log("Links were also added as a note on the order in WP admin.");
}

main().catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
