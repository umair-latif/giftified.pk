import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const cookies = await import("@/server/auth/cookies");
const { saveProfileAction, saveAddressAction } =
  await import("@/features/account/actions");
const { getCommerce } = await import("@/lib/commerce");

async function customer() {
  return (await getCommerce().createCustomer({
    email: `act-${Math.random()}@example.pk`,
    firstName: "Sara",
    lastName: "Ali",
    password: "pw-pw-pw-pw",
  }))!;
}
const form = (v: Record<string, string>) => {
  const f = new FormData();
  for (const [k, x] of Object.entries(v)) f.set(k, x);
  return f;
};

describe("account form actions (task 21)", () => {
  it("saves the marketing preference and says so", async () => {
    const c = await customer();
    vi.spyOn(cookies, "getSessionCustomerId").mockResolvedValue(c.id);
    const r = await saveProfileAction(
      { status: "idle" },
      form({ firstName: "Sara", lastName: "Ali", marketingOptIn: "on" }),
    );
    expect(r.status).toBe("saved");
    expect((await getCommerce().getCustomer(c.id))?.marketingOptIn).toBe(true);
  });

  it("never says Saved when the store didn't keep the change", async () => {
    const c = await customer();
    vi.spyOn(cookies, "getSessionCustomerId").mockResolvedValue(c.id);
    // A store that accepts the write but drops it (what we saw on staging).
    vi.spyOn(getCommerce(), "updateCustomerAccount").mockResolvedValueOnce();
    const r = await saveProfileAction(
      { status: "idle" },
      form({ firstName: "Sara", lastName: "Ali", marketingOptIn: "on" }),
    );
    expect(r.status).toBe("error");
    expect(r.message).toMatch(/couldn't save/);

    vi.spyOn(getCommerce(), "updateCustomerProfile").mockResolvedValueOnce();
    const a = await saveAddressAction(
      { status: "idle" },
      form({
        phone: "0300 1234567",
        city: "Lahore",
        addressLine: "House 12, Street 4, Model Town",
        landmark: "Near the mosque",
      }),
    );
    expect(a.status).toBe("error");
  });
});
