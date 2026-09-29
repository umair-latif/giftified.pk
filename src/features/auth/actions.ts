"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/features/checkout/client-ip";
import { createRateLimiter } from "@/features/orders/rate-limit";
import { clientKeyFromHeaders } from "@/features/orders/track";
import { getCommerce } from "@/lib/commerce";
import { getEmail } from "@/lib/email";
import { endSession, startSession } from "@/server/auth/cookies";
import { authSecret } from "@/server/auth/secret";
import { safeNextPath } from "@/server/auth/safe-next";
import { appBaseUrl } from "@/server/files/links";
import type { AuthState } from "./schema";
import {
  requestPasswordReset,
  resetPassword,
  RESET_EMAIL_LIMIT,
  RESET_LIMIT,
  SIGN_IN_EMAIL_LIMIT,
  SIGN_IN_LIMIT,
  SIGN_UP_LIMIT,
  signIn,
  signUp,
  type AuthDeps,
  type AuthResult,
} from "./service";

/**
 * Server Actions for /sign-in, /sign-up and /reset-password. Public
 * endpoints: everything is validated in `service.ts`. Limiters are in memory
 * per server instance (see `features/orders/rate-limit.ts`).
 */
const limiters = {
  signIn: createRateLimiter(SIGN_IN_LIMIT),
  signInEmail: createRateLimiter(SIGN_IN_EMAIL_LIMIT),
  signUp: createRateLimiter(SIGN_UP_LIMIT),
  reset: createRateLimiter(RESET_LIMIT),
  resetEmail: createRateLimiter(RESET_EMAIL_LIMIT),
};

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

async function requestContext() {
  const h = await headers();
  return {
    clientKey: clientKeyFromHeaders(h),
    clientIp: clientIpFromHeaders(h),
  };
}

function failure(
  result: Extract<AuthResult, { ok: false }>,
  values: { email?: string; name?: string },
): AuthState {
  return {
    status: "error",
    ...(result.message ? { message: result.message } : {}),
    ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}),
    values,
  };
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData.get("email"));
  const deps: AuthDeps = {
    commerce: getCommerce(),
    ipLimiter: limiters.signIn,
    emailLimiter: limiters.signInEmail,
    ...(await requestContext()),
  };
  const result = await signIn(
    { email, password: str(formData.get("password")) },
    deps,
  );
  if (!result.ok) return failure(result, { email: email.slice(0, 254) });
  await startSession(result.customer.id);
  redirect(safeNextPath(str(formData.get("next"))));
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const deps: AuthDeps = {
    commerce: getCommerce(),
    ipLimiter: limiters.signUp,
    ...(await requestContext()),
  };
  const result = await signUp(
    { name, email, password: str(formData.get("password")) },
    deps,
  );
  if (!result.ok)
    return failure(result, {
      email: email.slice(0, 254),
      name: name.slice(0, 80),
    });
  await startSession(result.customer.id);
  redirect(safeNextPath(str(formData.get("next"))));
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData.get("email"));
  const result = await requestPasswordReset(
    { email },
    {
      commerce: getCommerce(),
      ipLimiter: limiters.reset,
      emailLimiter: limiters.resetEmail,
      // Resolved when sending, inside the service's try/catch: a missing
      // RESEND_API_KEY must be logged, not crash the request with a 500.
      email: { send: (message) => getEmail().send(message) },
      secret: authSecret(),
      baseUrl: appBaseUrl(),
      ...(await requestContext()),
    },
  );
  if (!result.ok)
    return {
      status: "error",
      fieldErrors: result.fieldErrors,
      values: { email: email.slice(0, 254) },
    };
  return { status: "sent" };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const result = await resetPassword(
    {
      token: str(formData.get("token")),
      password: str(formData.get("password")),
    },
    { commerce: getCommerce(), secret: authSecret() },
  );
  if (!result.ok) return failure(result, {});
  await startSession(result.customer.id);
  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
