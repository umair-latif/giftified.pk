import type { CommerceClient, RetentionOrder } from "@/lib/commerce/types";
import {
  assertSafeId,
  designFolder,
  designIdFromKey,
  orderFolder,
} from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import type { OrderId } from "@/types/order";

/**
 * Task 24: make the privacy notice true. Pure logic with injected deps — the
 * Inngest cron, `pnpm retention:dry-run` and the tests call the same code.
 *
 * For every order completed or cancelled at least `retentionDays` ago:
 *  - `_retain_for_review` = yes (refused content) → never touched;
 *  - always delete `orders/<id>/` (print PNG + vendor PDF);
 *  - guest order (customer id 0) → also delete `designs/<designId>/`, unless
 *    another order that is still kept uses the same design;
 *  - set `_retention_done` and add ONE order note.
 * Plus designs never attached to any order whose newest file is older than
 * the cut-off (abandoned checkouts).
 *
 * Safety: the job reads EVERY order (all statuses) first, so it knows every
 * design still in use; nothing is deleted outside `orders/<n>/` and
 * `designs/<safe id>/`; when anything looks off it keeps the files.
 */

export const DEFAULT_RETENTION_DAYS = 30;
/** Lower bound so a typo ("0", "3") can't wipe designs of checkouts in progress. */
export const MIN_RETENTION_DAYS = 7;
export const MAX_ORDERS_PER_RUN = 200;
export const MAX_DESIGNS_PER_RUN = 500;
/** Safety valve for the abandoned-design sweep (see `planRetention`). */
export const ABANDONED_SANITY_MIN = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ORDER_PAGES = 1000;
const CLOSED = new Set(["completed", "cancelled"]);

export interface RetentionDeps {
  commerce: Pick<
    CommerceClient,
    "listOrdersForRetention" | "markRetentionDone" | "addOrderNote"
  >;
  storage: Pick<ObjectStorage, "list" | "deletePrefix">;
  /** ms since epoch. */
  now: () => number;
  retentionDays: number;
  log?: (line: string) => void;
}

/** `RETENTION_DAYS` (default 30). Invalid or below 7 → error, never a guess. */
export function retentionDaysFromEnv(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < MIN_RETENTION_DAYS)
    throw new Error(
      `RETENTION_DAYS must be a whole number ≥ ${MIN_RETENTION_DAYS} (got "${raw}")`,
    );
  return n;
}

export interface OrderPurge {
  orderId: OrderId;
  closedAt: string;
  status: string;
  guest: boolean;
  /** Guest designs to delete with the order (already checked as unused elsewhere). */
  designIds: string[];
}

export interface RetentionSkip {
  orderId?: OrderId;
  designId?: string;
  reason: string;
}

export interface RetentionPlan {
  cutoff: string;
  retentionDays: number;
  orders: OrderPurge[];
  abandonedDesigns: string[];
  skipped: RetentionSkip[];
  /** Due work left for the next run (per-run caps). */
  deferred: { orders: number; designs: number };
  counts: {
    ordersScanned: number;
    alreadyDone: number;
    notDueYet: number;
    notClosed: number;
    designsScanned: number;
  };
}

/** The orders changed under the scan (an order was deleted); retry later. */
export class RetentionScanError extends Error {}

/** Reads every order, page by page, and refuses an inconsistent snapshot. */
async function scanOrders(deps: RetentionDeps): Promise<RetentionOrder[]> {
  const byId = new Map<OrderId, RetentionOrder>();
  let lastTotal: number | undefined;
  for (let page = 1; page <= MAX_ORDER_PAGES; page++) {
    const res = await deps.commerce.listOrdersForRetention(page);
    // Orders are read oldest ID first; new orders only append. A smaller
    // total means one was deleted, which shifts later pages → we could miss
    // an order and with it a design still in use. Stop instead.
    if (lastTotal !== undefined && res.total < lastTotal)
      throw new RetentionScanError(
        `Order count went down during the scan (${lastTotal} → ${res.total}); try again later`,
      );
    lastTotal = res.total;
    for (const o of res.orders) byId.set(o.id, o);
    if (res.orders.length === 0 || page >= res.totalPages) break;
    if (page === MAX_ORDER_PAGES)
      throw new RetentionScanError("Too many order pages; refusing to guess");
  }
  if (lastTotal !== undefined && byId.size < lastTotal)
    throw new RetentionScanError(
      `Saw ${byId.size} of ${lastTotal} orders; try again later`,
    );
  return [...byId.values()];
}

/** Newest object time per design folder under designs/. */
async function scanDesigns(deps: RetentionDeps): Promise<Map<string, number>> {
  const newest = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await deps.storage.list("designs/", cursor ? { cursor } : {});
    for (const o of page.objects) {
      const id = designIdFromKey(o.key);
      if (!id) continue; // unexpected key: never touch it
      const t = Date.parse(o.lastModified);
      // Unknown time → treat as brand new (kept).
      const ms = Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
      newest.set(id, Math.max(newest.get(id) ?? 0, ms));
    }
    cursor = page.cursor;
  } while (cursor);
  return newest;
}

const isSafeId = (id: string) => {
  try {
    assertSafeId(id);
    return true;
  } catch {
    return false;
  }
};

/** Read-only: what a run would delete. Nothing is changed. */
export async function planRetention(
  deps: RetentionDeps,
): Promise<RetentionPlan> {
  if (
    !Number.isInteger(deps.retentionDays) ||
    deps.retentionDays < MIN_RETENTION_DAYS
  )
    throw new Error(`retentionDays must be ≥ ${MIN_RETENTION_DAYS}`);
  const cutoffMs = deps.now() - deps.retentionDays * DAY_MS;
  const orders = await scanOrders(deps);

  const isDue = (o: RetentionOrder) => {
    if (!CLOSED.has(o.status) || !o.closedAt) return false;
    const t = Date.parse(o.closedAt);
    return !Number.isNaN(t) && t <= cutoffMs;
  };
  const guestReleasable = (o: RetentionOrder) =>
    isDue(o) && o.customerId === 0 && !o.retainForReview;

  // Every design any order mentions, and those that must stay: used by an
  // order that is open, recent, signed-in or kept for review.
  const referenced = new Set<string>();
  const protectedIds = new Set<string>();
  for (const o of orders)
    for (const d of o.designIds) {
      referenced.add(d);
      if (!guestReleasable(o)) protectedIds.add(d);
    }

  const skipped: RetentionSkip[] = [];
  const counts = {
    ordersScanned: orders.length,
    alreadyDone: 0,
    notDueYet: 0,
    notClosed: 0,
    designsScanned: 0,
  };
  const due: OrderPurge[] = [];
  for (const o of orders) {
    if (!CLOSED.has(o.status)) {
      counts.notClosed++;
      continue;
    }
    if (!isDue(o)) {
      counts.notDueYet++;
      continue;
    }
    if (o.retainForReview) {
      skipped.push({ orderId: o.id, reason: "_retain_for_review = yes" });
      continue;
    }
    if (o.retentionDoneAt) {
      counts.alreadyDone++;
      continue;
    }
    const guest = o.customerId === 0;
    const designIds: string[] = [];
    if (guest)
      for (const d of o.designIds) {
        if (!isSafeId(d))
          skipped.push({
            orderId: o.id,
            designId: d,
            reason: "invalid design id",
          });
        else if (protectedIds.has(d))
          skipped.push({
            orderId: o.id,
            designId: d,
            reason: "design also used by an order that is still kept",
          });
        else designIds.push(d);
      }
    due.push({
      orderId: o.id,
      closedAt: o.closedAt!,
      status: o.status,
      guest,
      designIds,
    });
  }
  due.sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt));

  // Abandoned uploads: never on any order, untouched since the cut-off.
  const newest = await scanDesigns(deps);
  counts.designsScanned = newest.size;
  const old = [...newest].filter(([, t]) => t <= cutoffMs);
  let abandoned = old
    .filter(([id]) => !referenced.has(id))
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
  // Safety valve: checkout uploads right before it places the order, so
  // abandoned uploads are rare. If most old designs look unused, the order
  // scan is probably wrong (wrong store, empty mock) — keep everything.
  if (abandoned.length > 0 && orders.length === 0) {
    skipped.push({
      reason:
        "abandoned-design sweep skipped: the store returned no orders at all",
    });
    abandoned = [];
  } else if (
    abandoned.length > ABANDONED_SANITY_MIN &&
    abandoned.length > old.length / 2
  ) {
    skipped.push({
      reason: `abandoned-design sweep skipped: ${abandoned.length} of ${old.length} old designs are on no order, which looks wrong (is WC_URL the right store?)`,
    });
    abandoned = [];
  }

  return {
    cutoff: new Date(cutoffMs).toISOString(),
    retentionDays: deps.retentionDays,
    orders: due.slice(0, MAX_ORDERS_PER_RUN),
    abandonedDesigns: abandoned.slice(0, MAX_DESIGNS_PER_RUN),
    skipped,
    deferred: {
      orders: Math.max(0, due.length - MAX_ORDERS_PER_RUN),
      designs: Math.max(0, abandoned.length - MAX_DESIGNS_PER_RUN),
    },
    counts,
  };
}

export function retentionNote(days: number, designsDeleted: boolean): string {
  return designsDeleted
    ? `Print files and design photos deleted (${days}-day retention).`
    : `Print files deleted (${days}-day retention).`;
}

export interface OrderPurgeResult {
  orderId: OrderId;
  filesDeleted: number;
  designsDeleted: string[];
}

/**
 * Deletes one planned order's files, then records `_retention_done` and adds
 * the note. The meta is written BEFORE the note: if the note then fails, a
 * retry adds it once; the next day's plan skips the order either way, so a
 * note is never added twice. Deleting already-deleted files is a no-op.
 */
export async function purgeOrder(
  item: OrderPurge,
  deps: RetentionDeps,
): Promise<OrderPurgeResult> {
  // Folders are rebuilt from validated ids, never taken as strings.
  let filesDeleted = await deps.storage.deletePrefix(orderFolder(item.orderId));
  const designsDeleted: string[] = [];
  if (item.guest)
    for (const d of item.designIds) {
      filesDeleted += await deps.storage.deletePrefix(designFolder(d));
      designsDeleted.push(d);
    }
  await deps.commerce.markRetentionDone(
    item.orderId,
    new Date(deps.now()).toISOString(),
  );
  await deps.commerce.addOrderNote(
    item.orderId,
    retentionNote(deps.retentionDays, designsDeleted.length > 0),
  );
  deps.log?.(
    `order ${item.orderId}: deleted ${filesDeleted} file(s)${designsDeleted.length ? ` incl. design(s) ${designsDeleted.join(", ")}` : ""}`,
  );
  return { orderId: item.orderId, filesDeleted, designsDeleted };
}

/** Deletes abandoned designs (ids from the plan). */
export async function purgeDesigns(
  designIds: string[],
  deps: RetentionDeps,
): Promise<number> {
  let n = 0;
  for (const d of designIds) {
    n += await deps.storage.deletePrefix(designFolder(d));
    deps.log?.(`abandoned design ${d}: deleted`);
  }
  return n;
}

export interface RetentionSummary {
  cutoff: string;
  ordersPurged: OrderId[];
  designsDeleted: string[];
  filesDeleted: number;
  skipped: RetentionSkip[];
  deferred: RetentionPlan["deferred"];
  counts: RetentionPlan["counts"];
}

export function summarise(
  plan: RetentionPlan,
  orders: OrderPurgeResult[],
  abandonedFiles: number,
): RetentionSummary {
  return {
    cutoff: plan.cutoff,
    ordersPurged: orders.map((o) => o.orderId),
    designsDeleted: [
      ...orders.flatMap((o) => o.designsDeleted),
      ...plan.abandonedDesigns,
    ],
    filesDeleted:
      orders.reduce((s, o) => s + o.filesDeleted, 0) + abandonedFiles,
    skipped: plan.skipped,
    deferred: plan.deferred,
    counts: plan.counts,
  };
}

/** Whole run in one go (tests; Inngest runs the same pieces as steps). */
export async function runRetention(
  deps: RetentionDeps,
): Promise<RetentionSummary> {
  const plan = await planRetention(deps);
  const results: OrderPurgeResult[] = [];
  for (const item of plan.orders) results.push(await purgeOrder(item, deps));
  const abandonedFiles = await purgeDesigns(plan.abandonedDesigns, deps);
  return summarise(plan, results, abandonedFiles);
}
