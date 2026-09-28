import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/features/orders/rate-limit";
import {
  clientKeyFromHeaders,
  NOT_FOUND_MESSAGE,
  parseOrderNumber,
  TOO_MANY_MESSAGE,
  TRACK_FAILURE_MIN_MS,
  TRACK_LIMIT,
  TRACK_WINDOW_MS,
  trackOrder,
  UNAVAILABLE_MESSAGE,
  type TrackDeps,
} from "@/features/orders/track";
import { createMockCommerce } from "@/lib/commerce/mock";

async function setup() {
  const commerce = createMockCommerce();
  const order = await commerce.createOrder({
    checkoutId: "chk-track",
    customer: {
      fullName: "Ayesha Khan",
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12",
    },
    lines: [
      { productId: "mug", colourId: "white", quantity: 1, designId: "d1" },
    ],
  });
  let clock = 0;
  const slept: number[] = [];
  const limiter = createRateLimiter({
    limit: TRACK_LIMIT,
    windowMs: TRACK_WINDOW_MS,
    now: () => clock,
  });
  const deps: TrackDeps = {
    commerce,
    limiter,
    clientKey: "203.0.113.7",
    now: () => clock,
    sleep: async (ms) => {
      slept.push(ms);
      clock += ms;
    },
  };
  return {
    commerce,
    order,
    deps,
    slept,
    advance: (ms: number) => (clock += ms),
  };
}

describe("parseOrderNumber", () => {
  it("accepts plain and #-prefixed numbers only", () => {
    expect(parseOrderNumber(" #1234 ")).toBe(1234);
    expect(parseOrderNumber("1001")).toBe(1001);
    for (const bad of ["", "abc", "12a", "-1", "1.5", "1".repeat(13), null])
      expect(parseOrderNumber(bad)).toBeNull();
  });
});

describe("trackOrder (/track)", () => {
  it("finds the order with the right number and phone (any common format)", async () => {
    const { order, deps } = await setup();
    for (const phone of ["0300 1234567", "+92 300 1234567", "3001234567"]) {
      const r = await trackOrder({ orderNumber: `#${order.id}`, phone }, deps);
      expect(r).toEqual({
        ok: true,
        order: expect.objectContaining({ id: order.id }),
      });
    }
  });

  it("gives the SAME answer, after the same minimum delay, for a wrong phone and a missing order", async () => {
    const { order, deps, slept } = await setup();
    const wrongPhone = await trackOrder(
      { orderNumber: String(order.id), phone: "0300 7654321" },
      deps,
    );
    const noOrder = await trackOrder(
      { orderNumber: "99999", phone: "0300 1234567" },
      deps,
    );
    expect(wrongPhone).toEqual({ ok: false, message: NOT_FOUND_MESSAGE });
    expect(noOrder).toEqual(wrongPhone);
    expect(slept).toEqual([TRACK_FAILURE_MIN_MS, TRACK_FAILURE_MIN_MS]);
  });

  it("only pads the delay up to the minimum when the lookup was already slow", async () => {
    const { deps, slept, advance } = await setup();
    const slow: TrackDeps = {
      ...deps,
      commerce: {
        findOrderForTracking: async () => {
          advance(700);
          return null;
        },
      },
    };
    await trackOrder({ orderNumber: "1", phone: "03001234567" }, slow);
    expect(slept).toEqual([TRACK_FAILURE_MIN_MS - 700]);
  });

  it("rate-limits failed lookups per IP: the 11th try within an hour is refused without asking the store", async () => {
    const { commerce, order, deps, advance } = await setup();
    const lookup = vi.spyOn(commerce, "findOrderForTracking");
    for (let i = 0; i < TRACK_LIMIT; i++)
      expect(
        await trackOrder(
          { orderNumber: String(i + 1), phone: "03001234567" },
          deps,
        ),
      ).toEqual({ ok: false, message: NOT_FOUND_MESSAGE });
    expect(lookup).toHaveBeenCalledTimes(TRACK_LIMIT);

    // Even the correct pair is refused now, and the store isn't asked.
    const limited = await trackOrder(
      { orderNumber: String(order.id), phone: "03001234567" },
      deps,
    );
    expect(limited).toEqual({ ok: false, message: TOO_MANY_MESSAGE });
    expect(lookup).toHaveBeenCalledTimes(TRACK_LIMIT);

    // Another IP is not affected.
    expect(
      (
        await trackOrder(
          { orderNumber: String(order.id), phone: "03001234567" },
          { ...deps, clientKey: "198.51.100.1" },
        )
      ).ok,
    ).toBe(true);

    // After the window the IP can try again.
    advance(TRACK_WINDOW_MS);
    expect(
      (
        await trackOrder(
          { orderNumber: String(order.id), phone: "03001234567" },
          deps,
        )
      ).ok,
    ).toBe(true);
  });

  it("successful lookups and form mistakes don't use up tries", async () => {
    const { order, deps } = await setup();
    for (let i = 0; i < TRACK_LIMIT + 5; i++) {
      await trackOrder(
        { orderNumber: String(order.id), phone: "03001234567" },
        deps,
      );
      await trackOrder({ orderNumber: "abc", phone: "042 35761234" }, deps);
    }
    expect(deps.limiter.remaining(deps.clientKey)).toBe(TRACK_LIMIT);
  });

  it("reports form mistakes per field without looking anything up", async () => {
    const { commerce, deps } = await setup();
    const lookup = vi.spyOn(commerce, "findOrderForTracking");
    const r = await trackOrder(
      { orderNumber: "abc", phone: "042 35761234" },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors?.orderNumber).toMatch(/order number/);
      expect(r.fieldErrors?.phone).toMatch(/mobile number/);
      expect(r.message).toBeUndefined();
    }
    expect(
      await trackOrder({ orderNumber: 5, phone: "0".repeat(31) }, deps),
    ).toMatchObject({ ok: false, fieldErrors: expect.any(Object) });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("store errors give a neutral 'try again' message", async () => {
    const { deps } = await setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await trackOrder(
      { orderNumber: "1", phone: "03001234567" },
      {
        ...deps,
        commerce: {
          findOrderForTracking: () => Promise.reject(new Error("WC down")),
        },
      },
    );
    expect(r).toEqual({ ok: false, message: UNAVAILABLE_MESSAGE });
  });
});

describe("clientKeyFromHeaders", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(
      clientKeyFromHeaders(
        new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }),
      ),
    ).toBe("1.1.1.1");
    expect(
      clientKeyFromHeaders(
        new Headers({ "x-forwarded-for": " 2.2.2.2 , 10.0.0.1" }),
      ),
    ).toBe("2.2.2.2");
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("rate limiter", () => {
  it("counts per key in a fixed window", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 100, now: () => t });
    expect(rl.isLimited("a")).toBe(false);
    rl.hit("a");
    rl.hit("a");
    expect(rl.isLimited("a")).toBe(true);
    expect(rl.remaining("a")).toBe(0);
    expect(rl.isLimited("b")).toBe(false);
    t = 99;
    expect(rl.isLimited("a")).toBe(true);
    t = 100;
    expect(rl.isLimited("a")).toBe(false);
    expect(rl.remaining("a")).toBe(2);
  });

  it("never tracks more than maxKeys keys", () => {
    const t = 0;
    const rl = createRateLimiter({
      limit: 1,
      windowMs: 1000,
      maxKeys: 3,
      now: () => t,
    });
    for (const k of ["a", "b", "c", "d"]) rl.hit(k);
    // Oldest key was dropped to make room; the newest are still counted.
    expect(rl.isLimited("a")).toBe(false);
    expect(rl.isLimited("d")).toBe(true);
    expect(rl.isLimited("c")).toBe(true);
  });
});
