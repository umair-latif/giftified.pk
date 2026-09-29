import "server-only";
import { createMockEmail } from "./mock";
import { createResendSender } from "./resend";
import type { EmailSender } from "./types";

export type * from "./types";

let sender: EmailSender | undefined;

/**
 * Resend when `RESEND_API_KEY` (and `EMAIL_FROM`) are set, otherwise the mock
 * (dev and demo builds only — production without Resend fails loudly).
 */
export function getEmail(
  env: Record<string, string | undefined> = process.env,
): EmailSender {
  if (sender) return sender;
  if (env.RESEND_API_KEY) {
    if (!env.EMAIL_FROM)
      throw new Error("RESEND_API_KEY is set but EMAIL_FROM is missing");
    sender = createResendSender({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    });
  } else if (env.NODE_ENV === "production" && env.COMMERCE_MOCK !== "1") {
    throw new Error(
      "RESEND_API_KEY is not set in production. Configure Resend (see .env.example).",
    );
  } else {
    sender = createMockEmail(env.NODE_ENV !== "test");
  }
  return sender;
}
