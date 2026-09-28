import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import { getProduct } from "@/config/products";
import { normalizePkMobile } from "@/lib/phone";
import type { CreateOrderInput } from "@/types/order";

/**
 * Server-side validation of the checkout form. Never trusted from the client:
 * prices are not part of the input at all — the store prices the order.
 * Messages are plain language because they are shown to the customer as-is.
 */
export const MAX_QUANTITY = 10;

const text = (min: number, max: number, tooShort: string, tooLong: string) =>
  z
    .string(tooShort)
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(min, tooShort).max(max, tooLong));

export const checkoutSchema = z
  .object({
    checkoutId: z
      .string()
      .regex(/^[\w-]{8,64}$/, "Something went wrong. Please reload the page."),
    productId: z.string(),
    colourId: z.string(),
    quantity: z.coerce
      .number("Choose how many you want.")
      .int("Choose how many you want.")
      .min(1, "Choose at least 1.")
      .max(MAX_QUANTITY, `You can order up to ${MAX_QUANTITY} at a time.`),
    fullName: text(
      2,
      80,
      "Please write your full name.",
      "That name is too long.",
    ),
    phone: z.string("Please write your mobile number.").transform((v, ctx) => {
      const phone = normalizePkMobile(v);
      if (phone) return phone;
      ctx.addIssue({
        code: "custom",
        message:
          v.trim() === ""
            ? "Please write your mobile number."
            : "Please write a Pakistani mobile number, like 0300 1234567.",
      });
      return z.NEVER;
    }),
    city: text(
      2,
      60,
      "Please choose your city.",
      "That city name is too long.",
    ).transform(canonicalCity),
    addressLine: text(
      8,
      200,
      "Please write your full address — house number, street and area.",
      "That address is too long. Put extra details in Landmark.",
    ),
    landmark: z
      .string()
      .optional()
      .transform((s) => s?.trim().replace(/\s+/g, " ") || undefined)
      .pipe(z.string().max(120, "Please keep the landmark short.").optional()),
  })
  .superRefine((v, ctx) => {
    const product = getProduct(v.productId);
    if (!product || !product.baseColors.some((c) => c.id === v.colourId))
      ctx.addIssue({
        code: "custom",
        path: ["productId"],
        message: "This product can’t be ordered right now.",
      });
  });

export type CheckoutFields = z.input<typeof checkoutSchema>;
export type CheckoutFieldName = keyof CheckoutFields;
export type FieldErrors = Partial<Record<CheckoutFieldName, string>>;

/** Placeholder until designs are uploaded to storage (later task). */
export const LOCAL_DESIGN_ID = "draft-local";

export type ParsedCheckout =
  { ok: true; order: CreateOrderInput } | { ok: false; errors: FieldErrors };

/** Validates raw form input and maps it to the commerce contract. */
export function parseCheckout(input: unknown): ParsedCheckout {
  const r = checkoutSchema.safeParse(input);
  if (!r.success) {
    const errors: FieldErrors = {};
    for (const issue of r.error.issues) {
      const field = (issue.path[0] ?? "productId") as CheckoutFieldName;
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const v = r.data;
  return {
    ok: true,
    order: {
      checkoutId: v.checkoutId,
      customer: {
        fullName: v.fullName,
        phone: v.phone,
        city: v.city,
        addressLine: v.addressLine,
        ...(v.landmark ? { landmark: v.landmark } : {}),
      },
      lines: [
        {
          productId:
            v.productId as CreateOrderInput["lines"][number]["productId"],
          colourId: v.colourId,
          quantity: v.quantity,
          designId: LOCAL_DESIGN_ID,
        },
      ],
    },
  };
}
