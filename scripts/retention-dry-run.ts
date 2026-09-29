/**
 * pnpm retention:dry-run
 *
 * Shows what tonight's retention job (task 24) WOULD delete, using WooCommerce
 * + R2 from .env.local. Read-only: it only lists orders and files, it never
 * deletes anything or writes to an order.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.WC_URL || !process.env.STORAGE_ENDPOINT) {
    console.error(
      "Set the WC_* and STORAGE_* values in .env.local first (see .env.example).",
    );
    process.exit(1);
  }
  // Imported after the env is loaded: the adapters read it on first use.
  const { retentionDeps } = await import("@/server/jobs/deps");
  const { planRetention } = await import("@/server/jobs/retention");
  const { designFolder, orderFolder } = await import("@/lib/storage/keys");
  const deps = retentionDeps((l) => console.log("•", l));
  const plan = await planRetention(deps);

  async function countFiles(prefix: string) {
    let files = 0;
    let bytes = 0;
    let cursor: string | undefined;
    do {
      const page = await deps.storage.list(prefix, cursor ? { cursor } : {});
      files += page.objects.length;
      bytes += page.objects.reduce((s, o) => s + o.size, 0);
      cursor = page.cursor;
    } while (cursor);
    return `${files} file(s), ${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  console.log(
    `Retention ${plan.retentionDays} days — cut-off ${plan.cutoff} (orders closed before it are due)`,
  );
  console.log(
    `Scanned ${plan.counts.ordersScanned} order(s): ${plan.counts.notClosed} not completed/cancelled, ${plan.counts.notDueYet} closed recently, ${plan.counts.alreadyDone} already purged; ${plan.counts.designsScanned} design folder(s) in storage.`,
  );

  console.log(`\nOrders that would be purged: ${plan.orders.length}`);
  for (const o of plan.orders) {
    console.log(
      `  #${o.orderId} ${o.status} ${o.closedAt.slice(0, 10)} (${o.guest ? "guest" : "account"})`,
    );
    console.log(
      `    ${orderFolder(o.orderId)}  ${await countFiles(orderFolder(o.orderId))}`,
    );
    for (const d of o.designIds)
      console.log(
        `    ${designFolder(d)}  ${await countFiles(designFolder(d))}`,
      );
  }

  console.log(
    `\nAbandoned designs (on no order) that would be deleted: ${plan.abandonedDesigns.length}`,
  );
  for (const d of plan.abandonedDesigns)
    console.log(`  ${designFolder(d)}  ${await countFiles(designFolder(d))}`);

  if (plan.skipped.length) {
    console.log(`\nKept on purpose: ${plan.skipped.length}`);
    for (const s of plan.skipped)
      console.log(
        `  ${s.orderId ? `#${s.orderId} ` : ""}${s.designId ? `${s.designId} ` : ""}— ${s.reason}`,
      );
  }
  if (plan.deferred.orders || plan.deferred.designs)
    console.log(
      `\nLeft for the next night (per-run limit): ${plan.deferred.orders} order(s), ${plan.deferred.designs} design(s).`,
    );
  console.log("\nDry run: nothing was deleted.");
}

main().catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
