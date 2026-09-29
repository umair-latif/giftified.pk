import { describe, expect, it, vi } from "vitest";
import { createResendSender } from "@/lib/email/resend";
import {
  fetchGoogleProfile,
  googleAuthUrl,
  googleConfigFromEnv,
} from "@/server/auth/google";

vi.mock("server-only", () => ({}));
const { createWooCommerceClient, WooCommerceError } =
  await import("@/lib/commerce/woocommerce");

interface Call {
  url: URL;
  init: RequestInit;
}
function client(respond: (c: Call) => Response) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const call = { url: new URL(String(input)), init };
    calls.push(call);
    return respond(call);
  }) as typeof globalThis.fetch;
  return {
    calls,
    woo: createWooCommerceClient({
      url: "https://shop.test/",
      consumerKey: "ck",
      consumerSecret: "cs",
      webhookSecret: "wh",
      fetch,
    }),
  };
}
const wooCustomer = {
  id: 12,
  email: "Ayesha@Example.pk",
  first_name: "Ayesha",
  last_name: "Khan",
  date_modified_gmt: "2026-09-29T10:00:00",
};

describe("WooCommerce customers", () => {
  it("finds a customer by exact email", async () => {
    const { woo, calls } = client(() =>
      Response.json([
        { ...wooCustomer, id: 1, email: "other@x.pk" },
        wooCustomer,
      ]),
    );
    const c = await woo.findCustomerByEmail(" AYESHA@example.pk ");
    expect(c).toEqual({
      id: 12,
      email: "ayesha@example.pk",
      firstName: "Ayesha",
      lastName: "Khan",
      modifiedAt: "2026-09-29T10:00:00",
    });
    expect(calls[0]!.url.pathname).toBe("/wp-json/wc/v3/customers");
    expect(calls[0]!.url.searchParams.get("email")).toBe("ayesha@example.pk");
    expect(
      await client(() => Response.json([])).woo.findCustomerByEmail("a@b.pk"),
    ).toBeNull();
  });

  it("creates a customer with a password; null when the email exists", async () => {
    const ok = client(() => Response.json(wooCustomer, { status: 201 }));
    await ok.woo.createCustomer({
      email: "ayesha@example.pk",
      firstName: "Ayesha",
      lastName: "Khan",
      password: "pw-pw-pw-pw",
    });
    expect(JSON.parse(String(ok.calls[0]!.init.body))).toEqual({
      email: "ayesha@example.pk",
      first_name: "Ayesha",
      last_name: "Khan",
      password: "pw-pw-pw-pw",
    });
    const taken = client(() =>
      Response.json(
        { code: "registration-error-email-exists", message: "x" },
        { status: 400 },
      ),
    );
    expect(
      await taken.woo.createCustomer({
        email: "a@b.pk",
        firstName: "A",
        lastName: "",
        password: "pw-pw-pw-pw",
      }),
    ).toBeNull();
    const broken = client(() =>
      Response.json({ code: "boom" }, { status: 500 }),
    );
    await expect(
      broken.woo.createCustomer({
        email: "a@b.pk",
        firstName: "A",
        lastName: "",
        password: "pw-pw-pw-pw",
      }),
    ).rejects.toBeInstanceOf(WooCommerceError);
  });

  it("checks the password through the JWT plugin and forwards the client IP", async () => {
    const { woo, calls } = client((c) =>
      c.url.pathname === "/wp-json/jwt-auth/v1/token"
        ? Response.json({ token: "jwt" })
        : Response.json([wooCustomer]),
    );
    const c = await woo.verifyCustomerPassword(
      "ayesha@example.pk",
      "pw",
      "5.6.7.8",
    );
    expect(c?.id).toBe(12);
    const jwt = calls[0]!;
    expect(jwt.init.method).toBe("POST");
    expect(JSON.parse(String(jwt.init.body))).toEqual({
      username: "ayesha@example.pk",
      password: "pw",
    });
    expect(
      (jwt.init.headers as Record<string, string>)["X-Forwarded-For"],
    ).toBe("5.6.7.8");
    // The customer keys are never sent to the sign-in endpoint.
    expect(
      (jwt.init.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("treats a missing JWT secret as a setup error, not a wrong password", async () => {
    const bad = client(() =>
      Response.json({ code: "jwt_auth_bad_config" }, { status: 403 }),
    );
    await expect(bad.woo.verifyCustomerPassword("a@b.pk", "x")).rejects.toThrow(
      /JWT_AUTH_SECRET_KEY/,
    );
  });

  it("returns null for wrong credentials and throws when the plugin is missing", async () => {
    const wrong = client(() =>
      Response.json({ code: "incorrect_password" }, { status: 403 }),
    );
    expect(await wrong.woo.verifyCustomerPassword("a@b.pk", "x")).toBeNull();
    const missing = client(() =>
      Response.json({ code: "rest_no_route" }, { status: 404 }),
    );
    await expect(
      missing.woo.verifyCustomerPassword("a@b.pk", "x"),
    ).rejects.toThrow(/JWT/);
  });

  it("gets a customer (null on 404) and sets a password", async () => {
    expect(
      (await client(() => Response.json(wooCustomer)).woo.getCustomer(12))?.id,
    ).toBe(12);
    expect(
      await client(() => Response.json({}, { status: 404 })).woo.getCustomer(
        99,
      ),
    ).toBeNull();
    const put = client(() => Response.json(wooCustomer));
    await put.woo.setCustomerPassword(12, "new-new-new");
    expect(put.calls[0]!.init.method).toBe("PUT");
    expect(put.calls[0]!.url.pathname).toBe("/wp-json/wc/v3/customers/12");
    expect(JSON.parse(String(put.calls[0]!.init.body))).toEqual({
      password: "new-new-new",
    });
  });
});

describe("Resend sender", () => {
  it("posts the message with the API key and fails loudly on errors", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const send = (status: number) =>
      createResendSender({
        apiKey: "re_key",
        from: "Giftified.pk <hello@giftified.pk>",
        fetch: (async (url: string, init: RequestInit) => {
          calls.push({ url, init });
          return new Response("nope", { status });
        }) as unknown as typeof fetch,
      });
    await send(200).send({ to: "a@b.pk", subject: "Hi", text: "Body" });
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(
      (calls[0]!.init.headers as Record<string, string>).Authorization,
    ).toBe("Bearer re_key");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      from: "Giftified.pk <hello@giftified.pk>",
      to: ["a@b.pk"],
      subject: "Hi",
      text: "Body",
    });
    await expect(
      send(422).send({ to: "a@b.pk", subject: "Hi", text: "B" }),
    ).rejects.toThrow(/422/);
  });
});

describe("Google sign-in helpers", () => {
  const config = { clientId: "cid", clientSecret: "csec" };
  it("reads the config only when both values are set", () => {
    expect(googleConfigFromEnv({})).toBeNull();
    expect(googleConfigFromEnv({ GOOGLE_CLIENT_ID: "a" })).toBeNull();
    expect(
      googleConfigFromEnv({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" }),
    ).toEqual({ clientId: "a", clientSecret: "b" });
  });
  it("builds the authorization URL with state and the callback", () => {
    const u = new URL(
      googleAuthUrl(config, "https://shop.test/api/auth/google/callback", "st"),
    );
    expect(u.origin + u.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      client_id: "cid",
      redirect_uri: "https://shop.test/api/auth/google/callback",
      response_type: "code",
      state: "st",
    });
    expect(u.searchParams.get("scope")).toContain("email");
  });
  const exchange = (profile: unknown, tokenStatus = 200) =>
    fetchGoogleProfile(config, "https://x/cb", "code", (async (url: string) =>
      url.includes("token")
        ? Response.json({ access_token: "at" }, { status: tokenStatus })
        : Response.json(profile)) as unknown as typeof fetch);
  it("returns a lower-cased verified email and name", async () => {
    expect(
      await exchange({
        email: "Sara@Example.PK",
        email_verified: true,
        name: "Sara Ali",
      }),
    ).toEqual({ email: "sara@example.pk", name: "Sara Ali" });
  });
  it("refuses unverified emails and failed exchanges", async () => {
    expect(
      await exchange({ email: "a@b.pk", email_verified: false }),
    ).toBeNull();
    expect(await exchange({ email: "a@b.pk" })).toBeNull();
    expect(
      await exchange({ email: "a@b.pk", email_verified: true }, 400),
    ).toBeNull();
  });
});

describe("WooCommerce customer address", () => {
  it("reads a saved billing phone and address, and none when empty", async () => {
    const withAddr = client(() =>
      Response.json({
        ...wooCustomer,
        billing: {
          phone: "03001234567",
          address_1: "House 12",
          address_2: "Near GT Road",
          city: "Gujrat",
        },
      }),
    );
    expect(await withAddr.woo.getCustomer(12)).toMatchObject({
      phone: "03001234567",
      address: {
        city: "Gujrat",
        addressLine: "House 12",
        landmark: "Near GT Road",
      },
    });
    const empty = client(() =>
      Response.json({
        ...wooCustomer,
        billing: { phone: "", address_1: "", address_2: "", city: "" },
      }),
    );
    const c = await empty.woo.getCustomer(12);
    expect(c?.address).toBeUndefined();
    expect(c?.phone).toBeUndefined();
  });

  it("saves phone and address as WooCommerce billing", async () => {
    const put = client(() => Response.json(wooCustomer));
    await put.woo.updateCustomerProfile(12, {
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12",
    });
    expect(put.calls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(String(put.calls[0]!.init.body))).toEqual({
      billing: {
        phone: "+923001234567",
        address_1: "House 12",
        address_2: "",
        city: "Lahore",
        country: "PK",
      },
    });
  });
});
