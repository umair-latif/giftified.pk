import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCommerce, type MockCommerce } from "@/lib/commerce/mock";
import { createMockEmail } from "@/lib/email/mock";
import { createMemoryStorage } from "@/lib/storage/memory";

vi.mock("server-only", () => ({}));
const { sendReviewRequest } = await import("@/server/reviews/request");

let commerce: MockCommerce;
const email = createMockEmail();
const notes: string[] = [];
const storage = () => createMemoryStorage().storage;

async function order(opts: { email?: string; complete?: boolean }) {
  const o = await commerce.createOrder({
    checkoutId: `chk-${Math.random()}`,
    customer: {
      fullName: "Ayesha Khan",
      phone: "+923001234567",
      city: "Gujrat",
      addressLine: "House 12",
    },
    ...(opts.email ? { email: opts.email } : {}),
    lines: [
      { productId: "mug", colourId: "white", quantity: 1, designId: "d1" },
    ],
  });
  if (opts.complete !== false) await commerce.setOrderStatus(o.id, "completed");
  return o.id;
}
const deps = (s = storage()) => ({
  commerce: {
    getOrder: (id: number) => commerce.getOrder(id),
    addOrderNote: async (_id: number, n: string) => {
      notes.push(n);
    },
  },
  storage: s,
  email,
  env: { APP_URL: "https://shop.test" },
  now: () => 0,
});

beforeEach(() => {
  commerce = createMockCommerce();
  email.sent.length = 0;
  notes.length = 0;
});

describe("sendReviewRequest", () => {
  it("emails the private order link once and notes it on the order", async () => {
    const id = await order({ email: "a@example.com" });
    const d = deps();
    expect(await sendReviewRequest(id, d)).toBe("sent");
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.to).toBe("a@example.com");
    expect(email.sent[0]!.text).toMatch(
      new RegExp(`https://shop.test/order/${id}\\?t=`),
    );
    expect(notes[0]).toContain("Review link:");
    expect(await sendReviewRequest(id, d)).toBe("already-handled");
    expect(email.sent).toHaveLength(1);
  });

  it("puts the link in an order note when there is no email", async () => {
    const id = await order({});
    expect(await sendReviewRequest(id, deps())).toBe("noted");
    expect(email.sent).toHaveLength(0);
    expect(notes[0]).toContain("No customer email");
    expect(notes[0]).toContain(`/order/${id}?t=`);
  });

  it("does nothing for an order that isn't completed", async () => {
    const id = await order({ email: "a@example.com", complete: false });
    expect(await sendReviewRequest(id, deps())).toBe("skipped");
    expect(email.sent).toHaveLength(0);
  });

  it("notes the link when the email can't be sent, then fails for a retry log", async () => {
    const id = await order({ email: "a@example.com" });
    const d = {
      ...deps(),
      email: {
        send: async () => {
          throw new Error("smtp down");
        },
      },
    };
    await expect(sendReviewRequest(id, d)).rejects.toThrow("smtp down");
    expect(notes[0]).toContain("Review request email failed");
  });
});
