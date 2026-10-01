import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import { createMockCommerce } from "@/lib/commerce/mock";
import { MAX_SAVED_DESIGNS, type SavedDesign } from "@/lib/commerce/types";
import { createMemoryStorage } from "@/lib/storage/memory";
import { runRetention } from "@/server/jobs/retention";
import {
  addOrderDesigns,
  deleteAllSavedDesigns,
  deleteSavedDesign,
  finishSave,
  openSavedDesign,
  renameSavedDesign,
  SavedDesignError,
  startSave,
  thumbnailUrls,
  type SavedDesignDeps,
} from "@/server/saved-designs/service";
import type { DesignDocument } from "@/types/design";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-09-01T10:00:00Z");

const design = (assetIds: string[] = ["p1"]): DesignDocument => ({
  schemaVersion: 1,
  productId: "mug",
  units: "mm",
  printArea: { ...mug.printArea },
  fabric: {
    version: "7.4.0",
    objects: assetIds.map((id) => ({
      type: "Image",
      src: `asset:${id}`,
      assetId: id,
      sourceWidthPx: 3000,
      sourceHeightPx: 2000,
      left: 100,
      top: 40,
    })),
  },
});

const photo = (id: string, size = 4) => ({
  assetId: id,
  contentType: "image/jpeg" as const,
  size,
});

async function setup() {
  const clock = { now: T0 };
  const now = () => clock.now;
  const commerce = createMockCommerce({ now });
  const { storage, objects } = createMemoryStorage("/x", { now });
  let n = 0;
  const deps: SavedDesignDeps = {
    commerce,
    storage,
    now,
    makeId: () => `s${++n}`,
  };
  const customer = (await commerce.createCustomer({
    email: `c${Math.random()}@example.pk`,
    firstName: "Sara",
    lastName: "Ali",
    password: "pw-pw-pw-pw",
  }))!;
  /** Plays the phone's part: PUT every presigned photo (and thumbnail). */
  async function upload(ticket: Awaited<ReturnType<typeof startSave>>) {
    for (const u of ticket.uploads)
      await storage.put(u.url.replace(/^\/x\//, ""), "jpeg");
    if (ticket.thumbnailUrl)
      await storage.put(ticket.thumbnailUrl.replace(/^\/x\//, ""), "webp");
  }
  async function save(
    body: Record<string, unknown> = {},
    opts: { name?: string; skipUpload?: boolean } = {},
  ) {
    const ticket = await startSave(
      customer.id,
      { design: design(), assets: [photo("p1")], thumbnail: true, ...body },
      deps,
    );
    if (!opts.skipUpload) await upload(ticket);
    return {
      ticket,
      entry: await finishSave(
        customer.id,
        ticket.savedId,
        opts.name ? { name: opts.name } : {},
        deps,
      ),
    };
  }
  const keys = () => [...objects.keys()].sort();
  return {
    clock,
    commerce,
    storage,
    objects,
    deps,
    customer,
    upload,
    save,
    keys,
  };
}

describe("Save to my designs (task 22)", () => {
  it("stores design, photos and thumbnail under accounts/<id>/ and lists it", async () => {
    const t = await setup();
    const { ticket, entry } = await t.save({}, { name: "Ammi's mug" });
    expect(ticket.uploads.map((u) => u.assetId)).toEqual(["p1"]);
    const base = `accounts/${t.customer.id}/designs/${entry.id}/`;
    expect(t.keys()).toEqual([
      `${base}assets/p1`,
      `${base}design.json`,
      `${base}thumbnail.webp`,
    ]);
    expect(entry).toMatchObject({
      name: "Ammi's mug",
      source: "account",
      productId: "mug",
      hasThumbnail: true,
    });
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toEqual([entry]);
  });

  it("keeps sample photos and blurry photos (unlike checkout): it is work in progress", async () => {
    const t = await setup();
    const d = design();
    (d.fabric.objects as Record<string, unknown>[])[0]!.sourceWidthPx = 50;
    const ticket = await startSave(
      t.customer.id,
      { design: d, assets: [photo("p1")] },
      t.deps,
    );
    await t.upload(ticket);
    await expect(
      finishSave(t.customer.id, ticket.savedId, {}, t.deps),
    ).resolves.toMatchObject({ source: "account" });
  });

  it("refuses to finish before every photo arrived, and never lists it", async () => {
    const t = await setup();
    await expect(t.save({}, { skipUpload: true })).rejects.toThrow(
      /didn't finish uploading/,
    );
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toEqual([]);
  });

  it("updates the same saved design, skips photos already stored and drops unused ones", async () => {
    const t = await setup();
    const first = (await t.save({}, { name: "First" })).entry;
    t.clock.now += 1000;
    const ticket = await startSave(
      t.customer.id,
      {
        savedId: first.id,
        design: design(["p1", "p2"]),
        assets: [photo("p1"), photo("p2")],
      },
      t.deps,
    );
    expect(ticket.savedId).toBe(first.id);
    // "jpeg" is 4 bytes: p1 is already there, only p2 is uploaded.
    expect(ticket.uploads.map((u) => u.assetId)).toEqual(["p2"]);
    await t.upload(ticket);
    const second = await finishSave(t.customer.id, first.id, {}, t.deps);
    expect(second.name).toBe("First"); // kept when no new name
    expect(second.updatedAt > first.updatedAt).toBe(true);

    // Remove p1 from the design: its file goes on the next save.
    const third = await startSave(
      t.customer.id,
      { savedId: first.id, design: design(["p2"]), assets: [photo("p2")] },
      t.deps,
    );
    await t.upload(third);
    await finishSave(t.customer.id, first.id, {}, t.deps);
    expect(t.keys().filter((k) => k.includes("/assets/"))).toEqual([
      `accounts/${t.customer.id}/designs/${first.id}/assets/p2`,
    ]);
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toHaveLength(1);
  });

  it("a retried finish is harmless", async () => {
    const t = await setup();
    const { ticket, entry } = await t.save();
    await expect(
      finishSave(t.customer.id, ticket.savedId, {}, t.deps),
    ).resolves.toEqual(entry);
  });

  it("rejects mismatched photos, bad designs and bad ids", async () => {
    const t = await setup();
    await expect(
      startSave(t.customer.id, { design: design(), assets: [] }, t.deps),
    ).rejects.toThrow(/don't match/);
    await expect(
      startSave(t.customer.id, { design: { nope: 1 }, assets: [] }, t.deps),
    ).rejects.toThrow(/Invalid design/);
    await expect(
      startSave(
        t.customer.id,
        { savedId: "../../x", design: design(), assets: [photo("p1")] },
        t.deps,
      ),
    ).rejects.toBeInstanceOf(SavedDesignError);
  });

  it(`stops at ${MAX_SAVED_DESIGNS} designs`, async () => {
    const t = await setup();
    const full: SavedDesign[] = Array.from(
      { length: MAX_SAVED_DESIGNS },
      (_, i) => ({
        id: `d${i}`,
        productId: "mug",
        name: `D${i}`,
        source: "account",
        hasThumbnail: false,
        updatedAt: new Date(T0 - i).toISOString(),
      }),
    );
    await t.commerce.setSavedDesigns(t.customer.id, full);
    await expect(t.save()).rejects.toThrow(/already have 50/);
    // Updating one of them still works.
    const ticket = await startSave(
      t.customer.id,
      { savedId: "d3", design: design(), assets: [photo("p1")] },
      t.deps,
    );
    expect(ticket.savedId).toBe("d3");
  });
});

describe("open, rename, delete", () => {
  it("opens with short-lived photo links; another customer can't", async () => {
    const t = await setup();
    const { entry } = await t.save();
    const opened = await openSavedDesign(t.customer.id, entry.id, t.deps);
    expect(opened.design.productId).toBe("mug");
    expect(opened.assetUrls).toEqual({
      p1: `/x/accounts/${t.customer.id}/designs/${entry.id}/assets/p1`,
    });
    const other = (await t.commerce.createCustomer({
      email: "other@example.pk",
      firstName: "O",
      lastName: "T",
      password: "pw-pw-pw-pw",
    }))!;
    await expect(
      openSavedDesign(other.id, entry.id, t.deps),
    ).rejects.toMatchObject({ status: 404 });
    expect(await thumbnailUrls(t.customer.id, [entry], t.deps)).toEqual({
      [entry.id]: `/x/accounts/${t.customer.id}/designs/${entry.id}/thumbnail.webp`,
    });
  });

  it("renames within 1–60 characters", async () => {
    const t = await setup();
    const { entry } = await t.save();
    await renameSavedDesign(t.customer.id, entry.id, "  Eid mug ", t.deps);
    expect((await t.commerce.listSavedDesigns(t.customer.id))[0]!.name).toBe(
      "Eid mug",
    );
    await expect(
      renameSavedDesign(t.customer.id, entry.id, "", t.deps),
    ).rejects.toThrow(/1–60/);
  });

  it("delete removes the design AND its photos from storage", async () => {
    const t = await setup();
    const { entry } = await t.save();
    await deleteSavedDesign(t.customer.id, entry.id, t.deps);
    expect(t.keys()).toEqual([]);
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toEqual([]);
  });
});

async function placeOrder(
  t: Awaited<ReturnType<typeof setup>>,
  designId: string,
) {
  await t.storage.put(`designs/${designId}/design.json`, "{}");
  await t.storage.put(`designs/${designId}/assets/p1`, "jpeg");
  await t.storage.put(`designs/${designId}/thumbnail.webp`, "webp");
  const order = await t.commerce.createOrder({
    checkoutId: `chk-${designId}-0001`,
    customer: {
      fullName: "Sara Ali",
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 1",
    },
    customerId: t.customer.id,
    lines: [
      { productId: "mug", colourId: "white", quantity: 1, designId },
      { productId: "mug", colourId: "white", quantity: 2, designId },
    ],
  });
  await addOrderDesigns(t.customer.id, order, t.deps);
  return order;
}

describe("designs of signed-in orders", () => {
  it("join My designs once per design, with the order number", async () => {
    const t = await setup();
    const order = await placeOrder(t, "od1");
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toEqual([
      expect.objectContaining({
        id: "od1",
        source: "order",
        orderId: order.id,
        hasThumbnail: true,
        name: `${mug.name} · order #${order.id}`,
      }),
    ]);
    await addOrderDesigns(t.customer.id, order, t.deps); // webhook retry etc.
    expect(await t.commerce.listSavedDesigns(t.customer.id)).toHaveLength(1);
  });

  it("can't be deleted while the order is being made; can after delivery", async () => {
    const t = await setup();
    const order = await placeOrder(t, "od2");
    await expect(
      deleteSavedDesign(t.customer.id, "od2", t.deps),
    ).rejects.toThrow(/still making/);
    expect(t.keys()).toContain("designs/od2/design.json");
    await t.commerce.setOrderStatus(order.id, "completed");
    await deleteSavedDesign(t.customer.id, "od2", t.deps);
    expect(t.keys().some((k) => k.startsWith("designs/od2/"))).toBe(false);
  });
});

describe("account deletion helper (task 21)", () => {
  it("deletes every saved design and photo, keeping only designs still being printed", async () => {
    const t = await setup();
    await t.save();
    await t.save();
    const open = await placeOrder(t, "od-open");
    const done = await placeOrder(t, "od-done");
    await t.commerce.setOrderStatus(done.id, "completed");
    // A half-finished save is swept too.
    await t.storage.put(
      `accounts/${t.customer.id}/designs/zz/pending.json`,
      "{}",
    );

    const r = await deleteAllSavedDesigns(t.customer.id, t.deps);
    expect(r).toEqual({ deleted: 3, kept: 1 });
    expect(t.keys().filter((k) => k.startsWith("accounts/"))).toEqual([]);
    expect(t.keys().some((k) => k.startsWith("designs/od-done/"))).toBe(false);
    expect(t.keys()).toContain("designs/od-open/design.json");
    expect(
      (await t.commerce.listSavedDesigns(t.customer.id)).map((d) => d.orderId),
    ).toEqual([open.id]);
  });
});

describe("retention (task 24) never deletes saved designs", () => {
  it("leaves accounts/ alone even when every file is far past the cut-off", async () => {
    const t = await setup();
    const { entry } = await t.save();
    // Enough real orders that the job's sanity checks don't stop it early.
    const order = await placeOrder(t, "od3");
    await t.commerce.setOrderStatus(order.id, "completed");
    const savedKeys = t.keys().filter((k) => k.startsWith("accounts/"));
    expect(savedKeys.length).toBeGreaterThan(0);

    t.clock.now = T0 + 400 * DAY;
    const summary = await runRetention({
      commerce: t.commerce,
      storage: t.storage,
      now: () => t.clock.now,
      retentionDays: 30,
    });
    expect(summary.designsDeleted).not.toContain(entry.id);
    expect(t.keys().filter((k) => k.startsWith("accounts/"))).toEqual(
      savedKeys,
    );
    // The delivered signed-in order: print files go, its design stays (My designs).
    expect(summary.ordersPurged).toEqual([order.id]);
    expect(t.keys()).toContain("designs/od3/design.json");
  });
});
