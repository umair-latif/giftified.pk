import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/features/orders/rate-limit";
import {
  BAD_LINK,
  BAD_LOGIN,
  customerForGoogle,
  requestPasswordReset,
  resetPassword,
  signIn,
  signUp,
  TOO_MANY,
  type AuthDeps,
  type ResetDeps,
} from "@/features/auth/service";
import { createMockCommerce } from "@/lib/commerce/mock";
import { createMockEmail } from "@/lib/email/mock";

const SECRET = "s3cret";
let commerce: ReturnType<typeof createMockCommerce>;
let email: ReturnType<typeof createMockEmail>;
let now: number;

const limiter = (limit: number) =>
  createRateLimiter({ limit, windowMs: 60_000, now: () => now });
const deps = (over: Partial<AuthDeps> = {}): AuthDeps => ({
  commerce,
  ipLimiter: limiter(5),
  emailLimiter: limiter(3),
  clientKey: "1.2.3.4",
  ...over,
});
const resetDeps = (over: Partial<ResetDeps> = {}): ResetDeps => ({
  ...deps(),
  email,
  secret: SECRET,
  baseUrl: "https://shop.test",
  now: () => now,
  ...over,
});
const ayesha = {
  name: "Ayesha Bibi Khan",
  email: "Ayesha@Example.pk",
  password: "correct horse",
};

beforeEach(() => {
  commerce = createMockCommerce();
  email = createMockEmail();
  now = Date.parse("2026-09-29T12:00:00Z");
});

describe("signUp", () => {
  it("creates the customer with a lower-cased email and split name", async () => {
    const r = await signUp(ayesha, deps());
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.customer).toMatchObject({
      email: "ayesha@example.pk",
      firstName: "Ayesha",
      lastName: "Bibi Khan",
    });
    expect(
      await commerce.verifyCustomerPassword(
        "ayesha@example.pk",
        "correct horse",
      ),
    ).not.toBeNull();
  });
  it("validates every field", async () => {
    const r = await signUp(
      { name: " ", email: "nope", password: "short" },
      deps(),
    );
    expect(r).toMatchObject({
      ok: false,
      fieldErrors: {
        name: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
      },
    });
  });
  it("says so when the email already has an account", async () => {
    await signUp(ayesha, deps());
    const r = await signUp({ ...ayesha, email: "AYESHA@example.pk" }, deps());
    expect(r).toMatchObject({
      ok: false,
      fieldErrors: { email: expect.stringContaining("already") },
    });
  });
  it("is rate limited per IP", async () => {
    const d = deps({ ipLimiter: limiter(2) });
    await signUp({ ...ayesha, email: "a1@example.pk" }, d);
    await signUp({ ...ayesha, email: "a2@example.pk" }, d);
    expect(await signUp({ ...ayesha, email: "a3@example.pk" }, d)).toEqual({
      ok: false,
      message: TOO_MANY,
    });
  });
});

describe("signIn", () => {
  beforeEach(async () => void (await signUp(ayesha, deps())));

  it("signs in with any casing of the email", async () => {
    const r = await signIn(
      { email: " AYESHA@example.pk ", password: "correct horse" },
      deps(),
    );
    expect(r.ok).toBe(true);
  });
  it("gives one message for a wrong password and an unknown email", async () => {
    const wrong = await signIn(
      { email: "ayesha@example.pk", password: "nope nope" },
      deps(),
    );
    const unknown = await signIn(
      { email: "who@example.pk", password: "correct horse" },
      deps(),
    );
    expect(wrong).toEqual({ ok: false, message: BAD_LOGIN });
    expect(unknown).toEqual({ ok: false, message: BAD_LOGIN });
  });
  it("locks an email after 3 failures, even from other IPs, and the right password is refused too", async () => {
    const emailLimiter = limiter(3);
    for (let i = 0; i < 3; i++)
      await signIn(
        { email: "ayesha@example.pk", password: "bad" },
        deps({ emailLimiter, clientKey: `ip${i}` }),
      );
    const r = await signIn(
      { email: "ayesha@example.pk", password: "correct horse" },
      deps({ emailLimiter, clientKey: "ip9" }),
    );
    expect(r).toEqual({ ok: false, message: TOO_MANY });
  });
  it("locks an IP after repeated failures but successes don't count", async () => {
    const ipLimiter = limiter(2);
    for (let i = 0; i < 5; i++)
      expect(
        (
          await signIn(
            { email: "ayesha@example.pk", password: "correct horse" },
            deps({ ipLimiter }),
          )
        ).ok,
      ).toBe(true);
    await signIn(
      { email: "x@example.pk", password: "bad" },
      deps({ ipLimiter }),
    );
    await signIn(
      { email: "y@example.pk", password: "bad" },
      deps({ ipLimiter }),
    );
    expect(
      await signIn(
        { email: "ayesha@example.pk", password: "correct horse" },
        deps({ ipLimiter }),
      ),
    ).toEqual({ ok: false, message: TOO_MANY });
  });
  it("passes the client IP on for WordPress' login limiter", async () => {
    const spy = vi.spyOn(commerce, "verifyCustomerPassword");
    await signIn(
      { email: "ayesha@example.pk", password: "correct horse" },
      deps({ clientIp: "9.9.9.9" }),
    );
    expect(spy).toHaveBeenCalledWith(
      "ayesha@example.pk",
      "correct horse",
      "9.9.9.9",
    );
  });
});

describe("password reset", () => {
  beforeEach(async () => void (await signUp(ayesha, deps())));
  const linkOf = (m: { text: string }) =>
    new URL(/https:\/\/\S+/.exec(m.text)![0]);

  it("emails a link that sets a new password, once", async () => {
    expect(
      await requestPasswordReset({ email: "ayesha@example.pk" }, resetDeps()),
    ).toEqual({ ok: true });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({ to: "ayesha@example.pk" });
    const link = linkOf(email.sent[0]!);
    expect(link.origin + link.pathname).toBe(
      "https://shop.test/reset-password",
    );
    const token = link.searchParams.get("token")!;

    const done = await resetPassword(
      { token, password: "brand new pass" },
      { commerce, secret: SECRET, now: () => now },
    );
    expect(done.ok).toBe(true);
    expect(
      await commerce.verifyCustomerPassword(
        "ayesha@example.pk",
        "brand new pass",
      ),
    ).not.toBeNull();
    expect(
      await commerce.verifyCustomerPassword(
        "ayesha@example.pk",
        "correct horse",
      ),
    ).toBeNull();

    // Used once: the record changed, so the same link is now dead.
    expect(
      await resetPassword(
        { token, password: "another one!!" },
        { commerce, secret: SECRET, now: () => now },
      ),
    ).toEqual({ ok: false, message: BAD_LINK });
  });
  it("answers the same and sends nothing for an unknown email", async () => {
    expect(
      await requestPasswordReset({ email: "who@example.pk" }, resetDeps()),
    ).toEqual({ ok: true });
    expect(email.sent).toHaveLength(0);
  });
  it("rejects a bad email format, expired or forged links and weak passwords", async () => {
    expect(
      await requestPasswordReset({ email: "nope" }, resetDeps()),
    ).toMatchObject({ ok: false });
    await requestPasswordReset({ email: "ayesha@example.pk" }, resetDeps());
    const token = linkOf(email.sent[0]!).searchParams.get("token")!;
    const rd = { commerce, secret: SECRET };
    expect(
      await resetPassword(
        { token, password: "brand new pass" },
        { ...rd, now: () => now + 3601_000 },
      ),
    ).toEqual({ ok: false, message: BAD_LINK });
    expect(
      await resetPassword(
        { token: `${token}x`, password: "brand new pass" },
        { ...rd, now: () => now },
      ),
    ).toEqual({ ok: false, message: BAD_LINK });
    expect(
      await resetPassword(
        { token: "", password: "brand new pass" },
        { ...rd, now: () => now },
      ),
    ).toEqual({ ok: false, message: BAD_LINK });
    expect(
      await resetPassword(
        { token, password: "short" },
        { ...rd, now: () => now },
      ),
    ).toMatchObject({
      ok: false,
      fieldErrors: { password: expect.any(String) },
    });
  });
  it("limits reset emails per address and per IP without revealing it", async () => {
    const d = resetDeps({ emailLimiter: limiter(2) });
    for (let i = 0; i < 4; i++)
      expect(
        await requestPasswordReset({ email: "ayesha@example.pk" }, d),
      ).toEqual({ ok: true });
    expect(email.sent).toHaveLength(2);
  });
  it("still answers ok when the email provider fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = {
      send: async () => {
        throw new Error("resend down");
      },
    };
    expect(
      await requestPasswordReset(
        { email: "ayesha@example.pk" },
        resetDeps({ email: failing }),
      ),
    ).toEqual({ ok: true });
    err.mockRestore();
  });
});

describe("customerForGoogle", () => {
  it("creates an account for a new email and reuses it for the same email later", async () => {
    const a = await customerForGoogle(
      { email: "sara@example.pk", name: "Sara Ali" },
      commerce,
    );
    const b = await customerForGoogle(
      { email: "sara@example.pk", name: "Sara Ali" },
      commerce,
    );
    expect(b.id).toBe(a.id);
    expect(a).toMatchObject({ firstName: "Sara", lastName: "Ali" });
  });
  it("is the same account as an email + password sign-up", async () => {
    const signedUp = await signUp(ayesha, deps());
    if (!signedUp.ok) throw new Error("setup");
    const g = await customerForGoogle(
      { email: "ayesha@example.pk", name: "A" },
      commerce,
    );
    expect(g.id).toBe(signedUp.customer.id);
  });
});
