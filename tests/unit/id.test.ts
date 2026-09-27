import { afterEach, describe, expect, it } from "vitest";
import { newId } from "@/lib/id";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(globalThis.crypto),
  "randomUUID",
);

describe("newId", () => {
  afterEach(() => {
    delete (globalThis.crypto as { randomUUID?: unknown }).randomUUID; // remove own override
    if (original)
      Object.defineProperty(
        Object.getPrototypeOf(globalThis.crypto),
        "randomUUID",
        original,
      );
  });

  it("returns a v4 UUID", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("works without crypto.randomUUID (plain-HTTP pages)", () => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
    expect(globalThis.crypto.randomUUID).toBeUndefined();
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
