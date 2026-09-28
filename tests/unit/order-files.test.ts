import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";
import type { CommerceClient, VerifiedWebhook } from "@/lib/commerce/types";
import { assetKey, designKey, printFileKey } from "@/lib/storage/keys";
import { createMemoryStorage } from "@/lib/storage/memory";
import {
  appBaseUrl,
  fileLinkSecret,
  fileLinkUrl,
  signFileToken,
  verifyFileToken,
} from "@/server/files/links";
import {
  createOrderFilesSink,
  orderFilesEvent,
  webhookWantsFiles,
} from "@/server/jobs/events";
import {
  filesNote,
  prepareOrderFiles,
  type PrepareDeps,
} from "@/server/jobs/prepare-order-files";
import type { RenderPrintFile } from "@/server/print/types";
import type { CreateOrderInput } from "@/types/order";

const designJson = readFileSync(
  join(process.cwd(), "tests/fixtures/design-mug.json"),
);
const PNG = new Uint8Array([137, 80, 78, 71]);

const input = (designIds: string[]): CreateOrderInput => ({
  checkoutId: `chk-${designIds.join("-")}`,
  customer: {
    fullName: "Ayesha Khan",
    phone: "+923001234567",
    city: "Lahore",
    addressLine: "House 12, Street 4, Model Town",
  },
  lines: designIds.map((designId) => ({
    productId: "mug",
    colourId: "white",
    quantity: 1,
    designId,
  })),
});

function setup(opts: { render?: RenderPrintFile } = {}) {
  const commerce = createMockCommerce();
  const notes: string[] = [];
  const addOrderNote = vi.fn(async (_id: number, note: string) => {
    notes.push(note);
  });
  const withNotes: CommerceClient = { ...commerce, addOrderNote };
  const setLineFiles = vi.spyOn(withNotes, "setLineFiles");
  const { storage, objects } = createMemoryStorage();
  const render = vi.fn<RenderPrintFile>(
    opts.render ??
      (async () => ({ png: PNG, widthPx: 2551, heightPx: 1051, dpi: 300 })),
  );
  const deps: PrepareDeps = {
    commerce: withNotes,
    storage,
    render,
    fileLink: (key, name) => `https://app.test/f/${key}#${name}`,
  };
  return {
    commerce: withNotes,
    storage,
    objects,
    render,
    deps,
    notes,
    setLineFiles,
  };
}

describe("prepareOrderFiles", () => {
  it("renders each line, stores the PNG privately and links it on the order", async () => {
    const t = setup();
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));

    const result = await prepareOrderFiles(order.id, t.deps);

    expect(result.status).toBe("done");
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.objects.get(printFileKey(order.id, 0))?.body).toEqual(PNG);
    const after = await t.commerce.getOrder(order.id);
    expect(after?.lines[0]?.printPngUrl).toBe(
      `https://app.test/f/orders/${order.id}/line-0/print.png#order-${order.id}-line-1-print.png`,
    );
    expect(t.notes).toHaveLength(1);
    expect(t.notes[0]).toContain("Print files ready");
    expect(t.notes[0]).toContain('<a href="https://app.test/f/');
  });

  it("is idempotent: a second run (webhook re-delivery) does nothing", async () => {
    const t = setup();
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    await prepareOrderFiles(order.id, t.deps);
    const again = await prepareOrderFiles(order.id, t.deps);

    expect(again.status).toBe("skipped");
    expect(t.render).toHaveBeenCalledTimes(1);
    expect(t.setLineFiles).toHaveBeenCalledTimes(1);
    expect(t.notes).toHaveLength(1);
  });

  it("skips cancelled and completed orders", async () => {
    const t = setup();
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    await t.commerce.setOrderStatus(order.id, "cancelled");
    expect(await prepareOrderFiles(order.id, t.deps)).toEqual({
      status: "skipped",
      reason: "nothing to do (status cancelled)",
    });
    expect(t.render).not.toHaveBeenCalled();
  });

  it("notes a missing design on the order and still does the other lines", async () => {
    const t = setup();
    await t.storage.put(designKey("d2"), designJson);
    const order = await t.commerce.createOrder(input(["missing", "d2"]));

    const result = await prepareOrderFiles(order.id, t.deps);

    expect(
      result.status === "done" && result.lines.map((l) => l.status),
    ).toEqual(["skipped", "done"]);
    expect(t.notes[0]).toMatch(/design missing not found/);
    expect(t.notes[1]).toContain("Line 2");
    expect(t.notes[1]).not.toContain("Line 1 –");
  });

  it("treats a photo that was never uploaded as permanent", async () => {
    const t = setup({
      render: async (_doc, opts) => {
        await opts?.resolveAsset?.("photo1");
        return { png: PNG, widthPx: 1, heightPx: 1, dpi: 300 };
      },
    });
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    await prepareOrderFiles(order.id, t.deps);
    expect(t.notes[0]).toMatch(/photo photo1 was never uploaded/);

    // Once the photo exists, running again makes the file.
    await t.storage.put(assetKey("d1", "photo1"), new Uint8Array([1]));
    const again = await prepareOrderFiles(order.id, t.deps);
    expect(again.status === "done" && again.lines[0]?.status).toBe("done");
  });

  it("lets temporary errors throw so the queue retries", async () => {
    const t = setup({
      render: async () => {
        throw new Error("socket hang up");
      },
    });
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    await expect(prepareOrderFiles(order.id, t.deps)).rejects.toThrow(
      "socket hang up",
    );
    expect(t.notes).toEqual([]);
  });

  it("keeps the print file when the vendor PDF isn't built yet", async () => {
    const t = setup();
    t.deps.buildProof = async () => {
      throw new Error("buildVendorProof is not implemented yet");
    };
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    const result = await prepareOrderFiles(order.id, t.deps);
    const line = result.status === "done" ? result.lines[0] : undefined;
    expect(line).toMatchObject({
      status: "done",
      proofNote: "proof PDF not available yet",
    });
    expect(t.notes[0]).toContain("(proof PDF not available yet)");
  });

  it("stores and links the vendor PDF when available", async () => {
    const t = setup();
    const buildProof = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
    t.deps.buildProof = buildProof;
    await t.storage.put(designKey("d1"), designJson);
    const order = await t.commerce.createOrder(input(["d1"]));
    await prepareOrderFiles(order.id, t.deps);
    const proofInput = (buildProof.mock.calls[0] as unknown[])[0];
    expect(proofInput).toMatchObject({
      orderId: order.id,
      customerCity: "Lahore",
    });
    // Vendor docs never carry the customer's phone or address.
    expect(JSON.stringify(proofInput)).not.toMatch(/300123|Model Town/);
    const after = await t.commerce.getOrder(order.id);
    expect(after?.lines[0]?.proofPdfUrl).toContain("proof.pdf");
  });
});

describe("filesNote", () => {
  it("returns null when no line produced files", async () => {
    const t = setup();
    const order = await t.commerce.createOrder(input(["d1"]));
    expect(
      filesNote(order, [{ index: 0, status: "skipped", reason: "x" }]),
    ).toBeNull();
  });
});

describe("file links", () => {
  const secret = "s3cret";
  it("round-trips and rejects tampering or expiry", () => {
    const token = signFileToken(
      { k: "orders/1/line-0/print.png", n: "a.png", e: 2000 },
      secret,
    );
    expect(verifyFileToken(token, secret, 1000)).toEqual({
      k: "orders/1/line-0/print.png",
      n: "a.png",
      e: 2000,
    });
    expect(verifyFileToken(token, secret, 2001)).toBeNull();
    expect(verifyFileToken(token, "other", 1000)).toBeNull();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ k: "designs/x/design.json", n: "a.png", e: 2000 }),
    ).toString("base64url");
    expect(verifyFileToken(`${forged}.${sig}`, secret, 1000)).toBeNull();
    expect(verifyFileToken(`${payload}`, secret, 1000)).toBeNull();
    expect(verifyFileToken("garbage", secret, 1000)).toBeNull();
  });

  it("derives the secret and base URL from env", () => {
    expect(fileLinkSecret({ FILES_LINK_SECRET: "x" })).toBe("x");
    expect(fileLinkSecret({ WC_WEBHOOK_SECRET: "w" })).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(fileLinkSecret({ WC_WEBHOOK_SECRET: "w" })).not.toContain("w");
    expect(appBaseUrl({ APP_URL: "https://a.test/" })).toBe("https://a.test");
    expect(
      appBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "giftified.microw.me" }),
    ).toBe("https://giftified.microw.me");
    const url = fileLinkUrl(
      "k",
      "n.png",
      { APP_URL: "https://a.test", FILES_LINK_SECRET: "x" },
      0,
    );
    expect(url).toMatch(/^https:\/\/a\.test\/api\/files\/[\w-]+\.[\w-]+$/);
  });
});

describe("webhook → queue", () => {
  const event = (status: VerifiedWebhook["status"]): VerifiedWebhook => ({
    topic: "order.updated",
    orderId: 42,
    status,
    deliveryId: "d-1",
  });
  const quiet = { info: () => {}, error: vi.fn() };

  it("queues live orders with a per-order dedupe id", async () => {
    const send = vi.fn(async () => undefined);
    const sink = createOrderFilesSink(send, quiet);
    await sink(event("on-hold"));
    await sink(event("processing"));
    await sink(event("cancelled"));
    await sink(event("completed"));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(orderFilesEvent(42, "on-hold"));
    expect(send).toHaveBeenCalledWith(orderFilesEvent(42, "processing"));
    expect(orderFilesEvent(42, "on-hold").id).toBe("order-files-42-on-hold");
    expect(webhookWantsFiles(event("completed"))).toBe(false);
  });

  it("never throws when the queue is down (webhook must still answer 200)", async () => {
    const sink = createOrderFilesSink(async () => {
      throw new Error("401 event key");
    }, quiet);
    await expect(sink(event("on-hold"))).resolves.toBeUndefined();
    expect(quiet.error).toHaveBeenCalled();
  });
});
