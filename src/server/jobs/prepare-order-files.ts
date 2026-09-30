import { getProduct } from "@/config/products";
import type { CommerceClient } from "@/lib/commerce/types";
import {
  assetKey,
  designKey,
  printFileKey,
  proofFileKey,
} from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import type { BuildVendorProof } from "@/server/pdf/types";
import type { RenderPrintFile } from "@/server/print/types";
import { isDesignDocument } from "@/types/design";
import type { Order, OrderId, OrderLine } from "@/types/order";

/**
 * Task 08 core: turn an order into print files. Pure logic with injected
 * dependencies — the Inngest function, the `pnpm order:files` script and the
 * tests all call the same code.
 *
 * Idempotent: a line that already has a print file link is skipped, so our
 * own `setLineFiles` (which fires another order.updated webhook) can't loop,
 * and re-running after a failure only does the missing work.
 */
export interface PrepareDeps {
  commerce: CommerceClient;
  storage: ObjectStorage;
  render: RenderPrintFile;
  /** Optional until task 03 lands; failures never block the print file. */
  buildProof?: BuildVendorProof;
  /** Long-lived download link for a storage key (see server/files/links.ts). */
  fileLink: (key: string, downloadName: string) => string;
  log?: (line: string) => void;
}

/** Retrying won't help (missing/invalid design). The Inngest wrapper stops retrying on these. */
export class PermanentOrderError extends Error {}

export type LineResult =
  | {
      index: number;
      status: "done";
      printUrl: string;
      proofUrl?: string;
      proofNote?: string;
    }
  | { index: number; status: "skipped"; reason: string };

/** Only live, unshipped orders get files. */
export function orderNeedsFiles(order: Order): boolean {
  return (
    (order.status === "on-hold" || order.status === "processing") &&
    order.lines.some((l) => !l.printPngUrl)
  );
}

const lineLabel = (l: OrderLine) =>
  `${getProduct(l.productId)?.name ?? l.productId} (${l.colourId}${l.size ? `, ${l.size}` : ""}) × ${l.quantity}`;

export async function prepareLine(
  orderId: OrderId,
  index: number,
  deps: PrepareDeps,
): Promise<LineResult> {
  const order = await deps.commerce.getOrder(orderId);
  if (!order) throw new PermanentOrderError(`Order ${orderId} not found`);
  const line = order.lines[index];
  if (!line)
    throw new PermanentOrderError(`Order ${orderId} has no line ${index + 1}`);
  if (line.printPngUrl)
    return { index, status: "skipped", reason: "already has files" };
  if (!line.designId)
    return { index, status: "skipped", reason: "no design attached" };

  let designId: string;
  let raw: Uint8Array | null;
  try {
    designId = line.designId;
    raw = await deps.storage.get(designKey(designId));
  } catch (err) {
    if (err instanceof Error && /Invalid designId/.test(err.message))
      throw new PermanentOrderError(
        `Line ${index + 1}: invalid design id "${line.designId}"`,
      );
    throw err;
  }
  if (!raw)
    throw new PermanentOrderError(
      `Line ${index + 1}: design ${designId} not found in storage`,
    );
  const doc: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isDesignDocument(doc, line.productId))
    throw new PermanentOrderError(
      `Line ${index + 1}: design ${designId} is not a valid ${line.productId} design`,
    );

  const file = await deps.render(doc, {
    resolveAsset: async (assetId) => {
      const bytes = await deps.storage.get(assetKey(designId, assetId));
      if (!bytes)
        throw new PermanentOrderError(
          `Line ${index + 1}: photo ${assetId} was never uploaded`,
        );
      return bytes;
    },
  });
  const printKey = printFileKey(order.id, index);
  await deps.storage.put(printKey, file.png, { contentType: "image/png" });
  const base = `order-${order.id}-line-${index + 1}`;
  const printUrl = deps.fileLink(printKey, `${base}-print.png`);
  deps.log?.(
    `order ${order.id} line ${index + 1}: print file ${file.widthPx}×${file.heightPx} @ ${file.dpi} DPI`,
  );

  let proofUrl: string | undefined;
  let proofNote: string | undefined;
  if (deps.buildProof) {
    try {
      const product = getProduct(line.productId);
      // Ready-made design: the vendor sees its title (a hiccup never blocks the proof).
      const designTitle = line.templateId
        ? await deps.commerce
            .getDesignProduct(line.templateId)
            .then((d) => d?.name)
            .catch(() => undefined)
        : undefined;
      const pdf = await deps.buildProof({
        orderId: order.id,
        createdAt: order.createdAt,
        productId: line.productId,
        productName: product?.name ?? line.productId,
        ...(designTitle ? { designTitle } : {}),
        colourName:
          product?.baseColors.find((c) => c.id === line.colourId)?.name ??
          line.colourId,
        ...(line.size ? { size: line.size } : {}),
        quantity: line.quantity,
        print: {
          widthMm: doc.printArea.widthMm,
          heightMm: doc.printArea.heightMm,
          dpi: file.dpi,
          placement:
            line.productId === "mug"
              ? "Full wrap: left and right edges meet at the handle; centre of the file = front of the mug"
              : "Centred on the print area",
          offsetXMm: 0,
          offsetYMm: 0,
        },
        printPng: file.png,
        customerCity: order.customer.city,
      });
      const proofKey = proofFileKey(order.id, index);
      await deps.storage.put(proofKey, pdf, { contentType: "application/pdf" });
      proofUrl = deps.fileLink(proofKey, `${base}-proof.pdf`);
    } catch (err) {
      proofNote = /not implemented/i.test(
        err instanceof Error ? err.message : "",
      )
        ? "proof PDF not available yet"
        : `proof PDF failed: ${err instanceof Error ? err.message : String(err)}`;
      deps.log?.(`order ${order.id} line ${index + 1}: ${proofNote}`);
    }
  }

  await deps.commerce.setLineFiles(order.id, index, {
    printPngUrl: printUrl,
    ...(proofUrl ? { proofPdfUrl: proofUrl } : {}),
  });
  return {
    index,
    status: "done",
    printUrl,
    ...(proofUrl ? { proofUrl } : {}),
    ...(proofNote ? { proofNote } : {}),
  };
}

/** Order note in WP admin with the download links (WooCommerce notes allow simple HTML links). */
export function filesNote(order: Order, results: LineResult[]): string | null {
  const done = results.filter(
    (r): r is Extract<LineResult, { status: "done" }> => r.status === "done",
  );
  if (done.length === 0) return null;
  const rows = done.map((r) => {
    const line = order.lines[r.index];
    const label = line ? lineLabel(line) : `Line ${r.index + 1}`;
    const links = [`<a href="${r.printUrl}">Print PNG</a>`];
    if (r.proofUrl) links.push(`<a href="${r.proofUrl}">Vendor PDF</a>`);
    return `Line ${r.index + 1} – ${label}: ${links.join(" · ")}${r.proofNote ? ` (${r.proofNote})` : ""}`;
  });
  return [
    "Print files ready (300 DPI). Confirm the order with the customer before sending to the vendor.",
    ...rows,
    "Links are private and valid for 90 days.",
  ].join("\n");
}

/** Whole job in one go (used by the script and tests; Inngest runs the same steps separately). */
export async function prepareOrderFiles(
  orderId: OrderId,
  deps: PrepareDeps,
): Promise<
  | { status: "skipped"; reason: string }
  | { status: "done"; lines: LineResult[] }
> {
  const order = await deps.commerce.getOrder(orderId);
  if (!order) return { status: "skipped", reason: "order not found" };
  if (!orderNeedsFiles(order))
    return {
      status: "skipped",
      reason: `nothing to do (status ${order.status})`,
    };

  const lines: LineResult[] = [];
  for (let i = 0; i < order.lines.length; i++)
    lines.push(await prepareLineOrNote(orderId, i, deps));
  await addFilesNote(orderId, lines, deps);
  return { status: "done", lines };
}

/**
 * `prepareLine`, but a permanent problem (missing design/photo) becomes an
 * order note and a skipped line instead of an error. Temporary errors
 * (network, storage) still throw so the caller can retry.
 */
export async function prepareLineOrNote(
  orderId: OrderId,
  index: number,
  deps: PrepareDeps,
): Promise<LineResult> {
  try {
    return await prepareLine(orderId, index, deps);
  } catch (err) {
    if (!(err instanceof PermanentOrderError)) throw err;
    deps.log?.(`order ${orderId} line ${index + 1}: ${err.message}`);
    await deps.commerce.addOrderNote(
      orderId,
      `Couldn't make print files: ${err.message}`,
    );
    return { index, status: "skipped", reason: err.message };
  }
}

/** Adds the "print files ready" note with links, if any line produced files. */
export async function addFilesNote(
  orderId: OrderId,
  results: LineResult[],
  deps: Pick<PrepareDeps, "commerce">,
): Promise<void> {
  const order = await deps.commerce.getOrder(orderId);
  const note = order ? filesNote(order, results) : null;
  if (note) await deps.commerce.addOrderNote(orderId, note);
}
