import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import { getProduct } from "@/config/products";
import { normalizePkMobile } from "@/lib/phone";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/types/cart";
import type { CreateOrderInput } from "@/types/order";

/**
 * Server-side validation of checkout (the whole cart → one order). Never trusted from the client:
 * prices are not part of the input at all — the store prices the order.
 * Messages are plain language because they are shown to the customer as-is.
 */
export const MAX_QUANTITY = MAX_LINE_QUANTITY;
export const DESIGN_NOT_SAVED = "Your design wasn’t saved. Please try again.";

const text = (min: number, max: number, tooShort: string, tooLong: string) =>
  z
    .string(tooShort)
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(min, tooShort).max(max, tooLong));

const designId = z
  .string(DESIGN_NOT_SAVED)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/, DESIGN_NOT_SAVED);

const quantity = z.coerce
  .number("Choose how many you want.")
  .int("Choose how many you want.")
  .min(1, "Choose at least 1.")
  .max(MAX_QUANTITY, `You can order up to ${MAX_QUANTITY} of each design.`);

/** One cart line. Prices are never part of it: the store prices the order. */
const lineSchema = z.object({
  productId: z.string().max(40),
  colourId: z.string().max(40),
  size: z
    .string()
    .max(10)
    .optional()
    .transform((s) => s?.trim() || undefined),
  quantity,
  /** From `uploadCartDesign` (same safe-id rule as storage keys). */
  designId,
});

export const checkoutSchema = z
  .object({
    checkoutId: z
      .string()
      .regex(/^[\w-]{8,64}$/, "Something went wrong. Please reload the page."),
    lines: z
      .array(lineSchema, "Your cart is empty.")
      .min(1, "Your cart is empty.")
      .max(
        MAX_CART_LINES,
        `You can order up to ${MAX_CART_LINES} designs at a time.`,
      ),
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
    /** Optional: for the receipt and order updates. */
    email: z
      .string()
      .optional()
      .transform((s) => s?.trim().toLowerCase() || undefined)
      .pipe(
        z
          .email("Please check your email address, or leave it empty.")
          .max(120, "That email address is too long.")
          .optional(),
      ),
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
    v.lines.forEach((line, i) => {
      const product = getProduct(line.productId);
      if (!product || !product.baseColors.some((c) => c.id === line.colourId))
        ctx.addIssue({
          code: "custom",
          path: ["lines", i],
          message: "An item in your cart can’t be ordered right now.",
        });
    });
  });

export type CheckoutFields = z.input<typeof checkoutSchema>;
export type CheckoutFieldName = keyof CheckoutFields;
export type FieldErrors = Partial<Record<CheckoutFieldName, string>>;

export type ParsedCheckout =
  { ok: true; order: CreateOrderInput } | { ok: false; errors: FieldErrors };

/** Validates raw form input and maps it to the commerce contract. */
export function parseCheckout(input: unknown): ParsedCheckout {
  const r = checkoutSchema.safeParse(input);
  if (!r.success) {
    const errors: FieldErrors = {};
    for (const issue of r.error.issues) {
      const field = (issue.path[0] ?? "lines") as CheckoutFieldName;
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
      ...(v.email ? { email: v.email } : {}),
      lines: v.lines.map((l) => ({
        productId:
          l.productId as CreateOrderInput["lines"][number]["productId"],
        colourId: l.colourId,
        ...(l.size ? { size: l.size } : {}),
        quantity: l.quantity,
        designId: l.designId,
      })),
    },
  };
}
