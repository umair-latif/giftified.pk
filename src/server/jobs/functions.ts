import "server-only";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { inngest } from "./client";
import { productionDeps, retentionDeps } from "./deps";
import { ORDER_FILES_EVENT } from "./events";
import {
  addFilesNote,
  orderNeedsFiles,
  prepareLineOrNote,
  type LineResult,
} from "./prepare-order-files";
import {
  planRetention,
  purgeDesigns,
  purgeOrder,
  summarise,
  type OrderPurgeResult,
} from "./retention";

const dataSchema = z.object({ orderId: z.number().int().positive() });

/**
 * order/files.requested → 300 DPI print PNG (+ vendor PDF once task 03 lands)
 * per order line, stored privately in R2, linked on the order in WP admin.
 *
 * Each line is its own step, so a retry never re-renders a finished line.
 * One run per order at a time (concurrency key), and prepareLine re-checks
 * the order, so duplicates are harmless.
 */
export const prepareOrderFilesFn = inngest.createFunction(
  {
    id: "prepare-order-files",
    triggers: [{ event: ORDER_FILES_EVENT }],
    concurrency: { limit: 1, key: "event.data.orderId" },
    retries: 4,
    onFailure: async ({ event, error }) => {
      const parsed = dataSchema.safeParse(
        (event.data as { event?: { data?: unknown } }).event?.data,
      );
      if (!parsed.success) return;
      const { orderId } = parsed.data;
      console.error(`[order-files] order ${orderId} failed: ${error.message}`);
      await productionDeps().commerce.addOrderNote(
        orderId,
        `Print files failed after several tries: ${error.message}. Run "pnpm order:files ${orderId}" to try again.`,
      );
    },
  },
  async ({ event, step }) => {
    const parsed = dataSchema.safeParse(event.data);
    if (!parsed.success)
      throw new NonRetriableError("order/files.requested without an orderId");
    const { orderId } = parsed.data;

    const plan = await step.run("check-order", async () => {
      const order = await productionDeps().commerce.getOrder(orderId);
      if (!order) return { skip: "order not found", lines: 0 };
      if (!orderNeedsFiles(order))
        return { skip: `nothing to do (status ${order.status})`, lines: 0 };
      return { skip: null, lines: order.lines.length };
    });
    if (plan.skip) return { orderId, skipped: plan.skip };

    const results: LineResult[] = [];
    for (let i = 0; i < plan.lines; i++) {
      results.push(
        (await step.run(`line-${i + 1}`, () =>
          prepareLineOrNote(orderId, i, productionDeps()),
        )) as LineResult,
      );
    }

    await step.run("note", () =>
      addFilesNote(orderId, results, productionDeps()),
    );
    return { orderId, lines: results };
  },
);

const DESIGN_BATCH = 25;

/**
 * Task 24: daily at 03:30 Pakistan time (22:30 UTC; PKT has no DST), delete
 * print files / guest designs 30 days after delivery or cancellation, and
 * abandoned uploads. One run at a time. The plan is one step (read-only);
 * each order and each batch of abandoned designs is its own step, so a retry
 * never redoes finished work. Anything not finished today is picked up
 * tomorrow (orders get `_retention_done` only once their files are gone).
 */
export const dataRetentionFn = inngest.createFunction(
  {
    id: "data-retention",
    triggers: [{ cron: "TZ=Asia/Karachi 30 3 * * *" }],
    concurrency: { limit: 1 },
    retries: 3,
  },
  async ({ step }) => {
    const plan = await step.run("plan", () => planRetention(retentionDeps()));
    const orders: OrderPurgeResult[] = [];
    for (const item of plan.orders)
      orders.push(
        await step.run(`order-${item.orderId}`, () =>
          purgeOrder(item, retentionDeps()),
        ),
      );
    let abandonedFiles = 0;
    for (let i = 0; i < plan.abandonedDesigns.length; i += DESIGN_BATCH) {
      const batch = plan.abandonedDesigns.slice(i, i + DESIGN_BATCH);
      abandonedFiles += await step.run(`designs-${i / DESIGN_BATCH + 1}`, () =>
        purgeDesigns(batch, retentionDeps()),
      );
    }
    const summary = summarise(plan, orders, abandonedFiles);
    console.info(
      `[retention] cutoff ${summary.cutoff}: ${summary.ordersPurged.length} order(s), ${summary.designsDeleted.length} design(s), ${summary.filesDeleted} file(s) deleted; ${summary.skipped.length} skipped`,
    );
    return summary;
  },
);

export const functions = [prepareOrderFilesFn, dataRetentionFn];
