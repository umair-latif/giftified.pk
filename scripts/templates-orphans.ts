/**
 * pnpm exec tsx --conditions=react-server scripts/templates-orphans.ts [--delete]
 *
 * Lists designs whose WooCommerce product was deleted, trashed or un-published
 * in WP admin. Customers no longer see them; --delete also removes their files
 * (design, sample photos, product images) and their entry in the template list
 * from storage. Uses WooCommerce + R2 from .env.local. Run without --delete first.
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
  const { getCommerce } = await import("@/lib/commerce");
  const { deleteTemplate, findOrphanedTemplates } =
    await import("@/server/templates");
  const orphans = await findOrphanedTemplates(getCommerce());
  if (orphans.length === 0) {
    console.log(
      "No orphaned designs: every published design still has its product.",
    );
    return;
  }
  const del = process.argv.includes("--delete");
  for (const t of orphans) {
    console.log(
      `• ${t.name} (${t.id}) — product ${t.product?.wooProductId} is gone`,
    );
    if (del) console.log(`  deleted ${await deleteTemplate(t.id)} files`);
  }
  if (!del) console.log("\nRun again with --delete to remove their files.");
}

main().catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
