import type { EmailMessage, EmailSender } from "./types";

export interface ResendConfig {
  apiKey: string;
  /** e.g. `Giftified.pk <hello@giftified.pk>` (a domain verified in Resend). */
  from: string;
  fetch?: typeof fetch;
}

/** Resend's HTTP API — no SDK needed for one endpoint. */
export function createResendSender(config: ResendConfig): EmailSender {
  const doFetch = config.fetch ?? fetch;
  return {
    async send(message: EmailMessage) {
      const res = await doFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok)
        throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
    },
  };
}
