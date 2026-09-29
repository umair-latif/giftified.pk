import { describe, expect, it } from "vitest";
import { authSecret } from "@/server/auth/secret";
import {
  verifyResetToken,
  signResetToken,
  RESET_TTL_S,
} from "@/server/auth/reset-token";
import { safeNextPath } from "@/server/auth/safe-next";
import {
  signSession,
  verifySession,
  SESSION_TTL_S,
} from "@/server/auth/session";
import { signToken, verifyToken } from "@/server/auth/token";

const secret = "test-secret";
const NOW = 1_800_000_000;

describe("signed tokens", () => {
  it("round-trips and rejects tampering, wrong secret and expiry", () => {
    const t = signToken("p", { x: 1, e: NOW + 60 }, secret);
    expect(verifyToken("p", t, secret, NOW)?.x).toBe(1);
    expect(verifyToken("p", t, "other", NOW)).toBeNull();
    expect(verifyToken("p", t, secret, NOW + 61)).toBeNull();
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ x: 2, e: NOW + 60 })).toString(
      "base64url",
    );
    expect(verifyToken("p", `${forged}.${sig}`, secret, NOW)).toBeNull();
    expect(verifyToken("p", `${payload}.${sig}.x`, secret, NOW)).toBeNull();
    expect(verifyToken("p", "garbage", secret, NOW)).toBeNull();
    expect(verifyToken("p", t, "", NOW)).toBeNull();
  });

  it("a token for one purpose is useless for another", () => {
    const s = signSession(7, secret, NOW);
    expect(verifySession(s, secret, NOW)).toBe(7);
    expect(verifyResetToken(s, secret, NOW)).toBeNull();
    const r = signResetToken({ customerId: 7, modifiedAt: "m" }, secret, NOW);
    expect(verifySession(r, secret, NOW)).toBeNull();
  });
});

describe("session", () => {
  it("lasts 30 days", () => {
    const s = signSession(3, secret, NOW);
    expect(verifySession(s, secret, NOW + SESSION_TTL_S - 1)).toBe(3);
    expect(verifySession(s, secret, NOW + SESSION_TTL_S + 1)).toBeNull();
    expect(verifySession(undefined, secret, NOW)).toBeNull();
  });
  it("rejects a non-positive customer id", () => {
    expect(
      verifySession(
        signToken("session", { c: 0, e: NOW + 5 }, secret),
        secret,
        NOW,
      ),
    ).toBeNull();
    expect(
      verifySession(
        signToken("session", { c: "7", e: NOW + 5 }, secret),
        secret,
        NOW,
      ),
    ).toBeNull();
  });
});

describe("reset token", () => {
  it("lasts 1 hour and carries the customer + record version", () => {
    const t = signResetToken(
      { customerId: 9, modifiedAt: "2026-01-01T00:00:00" },
      secret,
      NOW,
    );
    expect(verifyResetToken(t, secret, NOW + RESET_TTL_S - 1)).toEqual({
      customerId: 9,
      modifiedAt: "2026-01-01T00:00:00",
    });
    expect(verifyResetToken(t, secret, NOW + RESET_TTL_S + 1)).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/order/5?t=abc")).toBe("/order/5?t=abc");
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil",
    "/a\nb",
    "/sign-in?next=/x",
    "/reset-password",
    42,
    undefined,
    `/${"a".repeat(300)}`,
  ])("falls back for %s", (v) => {
    expect(safeNextPath(v)).toBe("/account");
    expect(safeNextPath(v, "/")).toBe("/");
  });
});

describe("authSecret", () => {
  it("prefers AUTH_SECRET, derives from the webhook secret, refuses to guess in production", () => {
    expect(authSecret({ AUTH_SECRET: "a", WC_WEBHOOK_SECRET: "w" })).toBe("a");
    const derived = authSecret({ WC_WEBHOOK_SECRET: "w" });
    expect(derived).toMatch(/^[0-9a-f]{64}$/);
    expect(derived).not.toBe(authSecret({ WC_WEBHOOK_SECRET: "w2" }));
    expect(authSecret({ NODE_ENV: "production" })).toBe("");
    expect(authSecret({ NODE_ENV: "production", COMMERCE_MOCK: "1" })).not.toBe(
      "",
    );
    expect(authSecret({ NODE_ENV: "development" })).not.toBe("");
  });
});
