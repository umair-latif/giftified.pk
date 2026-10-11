import { describe, expect, it, vi } from "vitest";
import { createMockEmail } from "@/lib/email/mock";
import { printFileKey, proofFileKey } from "@/lib/storage/keys";
import { createMemoryStorage } from "@/lib/storage/memory";
import { vendorsFromEnv, waDigits } from "@/server/vendors/config";
import {
  handoffEmail,
  signSendToken,
  splitByVendor,
  vendorMessage,
  verifySendToken,
  whatsappUrl,
} from "@/server/vendors/handoff";
import {
  MAX_ATTACH_BYTES,
  emailHandoff,
  loadSend,
  sendToVendor,
  type VendorDeps,
} from "@/server/vendors/send";
import type { Order, OrderStatus } from "@/types/order";

const order = (status: OrderStatus = "processing"): Order => ({
  id: 1234,
  status,
  createdAt: "2026-10-11T10:00:00Z",
  customer: {
    fullName: "Ayesha Khan",
    phone: "+923001234567",
    city: "Lahore",
    addressLine: "House 5, Street 9, DHA",
  },
  lines: [
    {
      productId: "mug",
      colourId: "white",
      quantity: 2,
      designId: "d-mug",
      unitPricePkr: 1499,
      printPngUrl: "https://a.test/api/files/png1",
      proofPdfUrl: "https://a.test/api/files/pdf1",
    },
    {
      productId: "tshirt",
      colourId: "black",
      size: "L",
      quantity: 1,
      designId: "d-tee",
      unitPricePkr: 1999,
      printPngUrl: "https://a.test/api/files/png2",
    },
  ],
  shippingPkr: 200,
  totalPkr: 5197,
  paymentMethod: "cod",
});

const vendors = vendorsFromEnv({
  VENDOR_MUGS_NAME: "Gujrat Mugs",
  VENDOR_MUGS_EMAIL: "mugs@vendor.test",
  VENDOR_MUGS_WHATSAPP: "0300 1112233",
  VENDOR_APPAREL_NAME: "Sialkot DTF",
});

function deps(o: Order | null = order()) {
  const { storage } = createMemoryStorage("/x");
  const email = createMockEmail();
  const notes: string[] = [];
  const d: VendorDeps = {
    commerce: {
      getOrder: async () => o,
      addOrderNote: async (_id, note) => void notes.push(note),
    },
    storage,
    email,
    vendors,
    test: false,
    now: () => Date.parse("2026-10-11T12:00:00Z"),
  };
  return { d, email, notes, storage };
}

describe("vendor config", () => {
  it("reads contacts from env; numbers become wa.me digits", () => {
    expect(vendors.map((v) => [v.id, v.name, v.email, v.whatsapp])).toEqual([
      ["mugs", "Gujrat Mugs", "mugs@vendor.test", "923001112233"],
      ["apparel", "Sialkot DTF", undefined, undefined],
    ]);
    expect(waDigits("+92 300 1112233")).toBe("923001112233");
    expect(waDigits("0049 151 2345678")).toBe("491512345678");
    expect(waDigits("call me")).toBeUndefined();
    expect(vendorsFromEnv({})[0]!.name).toBe("Mug printer");
  });
});

describe("vendor hand-off content", () => {
  it("splits an order by vendor", () => {
    const { parts, unassigned } = splitByVendor(order(), vendors);
    expect(
      parts.map((p) => [p.vendor.id, p.lines.map((l) => l.index)]),
    ).toEqual([
      ["mugs", [0]],
      ["apparel", [1]],
    ]);
    expect(unassigned).toEqual([]);
  });

  it("never gives the vendor the customer's name, phone, address or city", () => {
    const o = order();
    const [mugs, apparel] = splitByVendor(o, vendors).parts;
    for (const part of [mugs!, apparel!]) {
      const text = vendorMessage(o, part);
      for (const secret of ["Ayesha", "3001234567", "DHA", "Lahore"])
        expect(text).not.toContain(secret);
    }
    const mugText = vendorMessage(o, mugs!);
    expect(mugText).toContain("order #1234");
    expect(mugText).toContain("Custom Mug · Gloss White · 2 pcs · print");
    expect(mugText).toContain("https://a.test/api/files/png1");
    expect(mugText).not.toContain("T-Shirt");
    expect(vendorMessage(o, apparel!)).toContain("size L");
  });

  it("marks test orders while the site is in preview", () => {
    const o = order();
    const part = splitByVendor(o, vendors).parts[0]!;
    expect(vendorMessage(o, part, { test: true })).toMatch(/^TEST ORDER/);
  });

  it("WhatsApp links go to the vendor when the number is known, else let you pick", () => {
    expect(whatsappUrl("Hi & bye", "923001112233")).toBe(
      "https://wa.me/923001112233?text=Hi%20%26%20bye",
    );
    expect(whatsappUrl("Hi")).toBe("https://wa.me/?text=Hi");
  });

  it("the admin email has a block per vendor and warns about missing files", () => {
    const o = order();
    const { parts, unassigned } = splitByVendor(o, vendors);
    const mail = handoffEmail(o, parts, unassigned, {
      sendUrl: (v) => `https://a.test/vendor-send/${v}`,
      test: true,
      missingFiles: [1],
    });
    expect(mail.subject).toBe("[TEST] Send to vendor: order #1234");
    expect(mail.text).toContain("== Gujrat Mugs ==");
    expect(mail.text).toContain(
      "Email to mugs@vendor.test: https://a.test/vendor-send/mugs",
    );
    expect(mail.text).toContain("== Sialkot DTF ==");
    expect(mail.text).toContain("Email: no address set");
    expect(mail.text).toContain(
      "WhatsApp (pick the contact): https://wa.me/?text=",
    );
    expect(mail.text).toContain("Print files are missing for line(s) 2");
    expect(mail.html).toContain('href="https://wa.me/923001112233?text=');
  });

  it("send links are signed per order + vendor and expire", () => {
    const t = signSendToken({ o: 1234, v: "mugs", e: 2000 }, "s3cret");
    expect(verifySendToken(t, "s3cret", 1000)).toEqual({
      o: 1234,
      v: "mugs",
      e: 2000,
    });
    expect(verifySendToken(t, "s3cret", 3000)).toBeNull();
    expect(verifySendToken(t, "other", 1000)).toBeNull();
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(
      JSON.stringify({ o: 9999, v: "mugs", e: 2000 }),
    ).toString("base64url");
    expect(verifySendToken(`${forged}.${sig}`, "s3cret", 1000)).toBeNull();
    expect(payload).toBeTruthy();
  });
});

describe("vendor hand-off flow", () => {
  it("emails the admin only for confirmed orders", async () => {
    const onHold = deps(order("on-hold"));
    expect(
      await emailHandoff(1234, {
        ...onHold.d,
        to: "admin@x.test",
        sendUrl: () => "u",
      }),
    ).toEqual({ sent: false, reason: "order is on-hold" });
    expect(onHold.email.sent).toHaveLength(0);

    const ok = deps();
    await emailHandoff(1234, {
      ...ok.d,
      to: "admin@x.test",
      sendUrl: () => "u",
    });
    expect(ok.email.sent.map((m) => m.to)).toEqual(["admin@x.test"]);
    expect(ok.notes).toEqual(['"Send to vendor" email sent to admin@x.test.']);
  });

  it("sends the vendor their lines with the files attached, once recorded", async () => {
    const t = deps();
    await t.storage.put(proofFileKey(1234, 0), new Uint8Array([1, 2, 3]), {
      contentType: "application/pdf",
    });
    await t.storage.put(printFileKey(1234, 0), new Uint8Array(10), {
      contentType: "image/png",
    });
    const claims = { o: 1234, v: "mugs", e: 9e9 };
    const r = await sendToVendor(claims, { ...t.d, replyTo: "admin@x.test" });
    expect(r.ok).toBe(true);
    const mail = t.email.sent[0]!;
    expect(mail.to).toBe("mugs@vendor.test");
    expect(mail.replyTo).toBe("admin@x.test");
    expect(mail.subject).toBe("DesignBanana order #1234: 2 × Custom Mug");
    expect(mail.attachments?.map((a) => a.filename)).toEqual([
      "order-1234-line-1-proof.pdf",
      "order-1234-line-1-print.png",
    ]);
    expect(mail.text).toContain("The print files are attached");
    expect(t.notes[0]).toMatch(
      /^Sent to Gujrat Mugs \(mugs@vendor\.test\) by email: line\(s\) 1, 2 file\(s\) attached\.$/,
    );

    const page = await loadSend(claims, t.d);
    expect(page.ok && page.sent?.to).toBe("mugs@vendor.test");
  });

  it("files too big to attach go as links only", async () => {
    const t = deps();
    await t.storage.put(
      printFileKey(1234, 0),
      new Uint8Array(MAX_ATTACH_BYTES + 1),
      {
        contentType: "image/png",
      },
    );
    await sendToVendor({ o: 1234, v: "mugs", e: 9e9 }, t.d);
    expect(t.email.sent[0]!.attachments).toEqual([]);
    expect(t.email.sent[0]!.text).toContain(
      "Download the files from the links above",
    );
    expect(t.notes[0]).toContain(
      "too big to attach (link only): order-1234-line-1-print.png",
    );
  });

  it("refuses unconfirmed orders and vendors without an email", async () => {
    const pending = deps(order("on-hold"));
    const r = await sendToVendor({ o: 1234, v: "mugs", e: 9e9 }, pending.d);
    expect(r).toEqual({
      ok: false,
      message: expect.stringContaining("Only orders set to Processing"),
    });
    const t = deps();
    expect(await sendToVendor({ o: 1234, v: "apparel", e: 9e9 }, t.d)).toEqual({
      ok: false,
      message: "No email address is set for Sialkot DTF.",
    });
    expect(t.email.sent).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
