import { z } from "zod";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email("Enter a valid email address.")
      .max(254, "That email address is too long."),
  );

const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`);

const name = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(80, "That name is too long.");

export const signUpSchema = z.object({ name, email, password });
export const signInSchema = z.object({
  email,
  // No length rules on sign-in: never hint at the rules to someone guessing.
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX),
});
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(1), password });

export type FieldErrors = Record<string, string>;

/** Flattens a Zod error to `{ field: firstMessage }`. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** "Ayesha Bibi Khan" → first "Ayesha", last "Bibi Khan". */
export function splitName(full: string): {
  firstName: string;
  lastName: string;
} {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(" ") };
}

export type AuthState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      fieldErrors?: FieldErrors;
      values?: { email?: string; name?: string };
    }
  | { status: "sent" };
