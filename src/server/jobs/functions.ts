import "server-only";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { inngest } from "./client";
import { productionDeps } from "./deps";
import { ORDER_FILES_EVENT } from "./events";
import {
  addFilesNote,
  orderNeedsFiles,
  prepareLineOrNote,
  type LineResult,
} from "./prepare-order-files";

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

export const functions = [prepareOrderFilesFn];
