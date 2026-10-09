import { randomBytes } from "node:crypto";
import type { RateLimiter } from "@/features/orders/rate-limit";
import type { CommerceClient, Customer } from "@/lib/commerce/types";
import type { EmailSender } from "@/lib/email/types";
import { signResetToken, verifyResetToken } from "@/server/auth/reset-token";
import type { GoogleProfile } from "@/server/auth/google";
import {
  fieldErrorsOf,
  forgotSchema,
  resetSchema,
  signInSchema,
  signUpSchema,
  splitName,
  type FieldErrors,
} from "./schema";

/**
 * Account logic with injected dependencies (no cookies, no Next): the Server
 * Actions in `actions.ts` wire real ones, tests wire mocks.
 */
export type AuthResult =
  | { ok: true; customer: Customer }
  | { ok: false; message?: string; fieldErrors?: FieldErrors };

export const TOO_MANY = "Too many attempts. Please wait a while and try again.";
export const BAD_LOGIN = "Wrong email or password.";
export const UNAVAILABLE =
  "We couldn’t reach the account service just now. Please try again in a few minutes.";
export const BAD_LINK =
  "This link has expired or was already used. Please ask for a new one.";

export const SIGN_IN_LIMIT = { limit: 10, windowMs: 15 * 60_000 };
export const SIGN_IN_EMAIL_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
export const SIGN_UP_LIMIT = { limit: 10, windowMs: 60 * 60_000 };
export const RESET_LIMIT = { limit: 5, windowMs: 60 * 60_000 };
export const RESET_EMAIL_LIMIT = { limit: 3, windowMs: 60 * 60_000 };

export interface AuthDeps {
  commerce: CommerceClient;
  /** Per client IP. */
  ipLimiter: RateLimiter;
  /** Per email address (sign-in and reset only). */
  emailLimiter?: RateLimiter;
  clientKey: string;
  /** Real client IP, passed on to WordPress' login limiter. */
  clientIp?: string;
}

export async function signUp(
  input: unknown,
  deps: AuthDeps,
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  if (deps.ipLimiter.isLimited(deps.clientKey))
    return { ok: false, message: TOO_MANY };
  deps.ipLimiter.hit(deps.clientKey);

  const { name, email, password } = parsed.data;
  let customer: Customer | null;
  try {
    customer = await deps.commerce.createCustomer({
      email,
      password,
      ...splitName(name),
    });
  } catch (err) {
    console.error("[auth] sign-up failed", err);
    return { ok: false, message: UNAVAILABLE };
  }
  if (!customer)
    return {
      ok: false,
      fieldErrors: {
        email: "There is already an account with this email. Sign in instead.",
      },
    };
  return { ok: true, customer };
}

export async function signIn(
  input: unknown,
  deps: AuthDeps,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { email, password } = parsed.data;
  if (
    deps.ipLimiter.isLimited(deps.clientKey) ||
    deps.emailLimiter?.isLimited(email)
  )
    return { ok: false, message: TOO_MANY };

  let customer: Customer | null;
  try {
    customer = await deps.commerce.verifyCustomerPassword(
      email,
      password,
      deps.clientIp,
    );
  } catch (err) {
    // WordPress unreachable, plugin missing or misconfigured: a setup problem,
    // never shown as "wrong password" and never a bare 500 page.
    console.error("[auth] sign-in check failed", err);
    return { ok: false, message: UNAVAILABLE };
  }
  // Only failures count, so shared mobile-carrier IPs aren't locked out by successes.
  if (!customer) {
    deps.ipLimiter.hit(deps.clientKey);
    deps.emailLimiter?.hit(email);
    return { ok: false, message: BAD_LOGIN };
  }
  return { ok: true, customer };
}

export interface ResetDeps extends AuthDeps {
  email: EmailSender;
  secret: string;
  /** Public origin for the link, e.g. https://designbanana.pk */
  baseUrl: string;
  now?: () => number;
}

export type RequestResetResult =
  { ok: true } | { ok: false; fieldErrors: FieldErrors };

/**
 * Emails a 1-hour reset link if the address has an account. The answer is
 * always the same "if there is an account…", so this can't be used to find out
 * who has one.
 */
export async function requestPasswordReset(
  input: unknown,
  deps: ResetDeps,
): Promise<RequestResetResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { email } = parsed.data;
  const limited =
    deps.ipLimiter.isLimited(deps.clientKey) ||
    deps.emailLimiter?.isLimited(email);
  deps.ipLimiter.hit(deps.clientKey);
  deps.emailLimiter?.hit(email);
  if (limited) return { ok: true };

  try {
    const customer = await deps.commerce.findCustomerByEmail(email);
    if (!customer) return { ok: true };
    const token = signResetToken(
      { customerId: customer.id, modifiedAt: customer.modifiedAt },
      deps.secret,
      (deps.now?.() ?? Date.now()) / 1000,
    );
    const link = `${deps.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await deps.email.send({
      to: customer.email,
      subject: "Reset your DesignBanana password",
      text: [
        `Hi${customer.firstName ? ` ${customer.firstName}` : ""},`,
        "",
        "Someone asked to reset the password for your DesignBanana.pk account.",
        "Open this link within 1 hour to choose a new one:",
        link,
        "",
        "If that wasn't you, ignore this email — your password stays the same.",
      ].join("\n"),
    });
  } catch (err) {
    // Never tell the customer (that would reveal whether the account exists).
    console.error("[auth] password reset email failed", err);
  }
  return { ok: true };
}

export async function resetPassword(
  input: unknown,
  deps: Pick<ResetDeps, "commerce" | "secret" | "now">,
): Promise<AuthResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    // A missing/blank token is a bad link, not a form error.
    if (fieldErrors.token) return { ok: false, message: BAD_LINK };
    return { ok: false, fieldErrors };
  }
  const claims = verifyResetToken(
    parsed.data.token,
    deps.secret,
    (deps.now?.() ?? Date.now()) / 1000,
  );
  if (!claims) return { ok: false, message: BAD_LINK };
  try {
    const customer = await deps.commerce.getCustomer(claims.customerId);
    // The record changed since the link was made (e.g. the password was reset already).
    if (!customer || customer.modifiedAt !== claims.modifiedAt)
      return { ok: false, message: BAD_LINK };
    await deps.commerce.setCustomerPassword(customer.id, parsed.data.password);
    const updated = (await deps.commerce.getCustomer(customer.id)) ?? customer;
    return { ok: true, customer: updated };
  } catch (err) {
    console.error("[auth] password reset failed", err);
    return { ok: false, message: UNAVAILABLE };
  }
}

/** Same email = same account: finds the customer, or creates one with a random password. */
export async function customerForGoogle(
  profile: GoogleProfile,
  commerce: CommerceClient,
): Promise<Customer> {
  const existing = await commerce.findCustomerByEmail(profile.email);
  if (existing) return existing;
  const created = await commerce.createCustomer({
    email: profile.email,
    password: randomBytes(24).toString("base64url"),
    ...splitName(profile.name),
  });
  if (created) return created;
  // Lost a race with a parallel sign-up.
  const again = await commerce.findCustomerByEmail(profile.email);
  if (!again)
    throw new Error("Could not create the customer for Google sign-in");
  return again;
}
