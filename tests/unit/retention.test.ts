import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";
import type { RetentionOrderPage } from "@/lib/commerce/types";
import { createMemoryStorage } from "@/lib/storage/memory";
import {
  planRetention,
  retentionDaysFromEnv,
  RetentionScanError,
  runRetention,
  type RetentionDeps,
} from "@/server/jobs/retention";
import type { OrderStatus } from "@/types/order";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-08-01T10:00:00Z");

function setup() {
  const clock = { now: T0 };
  const now = () => clock.now;
  const commerce = createMockCommerce({ now });
  const { storage, objects } = createMemoryStorage("/x", { now });
  const notes: { id: number; note: string }[] = [];
  const deps: RetentionDeps = {
    commerce: {
      ...commerce,
      addOrderNote: async (id, note) => {
        notes.push({ id, note });
      },
    },
    storage,
    now,
    retentionDays: 30,
  };
  let checkout = 0;

  /** Uploads a design (JSON + one photo) at the current time. */
  async function design(id: string) {
    await storage.put(`designs/${id}/design.json`, "{}");
    await storage.put(`designs/${id}/assets/photo-1`, "jpeg");
  }

  /** An order with its print files, optionally closed now. */
  async function order(
    designId: string,
    opts: { customerId?: number; status?: OrderStatus } = {},
  ) {
    if (!objects.has(`designs/${designId}/design.json`)) await design(designId);
    const o = await commerce.createOrder({
      checkoutId: `chk-${++checkout}`,
      customer: {
        fullName: "Ayesha Khan",
        phone: "+923001234567",
        city: "Lahore",
        addressLine: "House 1",
      },
      ...(opts.customerId ? { customerId: opts.customerId } : {}),
      lines: [{ productId: "mug", colourId: "white", quantity: 1, designId }],
    });
    await storage.put(`orders/${o.id}/line-0/print.png`, "png");
    await storage.put(`orders/${o.id}/line-0/proof.pdf`, "pdf");
    if (opts.status) await commerce.setOrderStatus(o.id, opts.status);
    return o.id;
  }

  const has = (prefix: string) =>
    [...objects.keys()].some((k) => k.startsWith(prefix));
  return { clock, commerce, storage, objects, notes, deps, design, order, has };
}

describe("retention job (task 24)", () => {
  it("deletes nothing before the cut-off", async () => {
    const t = setup();
    await t.order("g1", { status: "completed" });
    await t.order("g2", { status: "cancelled" });
    await t.design("abandoned");
    const before = [...t.objects.keys()].sort();

    t.clock.now = T0 + 30 * DAY - 60_000; // one minute short of 30 days
    const summary = await runRetention(t.deps);
    expect([...t.objects.keys()].sort()).toEqual(before);
    expect(t.notes).toEqual([]);
    expect(summary.ordersPurged).toEqual([]);
    expect(summary.designsDeleted).toEqual([]);
    expect(summary.filesDeleted).toBe(0);
    expect(summary.counts.notDueYet).toBe(2);
  });

  it("after 30 days: guest → print files AND design; account → print files only", async () => {
    const t = setup();
    const guest = await t.order("guest-d", { status: "completed" });
    const account = await t.order("acct-d", {
      status: "completed",
      customerId: 42,
    });

    t.clock.now = T0 + 30 * DAY + 60_000;
    const summary = await runRetention(t.deps);

    expect(t.has(`orders/${guest}/`)).toBe(false);
    expect(t.has("designs/guest-d/")).toBe(false);
    expect(t.has(`orders/${account}/`)).toBe(false);
    expect(t.has("designs/acct-d/")).toBe(true);
    expect(t.objects.has("designs/acct-d/assets/photo-1")).toBe(true);

    expect(t.notes).toEqual([
      {
        id: guest,
        note: "Print files and design photos deleted (30-day retention).",
      },
      { id: account, note: "Print files deleted (30-day retention)." },
    ]);
    expect(summary.ordersPurged).toEqual([guest, account]);
    expect(summary.designsDeleted).toEqual(["guest-d"]);
    expect(summary.filesDeleted).toBe(2 + 2 + 2); // 2 PNG/PDF pairs + guest design
  });

  it("treats cancelled orders like delivered ones (30 days after cancelling)", async () => {
    const t = setup();
    const early = await t.order("c1", { status: "cancelled" });
    t.clock.now = T0 + 10 * DAY;
    const late = await t.order("c2");
    await t.commerce.setOrderStatus(late, "cancelled");

    t.clock.now = T0 + 31 * DAY;
    await runRetention(t.deps);
    expect(t.has(`orders/${early}/`)).toBe(false);
    expect(t.has("designs/c1/")).toBe(false);
    expect(t.has(`orders/${late}/`)).toBe(true);
    expect(t.has("designs/c2/")).toBe(true);
  });

  it("never touches an order marked _retain_for_review = yes", async () => {
    const t = setup();
    const refused = await t.order("bad-d", { status: "cancelled" });
    t.commerce.setOrderMeta(refused, "_retain_for_review", "yes");

    t.clock.now = T0 + 400 * DAY;
    const summary = await runRetention(t.deps);
    expect(t.has(`orders/${refused}/`)).toBe(true);
    expect(t.has("designs/bad-d/")).toBe(true);
    expect(t.notes).toEqual([]);
    expect(summary.skipped).toEqual([
      { orderId: refused, reason: "_retain_for_review = yes" },
    ]);
  });

  it("leaves on-hold and processing orders alone, however old", async () => {
    const t = setup();
    const onHold = await t.order("hold-d");
    const processing = await t.order("proc-d", { status: "processing" });

    t.clock.now = T0 + 400 * DAY;
    const summary = await runRetention(t.deps);
    for (const id of [onHold, processing])
      expect(t.has(`orders/${id}/`)).toBe(true);
    // Their designs are old but on an open order → not "abandoned".
    expect(t.has("designs/hold-d/")).toBe(true);
    expect(t.has("designs/proc-d/")).toBe(true);
    expect(t.notes).toEqual([]);
    expect(summary.counts.notClosed).toBe(2);
  });

  it("running twice is a no-op: no second note, no errors", async () => {
    const t = setup();
    const guest = await t.order("g", { status: "completed" });
    await t.order("a", { status: "completed", customerId: 7 });
    await t.design("old-abandoned");

    t.clock.now = T0 + 31 * DAY;
    await runRetention(t.deps);
    const after = [...t.objects.keys()].sort();
    expect(t.notes).toHaveLength(2);

    t.clock.now += DAY;
    const second = await runRetention(t.deps);
    expect(t.notes).toHaveLength(2);
    expect([...t.objects.keys()].sort()).toEqual(after);
    expect(second.ordersPurged).toEqual([]);
    expect(second.designsDeleted).toEqual([]);
    expect(second.filesDeleted).toBe(0);
    expect(second.counts.alreadyDone).toBe(2);
    expect(guest).toBeGreaterThan(0);
  });

  it("finishes the job if a run died after deleting (files already gone, one note)", async () => {
    const t = setup();
    const id = await t.order("g", { status: "completed" });
    t.clock.now = T0 + 31 * DAY;
    // Simulate a crash after the deletes, before `_retention_done` was set.
    await t.storage.deletePrefix(`orders/${id}/`);
    await t.storage.deletePrefix("designs/g/");
    const summary = await runRetention(t.deps);
    expect(summary.ordersPurged).toEqual([id]);
    expect(summary.filesDeleted).toBe(0);
    expect(t.notes).toHaveLength(1);
    await runRetention(t.deps);
    expect(t.notes).toHaveLength(1);
  });

  it("deletes abandoned uploads after 30 days; keeps recent ones and ones on an open order", async () => {
    const t = setup();
    await t.design("abandoned-old");
    await t.order("on-open-order"); // on-hold, design uploaded at T0
    await t.order("on-account-order", { status: "completed", customerId: 3 });
    t.clock.now = T0 + 20 * DAY;
    await t.design("abandoned-recent");

    t.clock.now = T0 + 31 * DAY;
    const summary = await runRetention(t.deps);
    expect(t.has("designs/abandoned-old/")).toBe(false);
    expect(t.has("designs/abandoned-recent/")).toBe(true);
    expect(t.has("designs/on-open-order/")).toBe(true);
    expect(t.has("designs/on-account-order/")).toBe(true);
    expect(summary.designsDeleted).toEqual(["abandoned-old"]);
  });

  it("an abandoned design counts from its NEWEST file (a late photo upload keeps it)", async () => {
    const t = setup();
    await t.storage.put("designs/late/design.json", "{}");
    t.clock.now = T0 + 15 * DAY;
    await t.storage.put("designs/late/assets/p", "jpeg");
    await t.order("anchor"); // at least one order, so the sweep runs
    t.clock.now = T0 + 31 * DAY;
    await runRetention(t.deps);
    expect(t.objects.has("designs/late/design.json")).toBe(true);
    t.clock.now = T0 + 46 * DAY;
    await runRetention(t.deps);
    expect(t.has("designs/late/")).toBe(false);
  });

  it("keeps a guest design that another, still-kept order also uses", async () => {
    const t = setup();
    const old = await t.order("shared", { status: "completed" });
    t.clock.now = T0 + 25 * DAY;
    const open = await t.order("shared");

    t.clock.now = T0 + 31 * DAY;
    const summary = await runRetention(t.deps);
    expect(t.has(`orders/${old}/`)).toBe(false);
    expect(t.has(`orders/${open}/`)).toBe(true);
    expect(t.has("designs/shared/")).toBe(true);
    expect(t.notes).toEqual([
      { id: old, note: "Print files deleted (30-day retention)." },
    ]);
    expect(summary.skipped).toEqual([
      {
        orderId: old,
        designId: "shared",
        reason: "design also used by an order that is still kept",
      },
    ]);
  });

  it("never deletes anything outside orders/<id>/ and designs/<id>/", async () => {
    const t = setup();
    const id = await t.order("g", { status: "completed" });
    const others = [
      `orders/${id}0/line-0/print.png`, // neighbour id with the same prefix digits
      "designs-backup/g/design.json",
      "designs/stray-file",
      "templates/x.json",
      "orders.csv",
    ];
    for (const k of others) await t.storage.put(k, "keep");
    t.clock.now = T0 + 400 * DAY;
    await runRetention(t.deps);
    for (const k of others) expect(t.objects.has(k)).toBe(true);
    expect(t.has(`orders/${id}/`)).toBe(false);
  });

  it("stops (deletes nothing) when an order disappears during the scan", async () => {
    const t = setup();
    await t.order("g", { status: "completed" });
    t.clock.now = T0 + 31 * DAY;
    const real = await t.deps.commerce.listOrdersForRetention(1);
    const pages: RetentionOrderPage[] = [
      { orders: real.orders, total: 150, totalPages: 2 },
      { orders: real.orders, total: 149, totalPages: 2 },
    ];
    const deps: RetentionDeps = {
      ...t.deps,
      commerce: {
        ...t.deps.commerce,
        listOrdersForRetention: async (page) => pages[page - 1]!,
      },
    };
    await expect(runRetention(deps)).rejects.toBeInstanceOf(RetentionScanError);
    await expect(runRetention(deps)).rejects.toThrow(/went down/);
    // Fewer orders read than the store reports → also refused.
    const short: RetentionDeps = {
      ...t.deps,
      commerce: {
        ...t.deps.commerce,
        listOrdersForRetention: async () => ({
          orders: [],
          total: 3,
          totalPages: 1,
        }),
      },
    };
    await expect(runRetention(short)).rejects.toThrow(/Saw 0 of 3/);
    expect(t.has("designs/g/")).toBe(true);
  });

  it("skips the abandoned sweep when the order scan looks wrong", async () => {
    const t = setup();
    for (let i = 0; i < 25; i++) await t.design(`d${i}`);
    t.clock.now = T0 + 31 * DAY;
    // No orders at all (wrong store / mock) → keep everything.
    let plan = await planRetention(t.deps);
    expect(plan.abandonedDesigns).toEqual([]);
    expect(plan.skipped[0]!.reason).toMatch(/no orders at all/);

    // One order, but most old designs unused → looks wrong, keep everything.
    await t.order("real");
    plan = await planRetention(t.deps);
    expect(plan.abandonedDesigns).toEqual([]);
    expect(plan.skipped[0]!.reason).toMatch(/looks wrong/);
  });

  it("planRetention is read-only", async () => {
    const t = setup();
    await t.order("g", { status: "completed" });
    await t.design("abandoned");
    await t.order("x");
    t.clock.now = T0 + 31 * DAY;
    const before = [...t.objects.keys()].sort();
    const plan = await planRetention(t.deps);
    expect(plan.orders.map((o) => o.designIds)).toEqual([["g"]]);
    expect(plan.abandonedDesigns).toEqual(["abandoned"]);
    expect([...t.objects.keys()].sort()).toEqual(before);
    expect(t.notes).toEqual([]);
  });

  it("refuses a retention period below 7 days", async () => {
    const t = setup();
    await expect(
      planRetention({ ...t.deps, retentionDays: 0 }),
    ).rejects.toThrow(/≥ 7/);
  });
});

describe("retentionDaysFromEnv", () => {
  it("defaults to 30 and accepts whole numbers ≥ 7", () => {
    expect(retentionDaysFromEnv({})).toBe(30);
    expect(retentionDaysFromEnv({ RETENTION_DAYS: "" })).toBe(30);
    expect(retentionDaysFromEnv({ RETENTION_DAYS: " 45 " })).toBe(45);
    expect(retentionDaysFromEnv({ RETENTION_DAYS: "7" })).toBe(7);
  });

  it("refuses typos instead of guessing", () => {
    for (const bad of ["0", "3", "-30", "30.5", "thirty"])
      expect(() => retentionDaysFromEnv({ RETENTION_DAYS: bad })).toThrow(
        /RETENTION_DAYS/,
      );
  });
});

describe("retentionDeps", () => {
  it("refuses real storage with the mock store", async () => {
    vi.doMock("server-only", () => ({}));
    const { retentionDeps } = await import("@/server/jobs/deps");
    expect(() =>
      retentionDeps(() => {}, { STORAGE_ENDPOINT: "https://r2.test" }),
    ).toThrow(/WC_URL/);
  });
});
