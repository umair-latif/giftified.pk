import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import { normalizePkMobile } from "@/lib/phone";

/**
 * Validation for /account/addresses and /account/profile (task 21). Same
 * rules and wording as checkout, so a saved address always passes checkout.
 */
const text = (min: number, max: number, tooShort: string, tooLong: string) =>
  z
    .string(tooShort)
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(min, tooShort).max(max, tooLong));

export const addressSchema = z.object({
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
});

export const profileSchema = z.object({
  firstName: text(1, 40, "Please write your name.", "That name is too long."),
  lastName: z
    .string()
    .optional()
    .transform((s) => s?.trim().replace(/\s+/g, " ") ?? "")
    .pipe(z.string().max(40, "That name is too long.")),
  marketingOptIn: z.boolean(),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "form");
    out[k] ??= issue.message;
  }
  return out;
}

/** State returned by the account forms' Server Actions. */
export interface FormState {
  status: "idle" | "saved" | "error" | "sent";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
}

export const DELETE_CONFIRM_WORD = "DELETE";
